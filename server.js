const express = require('express');
const bodyParser = require('body-parser');
const path = require('path')
const multer = require('multer');
const app = express();
app.use('/uploads',express.static(path.join(__dirname,'uploads')))
//mysql 线程池
let OptPool = require('./model/OptPool');
let optPool = new OptPool();
let pool = optPool.getPool();

// 后端接口 一切从简 利用业余时间逐渐完善 模块化

//上传设置
let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})

let upload = multer({storage: storage})

//暴露公共访问资源
//post body-parser

app.use(bodyParser.json()) //JSON类型
app.use(bodyParser.urlencoded({extended: false}));
//解决跨域
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');//允许所有源
    res.header('Access-Control-Allow-Methods', 'OPTIONS,PATCH,PUT,GET,POST,DELETE');//复杂请求 , 简单请求
    res.header('Access-Control-Allow-Headers', 'Content-type,authorization');//添加请求头
    res.header('Access-Control-Allow-Credentials', true); // 是否可以将请求的响应暴露给页面
    next();
})

//登陆
app.post('/authorizations', (req, res) => {
    let {mobile, code} = req.body;

    if (code === '123456') {
        //登陆
        // console.log(mobile,code)
        // mysql
        pool.getConnection(function (err, conn) {
            let sql = `select * from users where mobile = ${mobile}`

            conn.query(sql, (err, result) => {
                console.log(result)
                if (err) {
                    res.json(err)
                } else {
                    if (result.length !== 0) {
                        res.json({
                            message: 'OK',
                            data: {
                                id: result[0].id,
                                name: result[0].name,
                                mobile: result[0].mobile,
                                photo: result[0].photo,
                                token: result[0].token
                            }
                        })
                    } else {
                        res.status(999).json({
                            message: '无此用户,请注册!!!!!!!'
                        })
                    }
                }
                conn.release();
            })
        })
    } else {
        res.status(999).json({
            message: '验证码错误'
        })
    }

})

//注册
// 随机字符串 模拟token

//获取个人信息
app.get('/user/profile', (req, res) => {
    //验证token
    let Bearer = req.headers.authorization;
    console.log(Bearer);
    if (Bearer) {
        let token = Bearer.substring(7);
        pool.getConnection(function (err, conn) {
            let sql = `select * from users where token='${token}'`;
            conn.query(sql, (err, result) => {
                if (err) {
                    res.json(err)
                } else {
                    if (result.length !== 0) {
                        console.log(result[0]);
                        //找到数据啦
                        res.json({
                            status: 666,
                            message: '用户信息',
                            data: result[0]
                        })
                    } else {
                        res.status(403).json({
                            message: '查无此人，非法访问'
                        })
                    }
                }
            })
        })

    } else {
        res.status(403).json({
            message: 'token未传,非法访问'
        })
    }


})

//评论列表

app.get('/comments', (req, res) => {
    let query = req.query
    let page = query.page // 当前页
    let per_page = query.per_page  //每页多少条
    let response_type = query.response_type   // 类型

    // 获取数据的起点 计算
    let start = (page - 1) * per_page  // limit

    if (response_type === 'comment' && per_page === '4') {
        pool.getConnection(function (err, conn) {
            let sql = `select count(*) from comment;select * from comment limit ${start},${per_page}`;
            conn.query(sql, (err, result) => {
                if (err) {
                    res.json(err)
                } else {
                    // result  log
                    let total_count = result[0][0]['count(*)']
                    res.json({
                        message: 'OK',
                        data: {
                            'total_count': total_count,
                            'page': page,
                            'per_page': per_page,
                            'results': result[1]
                        }
                    })
                }
                conn.release();
            })
        })
    } else {
        res.status(400).json({
                message: '请求参数错'
            }
        )
    }
})

//更改评论状态

app.put('/comments/status', (req, res) => {
    console.log(666);
    //接收你传过来的 唯一标识
    let query = req.query;
    let article_id = query.article_id;
    let comment_status = req.body.allow_comment

    console.log(article_id, '-----', comment_status);

    pool.getConnection(function (err, conn) {
        let sql = `update comment set comment_status=${comment_status} where id = ${article_id}`;
        conn.query(sql, (err, result) => {
            if (err) {
                res.json(err);
            } else {
                res.json({
                    message: 'OK'
                })
            }
            conn.release()
        })
    })
})


