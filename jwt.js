const jwt = require('jsonwebtoken');

const jwtKey = 'rajui';
const refreshKey = 'rajuiRefresh';

const issueToken = (email, id) => {
    return jwt.sign({ email, id }, jwtKey, {
        algorithm: 'HS256',
        expiresIn: '30s'
    })
}

const issueRefreshToken = (email, id) => {
    return jwt.sign({ email, id }, refreshKey, {
        algorithm:"HS256",
        expiresIn: '180d'
    })
}

let validateToken = (req, res, next) => {
    if(!req.headers.authorization) {
        res.send({error: 'No token!'});
        return;
    }
    jwt.verify(req.headers.authorization.replace('Bearer ', ''), jwtKey, (err, verifySucces) => {
        if (err) {
            res.send({ error: err.message });
        } else {
            next();
        }
    });
}

module.exports = {
    issueToken,
    issueRefreshToken,
    validateToken
}