const mysql = require('mysql');
const mysqlConfig = require('../config/mysql.config.js');

function OptPool() {
    this.flag = true;//是否连接过
    this.pool = mysql.createPool(mysqlConfig)

    this.getPool = function () {
        if(this.flag){
            this.pool.on('connection',function (connection) {
                connection.query('SET SESSION auto_increment_increment=1');
                this.flag = false;
            })
        }
        return this.pool;
    }
}

module.exports = OptPool