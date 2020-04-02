const jwt = require('jsonwebtoken');

const jwtKey = 'rajui';
const jwtExpirySeconds = 300;

const issueToken = email => {
    return jwt.sign({email}, jwtKey, {
        algorithm: 'HS256',
        expiresIn: jwtExpirySeconds
    })
}

module.exports = {
    issueToken
}