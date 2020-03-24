var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.get('/', function (req, res) {
    res.send('Hello Čagl!');
});

app.post('/', function (req, res) {
    console.log(req.body);
    res.send('success!');
});

app.listen(3000, function () {
    console.log('Listening on port 3000!');
});