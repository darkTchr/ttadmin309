const express = require('express');
const bodyParser = require('body-parser');
const app = express();
//mysql 线程池
let OptPool = require('./model/OptPool');
let optPool = new OptPool();
let pool = optPool.getPool();

//暴露公共访问资源
//post body-parser

app.use(bodyParser.json()) //JSON类型
app.use(bodyParser.urlencoded({extended: false}));

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
                if(err){
                    res.json(err)
                }else{
                    // result  log
                    let total_count = result[0][0]['count(*)']
                    res.json({
                        message:'OK',
                        data:{
                            'total_count':total_count,
                            'page':page,
                            'per_page':per_page,
                            'results':result[1]
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

// app.get('/comments/status',()=>{
//     console.log(8888);
// })

app.put('/comments/status',(req,res)=>{
    console.log(666);
    //接收你传过来的 唯一标识
    let query = req.query;
    let article_id = query.article_id;
    let comment_status = req.body.allow_comment

    console.log(article_id,'-----',comment_status);

    pool.getConnection(function (err,conn) {
        let sql = `update comment set comment_status=${comment_status} where id = ${article_id}`;
        conn.query(sql,(err,result)=>{
            if(err){
                res.json(err);
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










