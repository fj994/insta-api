const jwt = require('jsonwebtoken');

const jwtKey = 'rajui';
const jwtExpirySeconds = 900;

const issueToken = (email, id) => {
    return jwt.sign({ email, id }, jwtKey, {
        algorithm: 'HS256',
        expiresIn: jwtExpirySeconds
    })
}

let validateToken = (req, res, next) => {
    console.log(req.headers.authorization);
    next();
}

module.exports = {
    issueToken,
    validateToken
}