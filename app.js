var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var Cors = require('cors');
const db = require('./queries');

app.use(Cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.send('Hello Čagl!');
});

app.post('/users', db.createUser);

app.post('/login', db.validateLogin);

app.listen(3000, function () {
    console.log('Listening on port 3000!');
});