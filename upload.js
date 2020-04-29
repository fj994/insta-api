const jimp = require('jimp');
const shortid = require('shortid');
const appRoot = require('app-root-path');
const db = require('./queries');
const jwt = require('./jwt');
const path = require('path');

const getFileExt = fileName => fileName.split('.').pop();
const joinPath = fileName => path.join(appRoot.path, `/${fileName}`);
const joinResourcePath = fileName => joinPath(`/pictures/${fileName}`);

const uploadImage = async (req, res, next) => {
    if (!req.files) {
        return res.status(400).send({ message: 'No files were uploaded.' });
    }

    user_id = jwt.getId(req);

    const { file } = req.files;
    const { caption, hashtags } = req.body;

    const ext = getFileExt(file.name);
    const image = `${shortid.generate()}.${ext}`;
    const imagePath = joinResourcePath(image);

    try {
        const readPic = await jimp.read(file.data);

        readPic.write(imagePath);

    } catch (e) {
        return res.status(500).send(e);
    }

    req.image = {
        image,
        user_id,
        caption,
        hashtags
    }

    next();
}

module.exports = {
    uploadImage
}