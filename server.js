var CBaseClient = require('coinbase').Client;
const express = require("express");
const app = express();
const mysql = require('mysql');
const { calcAddressFromKey } = require('./utils');
require('dotenv').config();

const host = process.env.DB_HOST;
const user = process.env.DB_USER;
const pass = process.env.DB_PASS;
const db = process.env.DB;
const tableName1 = process.env.TABLE_NAME_1;

const apikey = process.env.API_KEY;
const secret = process.env.API_SECRET;


let AllUsers = [],
    connected = false,
    coinbaseUser = null,
    GiftAmount = '0.0001',
    Currency = 'BTC',
    idempo = {
        val: 0,
        next: function() {
            return ++this.val;
        }
    };

const connection = mysql.createConnection({
  host: host,
  port: 3306,
  user: user,
  password: pass,
  database: db
});


const cbaseClient = new CBaseClient({
    'apiKey': apikey,
    'apiSecret': secret,
    'strictSSL': false
});

async function connectToMysqlServer() {
    return await connection.connect();
}

function getAllUsers() {
    connection.query(`SELECT * FROM ${tableName1} WHERE private IS NOT NULL`, (err, rows) => {
        if(err) throw err;
        console.log('Data receive success.');
        AllUsers = rows;
        console.log('got users: ' + AllUsers.length);
        connection.end();
    })
}

function deletePrivateKeyOf(usr) {
    connection.query(`UPDATE ${tableName1} SET private = NULL WHERE sr = ${usr}`, (err, rows) => {
        if(err) throw err;
        console.log('User deleted successfully.');
        AllUsers = AllUsers.filter(u => u.sr !== usr);
        connection.end();
    })
}

function getCoinbaseUser() {
    cbaseClient.getCurrentUser((err, usr) => {
        if(err) {
            console.log('Error getting the coinbase user!!');
            return;
        }
        console.log(usr);
        coinbaseUser = usr;
    });
}

function sendGiftTo(to) {
    return new Promise((resolve, reject) => {
        let usr = AllUsers.find(user => user.sr === to);
        if(!usr) {
            console.log('User not found!');
            reject();
            return;
        }
        let address = calcAddressFromKey(usr);
        cbaseClient.getAccount(coinbaseUser, (err, acc) => {
            if(err) {
                console.log('error getting account:', err);
                reject();
                return;
            }
            console.log('Sending transaction to ' + address);
            
            acc.sendMoney({
                'to': address,
                'amount': GiftAmount,
                'currency': Currency,
                'idem': idempo.next(),
            }, (err, tx) => {
                console.log(tx);
                if(!err) resolve("success");
                else reject();
                
            });
        });

    })
}

connectToMysqlServer()
.then(_ => {
    connected = true;
    getAllUsers();
})
.catch(_ => connected = false);

app.get('/getCoinbaseUser', (rq, rs) => {
    if(!coinbaseUser) {
        getCoinbaseUser()
        rs.end('user retreived successfully: ' + coinbaseUser);
    } else rs.end('Already Retreived!.')

})

app.post('/sendGift', (rq, rs) => {
    let to = rq.body.dest_address;
    if(!coinbaseUser) {
        console.log('no coinbase user');
        rs.end('No coinbase user selected!')
        return;
    }
    if(to)
        sendGiftTo(to)
        .then(r => {
            console.log(r + ' in sending gift to ' + to);
            connectToMysqlServer().then(_ => deletePrivateKeyOf(to));
            rs.end('Success sending the gift');
        })
        .catch(_ => {
            console.log('Error sending gift to ' + to);
            rs.end('Success sending the gift');
        })
    else
        rs.end('not enough parameters provided!!');
})

app.listen(3000, () => {
    console.log('Server is running at port 3000');
});