const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Cors = require('cors');
const db = require('./queries');
const jwt = require('./jwt');
const upload = require('./upload');
const Multer = require('multer');

const path = require('path');

app.use(Cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/static', express.static(path.join(__dirname, 'pictures')));

var multer = Multer({
    storage: Multer.memoryStorage()
})


app.get('/profile/:id', jwt.validateToken, db.getProfile);

app.get('/profile-images', jwt.validateToken, db.getMoreProfileImages)

app.get('/posts', jwt.validateToken, db.getPosts);

app.get('/hashtag', jwt.validateToken, db.getPosts);

app.get('/search-users', jwt.validateToken, db.getUsersSearch);

app.get('/search-hashtags', jwt.validateToken, db.getHashtagSearch);

app.post('/users', db.createUser);

app.post('/login', db.validateLogin);

app.post('/refresh', db.validateRefreshToken, jwt.refreshAuthToken);

app.post('/post/upload', jwt.validateToken, multer.single('image'), upload.uploadImage, db.insertPostImage);

app.post('/comment', jwt.validateToken, db.insertComment);

app.post('/like', jwt.validateToken, db.insertLike);

app.post('/follow', jwt.validateToken, db.changeFollowStatus)

app.post('/uploadprofile', jwt.validateToken, multer.single('image'), upload.uploadImage, db.insertProfileImage)

app.patch('/password', jwt.validateToken, db.updatePassword)

app.patch('/username', jwt.validateToken, db.updateUsername)

const PORT = process.env.PORT || 3000;

app.listen(PORT, function () {
    console.log('Listening on port 3000!');
});