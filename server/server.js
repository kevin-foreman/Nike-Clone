// Set up for use with Redis inside AWS ElastiCache cluster
// const client = redis.createClient(redisPort, redisHost);
// const redisHost = process.env.REDIS_HOST || 'localhost';
// const redisPort = process.env.REDIS_PORT || 6379;

const { Pool } = pkg;
import pkg from 'pg';
import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';

const redisClient = new Redis({
    host: 'redis',
    port: 6379,
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

// Put .env configuration in preparation for deployed version
import { config } from 'dotenv';
config();
// console.log(process.env);

//SETUP DEPENDECIES:
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const PORT = process.env.PORT || 8000;
// import { listenerCount } from 'stream';

const pool = new Pool({
    user: 'postgres',
    host: 'db',
    database: 'FEC',
    password: 'password',
    port: 5432
});

const DEFAULT_EXPIRATION = 3600;
// OLD route
app.get('/api/shoes', (req, res, next) => {
    redisClient.get('shoes', (error, shoes) => {
        if (error) console.error(error)
        if (shoes != null) {
            return res.json(JSON.parse(shoes))
        } else {
            pool.query('SELECT * FROM shoes', (err, result) => {
                if (err){
                    res.status(404).send(err)
                } else {
                    const data = result.rows;
                    redisClient.setEx('shoes', DEFAULT_EXPIRATION, JSON.stringify(data));
                    res.status(200).send(data);
                }
            })
        }
    })
})
// New Route
// console.log('Redis client status:', redisClient.status);
// app.get('/api/shoes', (req, res, next) => {
//     redisClient.get('shoes', (error, shoes) => {
//         if (error) {
//             console.error(error);
//             return res.status(500).send('Error retrieving shoes from cache');
//         }
        
//         if (shoes != null) {
//             try {
//                 const parsedShoes = JSON.parse(shoes);
//                 return res.json(parsedShoes);
//             } catch (parseError) {
//                 console.error(parseError);
//                 return res.status(500).send('Error parsing shoes JSON data');
//             }
//         } else {
//             pool.query('SELECT * FROM shoes', (err, result) => {
//                 if (err) {
//                     res.status(500).send(err);
//                 } else {
//                     const data = result.rows;
//                     redisClient.setex('shoes', DEFAULT_EXPIRATION, JSON.stringify(data), (setexErr) => {
//                         if (setexErr) {
//                             console.error(setexErr);
//                             return res.status(500).send('Error saving shoes to cache');
//                         }
//                         res.status(200).send(data);
//                     });
//                 }
//             });
//         }
//     });
// });


app.get('/api/shoes/:id', (req, res, next) =>{
    const id = Number.parseInt(req.params.id);
    pool.query('SELECT * FROM shoes WHERE id=$1', [id], (err, result) => {
        if (err){
            res.status(404).send(err);
        } else {
            const shoe = result.rows;
            res.status(200).send(shoe);
        }
    })
})

app.get('/api/shoeid/:id', (req, res, next) =>{
    const id = Number.parseInt(req.params.id);
    pool.query('SELECT * FROM shoes WHERE shoeid=$1', [id], (err, result) => {
        if (err){
            res.status(404).send(err);
        } else {
            const shoe = result.rows;
            res.status(200).send(shoe);
        }
    })
})


//Query provides an extra column on return of query, column 'shoes_name' which is pulled from parent table 'shoes'
app.get('/api/review', (req, res, next) => {
    pool.query('SELECT review.*, shoes.name AS shoes_name FROM review INNER JOIN shoes ON review.review_id = shoes.id;', (err, result) => {
        if (err) {
            res.status(404).send(err);
        } else {
            const reviews = result.rows;
            res.status(200).send(reviews); 
        }
    })
})

app.get('/api/review/:id', (req, res, next) => {
    const id = Number.parseInt(req.params.id);

    pool.query('SELECT * FROM review WHERE review_id=$1', [id], (err, result) => {
        if (err){
            res.status(404).send(err)
        } else {
            const review = result.rows;
            res.status(200).send(review);
        }
    })
})

app.get('/api/:word', (req, res, next) => {
    const word = req.params.word;
    res.status(405).send(`NOT FOUND!! - 405 ERROR - /api/${word}/ DOES NOT EXIST`)
})

app.post('/api/shoes/', (req, res) => {
    const name = req.body.name;
    const price = req.body.price;
    const gender = req.body.gender;
    const image = req.body.image;
    const image_array = req.body.image_array;
    const description = req.body.description;
    const color_description = req.body.color_description;
    const style = req.body.style;
    const size_array = req.body.size_array;

    if (!name || !price || !gender || !image || !image_array || !description || !color_description || !style || !size_array){
        return res.status(407).send("Error in post data or insufficient data provided for post route shoes")
    }

    pool.query('INSERT INTO shoes (name, price, gender, image, image_array, description, color_description, style, size_array) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING*;', [name, price, gender, image, image_array, description, color_description, style, size_array], (err, result) => {
        if (err) {
            res.status(409).send(err);
        } else {
            const shoeInfo = result.rows[0];
            res.status(202).send(shoeInfo)
        }
    })
})

app.post('/api/review/', (req, res) => {
    const review_id = req.body.review_id;
    const title = req.body.title;
    const stars = req.body.stars;
    const user_name = req.body.user_name;
    const date_created = req.body.date_created;
    const summary = req.body.summary;

    if (!review_id || !title || !stars || !user_name || !date_created || !summary){
        return res.status(408).send("Error in post data or insufficient data provided for post route review")
    }

    pool.query('INSERT INTO review (review_id, title, stars, user_name, date_created, summary) VALUES ($1, $2, $3, $4, $5, $6) RETURNING*;', [review_id, title, stars, user_name, date_created, summary], (err, result) => {
        if (err) {
            res.status(410).send(err);
        } else {
            const reviewInfo = result.rows[0];
            res.status(203).send(reviewInfo);
        }
    })
})
//DELETE ROUTES (x2) - NOT NECESSARY
//PATCH ROUTES (x2) - NOT NECESSARY

app.use(function(err, req, res, next){
    res.status(404).send("ERROR 404 ('MIDDLEWARE') - THERE WAS A PROBLEM", err);
});


app.listen(PORT, () => {
    console.log(`Service is running, listening on ${PORT}`);
});