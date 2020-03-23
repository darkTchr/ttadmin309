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
    res.header('Access-Control-Allow-Methods', 'OPTIONS,PUT,GET,POST,DELETE');//复杂请求 , 简单请求
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

            conn.query(sql,(err,result)=>{
                console.log(result)
                if(err){
                    res.json(err)
                }else{
                    if(result.length !== 0){
                        res.json({
                            message:'OK',
                            data:{
                                id:result[0].id,
                                name:result[0].name,
                                mobile:result[0].mobile,
                                photo:result[0].photo,
                                token:result[0].token
                            }
                        })
                    }else{
                        res.status(999).json({
                            message:'无此用户,请注册!!!!!!!'
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
app.get('/user/profile',(req,res)=>{
    //验证token
    let Bearer = req.headers.authorization;
    console.log(Bearer);
    if(Bearer){
        let token = Bearer.substring(7);
        pool.getConnection(function (err,conn) {
            let sql = `select * from users where token='${token}'`;
            conn.query(sql,(err,result)=>{
                if(err){
                    res.json(err)
                }else{
                    if(result.length !== 0){
                        console.log(result[0]);
                        //找到数据啦
                        res.json({
                            status:666,
                            message:'用户信息',
                            data:result[0]
                        })
                    }else{
                        res.status(403).json({
                            message:'查无此人，非法访问'
                        })
                    }
                }
            })
        })

    }else{
        res.status(403).json({
            message:'token未传,非法访问'
        })
    }


})

app.listen(3031, () => {
    console.log('http://localhost:3031')
})