const Pool = require('pg').Pool;
const jwt = require('./jwt');
const async = require('async');

const pool = new Pool({
    user: 'postgres',
    host: '/cloudsql/microgram-283416:europe-west6:microgram-db',
    password: 'filip121'
});

const createUser = (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        pool.query(`INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *`, [username.toLowerCase(), password], (err, results) => {
            if (err) {
                console.log(err);
                if (err.constraint === 'users_email_key') {
                    res.status(400).send({ message: 'Account with username already exists!', error: 'username not unique!' });
                    console.log(err.detail);
                } else {
                    res.send(err);
                }
            } else {
                const id = results.rows[0].id;
                pool.query(`INSERT INTO user_follows (user_id, follow_id) VALUES (${id}, ${id})`, (err, results) => {
                    if (err) console.log(err);
                    res.status(201).send({ message: `Account created!`, error: null });
                })
            }
        });
    } else {
        res.status(400).send({ message: 'Please enter username and password!', error: 'username or password empty!' });
    }
}

const validateLogin = (req, res) => {
    const { username, password } = req.body;

    if (username && password) {
        pool.query(`SELECT id, username, password FROM users WHERE username='${username.toLowerCase()}'`, (err, results) => {
            if (results.rowCount < 1) {
                res.status(400).send({ login: false, message: 'Invalid username!' });
            } else if (results.rows[0].password !== password) {
                res.status(400).send({ login: false, message: 'Invalid password!' });
            } else {
                const id = results.rows[0].id;
                const refreshToken = jwt.issueRefreshToken(results.rows[0].username, id);

                insertRefreshToken(refreshToken, id);

                res.status(200).send({
                    login: true,
                    token: jwt.issueToken(username, id),
                    refreshToken: refreshToken
                });
            };
        })
    } else {
        res.status(400).send({ login: false, message: 'Please enter username and password!' });
    }
}

const insertRefreshToken = (token, id) => {
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
            res.send({ login: false, err: err });
        } else {

            if (results.rowCount < 1) {
                console.log('invalid ID');
                res.send({ login: false, err: 'invalid ID' });
            } else {
                if (results.rows[0].refreshtoken != null && results.rows[0].refreshtoken === req.body.refreshToken) {
                    next();
                } else {
                    res.send({ login: false, err: 'Invalid refresh token!' });
                }
            }
        }
    })
}

