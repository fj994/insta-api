const shortid = require('shortid');
const { Storage } = require('@google-cloud/storage');
const jwt = require('./jwt');

const storage = new Storage();

const getFileExt = fileName => fileName.split('.').pop();

const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);


const uploadImage = (req, res, next) => {
    if (!req.file) {
        res.status(400).send('No file uploaded.');
        return;
    }

    const { caption, hashtags } = req.body;
    user_id = jwt.getId(req);
    req.file.originalname = shortid.generate() + '.' + getFileExt(req.file.originalname);

    const blob = bucket.file(req.file.originalname);
    blob.setMetadata()
    const blobStream = blob.createWriteStream();

    blobStream.on('error', (err) => {
        res.send(err);
        return;
    })

    blobStream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

        req.image = {
            publicUrl,
            user_id,
            caption,
            hashtags
        }

        next();
    })

    blobStream.end(req.file.buffer);
}

module.exports = {
    uploadImage
}