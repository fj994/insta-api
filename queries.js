const Pool = require('pg').Pool;
const jwt = require('./jwt');
const moment = require('moment');

const pool = new Pool({
    user: 'filip',
    host: 'localhost',
    database: 'microgram',
    password: 'filip121',
    port: 5432,
});

const createUser = (req, res) => {
    const { email, password } = req.body;

    if (email && password) {
        pool.query('INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *', [email.toLowerCase(), password], (err, results) => {
            if (err) {
                if (err.constraint === 'users_email_key') {
                    res.status(400).send({ message: 'Account with email already exists!', error: 'Email not unique!' });
                    console.log(err.detail);
                }
            } else {
                res.status(201).send({ message: `User added with ID: ${results.rows[0].id}`, error: null });
            }
        });
    } else {
        res.status(400).send({ message: 'Please enter username and password!', error: 'username or password empty!' });
    }
}

const validateLogin = (req, res) => {
    const { email, password } = req.body;

    if (email && password) {
        pool.query(`SELECT * FROM users WHERE email='${email}'`, (err, results) => {
            if (results.rowCount < 1) {
                res.status(400).send({ login: false, message: 'Invalid username!' });
            } else if (results.rows[0].password !== password) {
                res.status(400).send({ login: false, message: 'Invalid password!' });
            } else {
                const refreshToken = jwt.issueRefreshToken(email, results.rows[0].id);
                const id = results.rows[0].id;

                issueRefreshToken(refreshToken, id);

                res.status(200).send({
                    login: true,
                    token: jwt.issueToken(email, id),
                    refreshToken: refreshToken
                });
            };
        })
    } else {
        res.status(400).send({ login: false, message: 'Please enter username and password!' });
    }
}

const issueRefreshToken = (token, id) => {
    if (token && id) {
        pool.query(`UPDATE users SET refreshtoken = '${token}' WHERE id = '${id}'`, (err, results) => {
            if (err) {
                console.log('refresh token erorr!');
                res.sendStatus('400');
            } else {
                console.log(results);
            }
        });
    }
}

const validateRefreshToken = (token, id) => {
    pool.query(`SELECT * FROM users WHERE id = '${id}'`, (err, results) => {
        if (err) {
            return false;
        } else {
            if (results.rowCount < 1) {
                console.log('invalid ID');
                return false
            } else {
                if (results.rows[0].refreshToken === token) {
                    return true;
                }
            }
        }
        return false;
    })
}

const insertImage = (imagePath, user_id) => {
    pool.query(`INSERT INTO posts (image_path, user_id) VALUES ('${imagePath}', ${user_id}) ORDER BY post_timestamp DESC`, (err, results) => {
        if(err) {
            console.log(err);
            return;
        }
        console.log(results);
    });
}

const selectUserImages = (req, res, next) => {    
    const id = req.url.split('/').pop();
    
    pool.query(`SELECT image_path FROM posts WHERE user_id = ${id}`, (req, result) => {
        res.send({resu: result.rows});
    });
}

module.exports = {
    createUser,
    validateLogin,
    validateRefreshToken,
    insertImage,
    selectUserImages
}