const insertPostImage = (req, res) => {
    let { publicUrl, user_id, caption, hashtags } = req.image;
    const { location } = req.body;
    hashtags = hashtags.split(',');

    pool.query(`INSERT INTO posts (image_path, user_id, caption, location) VALUES ('${publicUrl}', ${user_id}, '${caption}', '${location}') RETURNING post_id`, (err, results) => {
        if (err) {
            console.log(err);
            return;
        } else {
            const post_id = results.rows[0].post_id;
            let profile_image_path;

            async.parallel([
                function (parallel_done) {
                    if (hashtags[0] !== 'null') {
                        hashtags = [...new Set(hashtags)];
                        let counter = 0;

                        hashtags.forEach(element => {
                            pool.query(`INSERT INTO hashtags (post_id, hashtag) values (${post_id}, '${element}')`, (err, results) => {
                                if (err) {
                                    console.log(err);
                                    res.send({ err });
                                }

                                counter++;

                                if (counter === hashtags.length) {
                                    parallel_done();
                                }
                            })
                        });
                    } else {
                        parallel_done();
                    }
                }, function (parallel_done) {
                    pool.query(`SELECT profile_image_path FROM users WHERE id = ${user_id}`, (err, results) => {
                        if (err) console.log(err);
                        profile_image_path = results.rows[0].profile_image_path;
                        parallel_done();
                    })
                }
            ], function (err) {
                if (err) {
                    res.send({ err })
                    console.log(err);
                };
                console.log(publicUrl);
                res.send({ image: publicUrl, post_id: post_id, profile_image_path: profile_image_path });
            });
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
            pool.query(`SELECT id, username, profile_image_path FROM users WHERE id = ${id}`, (err, result) => {
                if (result.rows.length > 0) {
                    profile.id = result.rows[0].id;
                    profile.name = result.rows[0].username;
                    profile.profileImage = result.rows[0].profile_image_path;
                }
                parallel_done();
            });
        },
        function (parallel_done) {
            pool.query(`SELECT post_id, image_path FROM posts WHERE user_id = ${id}  ORDER BY post_timestamp DESC LIMIT 9`, (err, result) => {
                if (result.rows.length) {
                    next = result.rows[result.rows.length - 1].post_id;
                }
                profile.posts = result.rows.map(element => element.image_path);
                parallel_done();
            });
        },
        function (parallel_done) {
            pool.query(`SELECT count(*) FILTER (WHERE user_id = ${id}) AS followsCount, count(*) FILTER (WHERE follow_id = ${id}) AS followingCount FROM user_follows`, (err, result) => {
                profile.followersCount = result.rows[0].followingcount-1;
                profile.followingCount = result.rows[0].followscount-1;
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

        if (!profile.id) {
            res.sendStatus(404);
            return;
        }

        res.send({ profile, next });
    })
}

const getMoreProfileImages = (req, res) => {
    let { next, profile_id } = req.query;

    pool.query(`SELECT post_id, image_path 
                FROM posts 
                WHERE user_id = ${profile_id} AND post_id < ${next} 
                ORDER BY post_timestamp DESC LIMIT 9`, (err, result) => {
        if (err) console.log(err);
        if (result.rows.length) {
            next = result.rows[result.rows.length - 1].post_id;
        }
        posts = result.rows.map(element => element.image_path);
        res.send({ posts, next: next });
    });
}

const getPosts = (req, res, next) => {
    const user_id = jwt.getId(req);

    let hashtag = req.query.hashtag === 'null' ? null : req.query.hashtag;
    const next_id = req.query.next === 'null' ? null : req.query.next;

    const page = `AND posts.post_id < ${next_id}`;

    const newsFeedQuery = `WHERE posts.user_id IN ((SELECT follow_id 
                                                        FROM user_follows 
                                                        WHERE user_id = ${user_id})) 
                                                        ${next_id ? page : ''}
                                order by post_timestamp desc`;

    const hashtagQuery = `WHERE posts.post_id IN ((SELECT post_id
                                                        FROM hashtags 
                                                        WHERE hashtag = '${hashtag}'))
                                ${next_id ? page : ''}
                                order by post_timestamp desc`;

    const query = hashtag ? hashtagQuery : newsFeedQuery;

    pool.query(`SELECT distinct posts.post_id, posts.user_id, username, profile_image_path, image_path, caption, location, post_timestamp, 
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
                    ${query}
                    LIMIT 5`, (err, result) => {
        if (err) {
            res.status(400).send({ error: err });
        } else if (result.rows.length > 0) {
            let counter = 0;
            result.rows.forEach(function (row, index) {
                pool.query(`SELECT user_id, username, profile_image_path, comment, time_stamp 
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

const getHashtagPosts = (req, res) => {
    pool.query()
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

const insertProfileImage = (req, res) => {
    const { publicUrl, user_id } = req.image;

    pool.query(`UPDATE users
                SET profile_image_path = '${publicUrl}'
                WHERE id = ${user_id}`, (err, results) => {
        if (err) console.log(err);
        res.send({ image: publicUrl });
    });
}

const getUsersSearch = (req, res) => {
    const { params } = req.query;

    pool.query(`SELECT id, username, profile_image_path 
                FROM users 
                WHERE username like '${params}%'
                LIMIT 4`, (err, results) => {
        if (err) console.log(err);
        res.send({ users: results.rows });
    })
}

const getHashtagSearch = (req, res) => {
    const { params } = req.query;

    pool.query(`SELECT DISTINCT hashtag 
                FROM hashtags 
                WHERE hashtag LIKE '${params}%'
                LIMIT 4`, (err, results) => {
        if (err) console.log(err);
        res.send({ hashtags: results.rows });
    })
}

const updatePassword = (req, res) => {
    const user_id = jwt.getId(req);
    const { password, newPassword } = req.body;

    pool.query(`SELECT password FROM users WHERE id = ${user_id}`, (err, results) => {
        if (err) console.log(err);

        if (results.rows[0].password === password) {
            pool.query(`UPDATE users SET password = '${newPassword}' WHERE id = ${user_id}`, (err, results) => {
                if (err) console.log(err);
                res.send({ message: 'Password successfully changed!' });
            })
        } else {
            res.send({ message: 'Invalid password!' });
        }
    })
}

const updateUsername = (req, res) => {
    const_id = jwt.getId(req);
    const { password, username } = req.body;

    pool.query(`SELECT password FROM users WHERE id = ${user_id}`, (err, results) => {
        if (err) console.log(err);

        if (results.rows[0].password === password) {
            pool.query(`SELECT username FROM users WHERE username = '${username}'`, (err, results) => {
                if (err) console.log(err);
                if (results.rows.length > 0) {
                    res.status(401).send({ message: 'Username already taken!' });
                } else {
                    pool.query(`UPDATE users SET username = '${username}' WHERE id = ${user_id}`, (err, results) => {
                        if (err) console.log(err);
                        res.send({ message: 'Username changed successfully!' });
                    })
                }
            })
        } else {
            res.status(401).send({ message: 'Invalid password!' });
        }
    })
}

module.exports = {
    createUser,
    validateLogin,
    validateRefreshToken,
    insertPostImage,
    selectUserImages,
    getProfile,
    getPosts,
    insertComment,
    insertLike,
    changeFollowStatus,
    insertProfileImage,
    getUsersSearch,
    getHashtagSearch,
    getHashtagPosts,
    updatePassword,
    updateUsername,
    getMoreProfileImages
}