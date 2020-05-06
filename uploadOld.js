const jimp = require('jimp');
const shortid = require('shortid');
const appRoot = require('app-root-path');
const db = require('./queries');
const jwt = require('./jwt');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const getFileExt = fileName => fileName.split('.').pop();
const joinPath = fileName => path.join(appRoot.path, `/${fileName}`);
const joinResourcePath = fileName => joinPath(`/pictures/${fileName}`);



const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);

const uploadImage = async (req, res, next) => {
    if (!req.files) {
        res.status(400).send({ message: 'No files were uploaded.' });
        return;
    }

    user_id = jwt.getId(req);

    const { file } = req.files;
    console.log(file, 'aab');
        
    const { caption, hashtags } = req.body;
    
    const ext = getFileExt(file.name);
     const image = `${shortid.generate()}.${ext}`;
    const imagePath = joinResourcePath(image);
    
    file.name = image;

    const blob = bucket.file(file.name);
    const blobStream = blob.createWriteStream();


    blobStream.on('error', err => {
        console.error(err);
        res.send(err);
    })

    let publicUrl;

    blobStream.on('finish', () => {
        
        
        
    });
    publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
    blobStream.end(file.buffer);
    
    console.log('1', publicUrl);

    req.image = {
        publicUrl,
        user_id,
        caption,
        hashtags
    }

    next();
    // try {
    //     const readPic = await jimp.read(file.data);

    //     readPic.write(imagePath);

    // } catch (e) {
    //     return res.status(500).send(e);
    // }

}

module.exports = {
    uploadImage
}