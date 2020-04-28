const jwt = require('jsonwebtoken');

const jwtKey = 'rajui';
const refreshKey = 'rajuiRefresh';

const issueToken = (username, id) => {
    return jwt.sign({ username, id }, jwtKey, {
        algorithm: 'HS256',
        expiresIn: '30s'
    })
}

const issueRefreshToken = (username, id) => {
    return jwt.sign({ username, id }, refreshKey, {
        algorithm: "HS256",
        expiresIn: '30d'
    })
}

let validateToken = (req, res, next) => {
    if (!req.headers.authorization) {
        res.send({ login: false, error: 'No token!' });
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

const refreshAuthToken = (req, res) => {
    if (!req.body.token || !req.body.refreshToken) {
        res.send({ login: false, error: 'No token!' });
        return;
    }


    jwt.verify(req.body.refreshToken, refreshKey, (err) => {
        if (err) {
            res.send({login: false, token: null, err: err.message });
        } else {
            jwt.verify(req.body.token, jwtKey, (err) => {
                if (err.message === 'jwt expired') {
                    const payload = jwt.decode(req.body.token);
                    const refreshedToken = issueToken(payload.username, payload.id);

                    res.send({ login: true, token: refreshedToken, err: null });
                }
            })
        }
    })
}

const getId = req => {
    return jwt.decode(req.headers.authorization.replace('Bearer ', '')).id;
}

module.exports = {
    issueToken,
    issueRefreshToken,
    refreshAuthToken,
    validateToken,
    getId
}