// 素材管理  图片上传
app.post('/user/images', upload.single('image'), (req, res) => {
    //接收数据
    //写入数据库(路径,位置)  [上传]到服务器端储存
    //console.log(req.file.path)
    pool.getConnection(function (err, conn) {
        let sql = `insert into material(url) values ('http://localhost:3031/${req.file.path}')`
        conn.query(sql, (err, result) => {
            //result  我们需要得到  当条数据 id=2  url=xxxxxxxx
            if (err) {
                res.json(err)
            } else {
                // console.log(result)
                res.json({
                    message: 'OK'
                })
            }
            conn.release();
        })
    })
})


//获取素材

app.get('/user/images', (req, res) => {
    //接收数据
    let query = req.query;
    let page = query.page;
    let per_page = query.per_page;
    //eval(执行js语句 'alert(666)')
    //eval(query.collect.toLowerCase())  为了得到 boolean类型的 true或false
    let collect = eval(query.collect.toLowerCase()) ? 1 : 0
    let start = (page - 1) * per_page
    if (per_page === '2') {
        pool.getConnection(function (err, conn) {
            let sql = '';
            if (collect) {
                //查看收藏
                sql = `select count(*) from material where is_collected=${collect};select * from material where is_collected=${collect} order by id desc limit ${start},${per_page}`
            } else {
                // 查看全部
                sql = `select count(*) from material ;select * from material order by id desc limit ${start},${per_page}`
            }

            conn.query(sql, (err, result) => {
                if (err) {
                    res.json(err)
                } else {
                    //result  log
                    let total_count = result[0][0]['count(*)']
                    res.json({
                        message: 'OK',
                        data: {
                            'total_count': total_count,
                            'page': page,
                            'per_page': per_page,
                            'results': result[1]
                        }
                    })
                }
                conn.release()
            })

        })

    } else {
        res.status(400).json({
            message: '请求参数错误'
        })
    }
})


// 删除素材
app.delete('/user/images/:target',(req,res)=>{
    // console.log(req.params.target)
    let target = req.params.target;
    pool.getConnection(function (err,conn) {
        let sql = `delete from material where id=${target}`
        conn.query(sql,(err,result)=>{
            if(err){
                res.json(err)
            }else{
                res.json({
                    message:'OK'
                })
            }
            conn.release();
        })
    })
})

//修改收藏素材状态

app.put('/user/images/:target',(req,res)=>{
    let target = req.params.target
    let collect = req.body.collect ? 1 : 0; // 即将使用的真实值
    pool.getConnection(function (err,conn) {
        let sql = `update material set is_collected=${collect} where id=${target}`
        conn.query(sql,(err,result)=>{
            if(err){
                res.json(err)
            }else {
                res.json({
                    message: 'OK'
                })
            }

            conn.release();

        })
    })
})

//个人信息修改

// post 方法不是幂等的 , 创建子资源 , 导致多条相同的用户被创建 (id自动增长的唯一标识,并且没有做别的相同数据处理)
// put 已经存在的做替换 , 如果没有就创建 , 一般都用来 局部更新
// patch 新引入的  对put的补充  ,对已知资源的局部更新
app.patch('/user/profile',(req,res)=>{
    let {id , name ,mobile,intro , email } = req.body
    pool.getConnection(function (err,conn) {
        let sql = `update users set name='${name}', mobile='${mobile}', email='${email}', intro='${intro}' where id=${id}`
        conn.query(sql,(err,result)=>{
            if(err){
                res.json(err)
            }else{
                res.json({
                    message:'OK'
                })
            }
            conn.release();
        })
    })
})


//上传头像
app.patch('/user/photo',upload.single('photo'),(req,res)=>{
    // 存储路径
    pool.getConnection(function (err,conn) {
        let sql = `update users set photo='http://localhost:3031/${req.file.path}' where id = 1`
        conn.query(sql,(err)=>{
            if(err){
                res.json(err)
            }else{
                res.json({
                    message:'OK'
                })
            }
            conn.release()
        })
    })
})

app.listen(3031, () => {
    console.log('http://localhost:3031')
})










