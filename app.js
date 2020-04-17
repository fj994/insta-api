var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var Cors = require('cors');
var db = require('./queries');
var jwt = require('./jwt');
var jimp = require('jimp');
var shortid = require('shortid');
var path = require('path');
var fileUpload = require('express-fileupload');
var appRoot = require('app-root-path');
const url = require('url');

app.use(Cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/static', express.static(path.join(__dirname, 'pictures')));
app.use(fileUpload());

const getFileExt = fileName => fileName.split('.').pop();
const joinPath = fileName => path.join(appRoot.path, `/${fileName}`);
const joinResourcePath = fileName => joinPath(`/pictures/${fileName}`);

// app.get('/', jwt.validateToken, function (req, res) {
    
//     res.status(200).send({ mess: 'Hello Čagl!' });
//  });

app.get('/profile/:id', jwt.validateToken, db.getProfile);

app.get('/newsfeed', jwt.validateToken, db.getNewsfeed)

app.post('/users', db.createUser);

app.post('/login', db.validateLogin);

app.post('/refresh', jwt.refreshAuthToken);

app.post('/post/upload/:id', jwt.validateToken, async (req, res) => {    
    if(!req.files) {
        return res.status(400).send({message:'No files were uploaded.'});
    }
    
    user_id = req.url.split('/')[3];

    const { file } = req.files;
    const ext = getFileExt(file.name);
    const image = `${shortid.generate()}.${ext}`;
    const imagePath = joinResourcePath(image);
    const resp = {
        image
    };

    try {
        const readPic = await jimp.read(file.data);

        readPic.write(imagePath);
        db.insertImage(image, user_id);
    } catch (e) {
        return res.status(500).send(e);
    }

    console.log(resp);
    
    return res.send(resp);
})

app.listen(3000, function () {
    console.log('Listening on port 3000!');
});