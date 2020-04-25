const Pool = require('pg').Pool;
const jwt = require('./jwt');
const moment = require('moment');
const async = require('async');

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

const validateRefreshToken = (req, res, next) => {
    user_id = jwt.getId(req);
    
    pool.query(`SELECT refreshtoken FROM users WHERE id = '${user_id}'`, (err, results) => {
        if (err) {
            res.send({ err: err });
        } else {

            if (results.rowCount < 1) {
                console.log('invalid ID');
                res.send({ err: 'invalid ID' });
            } else {                
                if (results.rows[0].refreshToken === req.body.refreshtoken) {                    
                    next();
                } else {
                    res.send({err: 'Invalid refresh token!'});
                }
            }
        }
    })
}

const insertImage = (imagePath, user_id, caption, hashtags) => {
    hashtags = hashtags.split(',');

    pool.query(`INSERT INTO posts (image_path, user_id, caption) VALUES ('${imagePath}', ${user_id}, '${caption}') RETURNING post_id`, (err, results) => {
        if (err) {
            console.log(err);
            return;
        } else {
            const post_id = results.rows[0].post_id;

            async.parallel([
                function (parallel_done) {
                    if (hashtags[0] !== 'null') {
                        hashtags.forEach(element => {
                            pool.query(`INSERT INTO hashtags (post_id, hashtag) values (${post_id}, '${element}')`, (err, results) => {
                                if (err) {
                                    console.log(err);
                                    return;
                                }
                                if (element === hashtags[hashtags.lenght - 1]) {
                                    parallel_done();
                                }
                            })
                        });
                    } else {
                        parallel_done();
                    }
                }
            ]);
        }
    });
}

const selectUserImages = (req, res, next) => {
    const id = req.url.split('/').pop();

    pool.query(`SELECT image_path FROM posts WHERE user_id = ${id}  ORDER BY post_timestamp DESC`, (err, result) => {
        res.send({ imagePaths: result.rows });
    });
}

const getProfile = (req, res, next) => {
    const id = req.url.split('/').pop();

    let profile = {
        id: null,
        name: null,
        profileImage: null,
        posts: [],
        followersCount: null,
        followingCount: null,
        followStatus: null
    }

    async.parallel([
        function (parallel_done) {
            pool.query(`SELECT id, email, profile_image_path FROM users WHERE id = ${id}`, (err, result) => {
                if (result.rows.length > 0) {
                    profile.id = result.rows[0].id;
                    profile.name = result.rows[0].email;
                    profile.profileImage = result.rows[0].profile_image_path;
                }
                parallel_done();
            });
        },
        function (parallel_done) {
            pool.query(`SELECT image_path FROM posts WHERE user_id = ${id}  ORDER BY post_timestamp DESC`, (err, result) => {
                profile.posts = result.rows.map(element => element.image_path);
                parallel_done();
            });
        },
        function (parallel_done) {
            pool.query(`SELECT count(*) FILTER (WHERE user_id = ${id}) AS followsCount, count(*) FILTER (WHERE follow_id = ${id}) AS followingCount FROM user_follows`, (err, result) => {
                profile.followersCount = result.rows[0].followscount;
                profile.followingCount = result.rows[0].followingcount;
                parallel_done();
            });
        },
        function (parallel_done) {
            pool.query(`SELECT EXISTS(SELECT 1 FROM user_follows WHERE user_id = ${jwt.getId(req)} and follow_id = ${id})`, (err, result) => {
                profile.followStatus = result.rows[0].exists;
                parallel_done();
            });
        }
    ], function (err) {
        if (err) console.log(err);
        console.log(profile);

        if (!profile.id) {
            res.sendStatus(404);
            return;
        }

        res.send(profile);
    })
}

const getNewsfeed = (req, res, next) => {
    const user_id = jwt.getId(req);

    pool.query(`SELECT distinct posts.post_id, posts.user_id, email, profile_image_path, image_path, caption, post_timestamp, 
                    ARRAY(select hashtag 
                            from hashtags 
                            WHERE posts.post_id = hashtags.post_id) as hashtags,
                    ARRAY(SELECT user_id 
                            FROM post_likes 
                            WHERE posts.post_id = post_likes.post_id) as likes
                    FROM posts
                    inner join users on (posts.user_id = users.id)
                    left join hashtags on(posts.post_id = hashtags.post_id)
                    left join post_likes on(posts.post_id = post_likes.post_id)
                    left join post_comments on(posts.post_id = post_comments.post_id)
                    WHERE posts.user_id IN (SELECT follow_id 
                                            FROM user_follows 
                                            WHERE user_id = ${user_id})
                    order by post_timestamp desc`, (err, result) => {
        if (err) {
            res.status(500).send({ error: 'errorr' });
        } else if (result.rows.length > 0) {
            let counter = 0;
            result.rows.forEach(function (row, index) {
                pool.query(`SELECT user_id, email, profile_image_path, comment, time_stamp 
                            from users
                            inner join post_comments on (users.id = post_comments.user_id)
                            where post_comments.post_id = ${row.post_id}
                            order by time_stamp asc`, (err, resu) => {
                    this[index].comments = resu.rows;
                    counter++;

                    if (this.length === counter) {
                        res.send(result.rows);
                    }
                });
            }, result.rows);
        } else {
            res.send([]);
        }
    })
}

const insertComment = (req, res) => {
    const user_id = jwt.getId(req);
    console.log(req.body);

    pool.query(`INSERT INTO post_comments (user_id, post_id, comment) values (${user_id}, ${req.body.post_id}, '${req.body.comment}')`, (err, result) => {
        if (err) {
            console.log(err);
            res.send({ err: err });
        } else {
            res.send({ err: null });
        }

    })
}

const insertLike = (req, res) => {
    const user_id = jwt.getId(req);
    if (req.body.value === true) {
        pool.query(`INSERT INTO post_likes (user_id, post_id) VALUES (${user_id}, ${req.body.post_id})`, (err, results) => {
            if (err) {
                console.log(err);
                res.status(500).send({ err: err });
            } else {
                res.send({ err: null });
            }
        })
    } else {
        pool.query(`DELETE FROM post_likes WHERE user_id = ${user_id} and post_id = ${req.body.post_id}`, (err, results) => {
            if (err) {
                console.log(err);
                res.status(500).send({ err: err });
            } else {
                res.send({ err: null });
            }
        })
    }
}

const changeFollowStatus = (req, res) => {
    const user_id = jwt.getId(req);
    const follow_id = req.body.id;

    if (req.body.status) {
        pool.query(`DELETE FROM user_follows WHERE user_id = ${user_id} and follow_id = ${follow_id}`, (err, results) => {
            if (err) {
                console.log(err);
                res.status(500).send({ err: err });
            } else {
                res.send({ err: null });
            }
        })
    } else {
        pool.query(`INSERT INTO user_follows (user_id, follow_id) VALUES (${user_id}, ${follow_id})`, (err, results) => {
            if (err) {
                console.log(err);
                res.status(500).send({ err: err });
            } else {
                res.send({ err: null });
            }
        })
    }
}

module.exports = {
    createUser,
    validateLogin,
    validateRefreshToken,
    insertImage,
    selectUserImages,
    getProfile,
    getNewsfeed,
    insertComment,
    insertLike,
    changeFollowStatus
}