// const express = require('express');
// const path = require("path");
// const app = express();
// const fs = require('fs')
import express from 'express'
import  path from 'path'
import fs from 'fs'
import http from 'http'
// const { express } = exp
// console.log(dirname('./'))
const __dirname = path.resolve();
// console.log(__dirname)
const app = express()
const server = http.createServer(app);


app.use('/', express.static(path.join(__dirname + '/src')));
//设置允许跨域访问该服务.
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Content-Type', 'text/html;charset=utf-8');
  res.header('Cache-Control','max-age=1000, no-store')
  next();
});

// 返回web app
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// http
server.listen(3000, () => {
    console.log('http server is listening on *:3000');
});