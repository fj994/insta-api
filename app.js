var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var Cors = require('cors');
const db = require('./queries');
const jwt = require('./jwt');

app.use(Cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', jwt.validateToken, function (req, res) {
    
    res.status(200).send({ mess: 'Hello Čagl!' });
 });

app.post('/users', db.createUser);

app.post('/login', db.validateLogin);

app.listen(3000, function () {
    console.log('Listening on port 3000!');
});