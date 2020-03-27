const Pool = require('pg').Pool;
const pool = new Pool({
    user: 'filip',
    host: 'localhost',
    database: 'microgram',
    password: 'filip123',
    port: 5432,
});

const createUser = (req, res) => {
    const { email, password } = req.body;

    pool.query('INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *', [email, password], (err, results) => {
        if (err) {
            if (err.constraint === 'users_email_key') {
                res.status(400).send('Account with email already exists!');
                console.log(err.detail);
            }
        } else {
            res.status(201).send(`User added with ID: ${results.rows[0].id}`);
        }
    })
}

const validateLogin = (req, res) => {
    const { email, password } = req.body;

    pool.query(`SELECT * FROM users WHERE email='${email}' AND password='${password}'`, (err, results) => {
        results.rowCount > 0 ? res.status(200).send({ login: true }) : res.status(200).send({ login: false });
    })
}

module.exports = {
    createUser,
    validateLogin
}