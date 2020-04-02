const Pool = require('pg').Pool;
const jwt = require('./jwt');

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
                res.status(200).send({ login: true, message: null, token: jwt.issueToken(email, results.rows[0].id)});
            };
        })
    } else {
        res.status(400).send({ login: false, message: 'Please enter username and password!' });
    }
}

module.exports = {
    createUser,
    validateLogin
}