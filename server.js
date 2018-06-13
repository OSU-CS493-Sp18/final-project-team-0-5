const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const MongoClient = require('mongodb').MongoClient;
const redis = require('redis');

const api = require('./api');

const app = express();
const port = process.env.PORT || 8000;

const mongoHost = process.env.MONGO_HOST;
const mongoPort = process.env.MONGO_PORT || '27017';
const mongoDBName = process.env.MONGO_DATABASE;
const mongoUser = process.env.MONGO_USERNAME;
const mongoPassword = process.env.MONGO_PASSWORD;

const mongoURL = `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDBName}`
console.log("== Mongo URL:", mongoURL);

const mysqlHost = process.env.MYSQL_HOST;
const mysqlPort = process.env.MYSQL_PORT || '3306';
const mysqlDBName = process.env.MYSQL_DATABASE;
const mysqlUser = process.env.MYSQL_USER;
const mysqlPassword = process.env.MYSQL_PASSWORD;

const maxMySQLConnections = 10;
app.locals.mysqlPool = mysql.createPool({
  connectionLimit: maxMySQLConnections,
  host: mysqlHost,
  port: mysqlPort,
  database: mysqlDBName,
  user: mysqlUser,
  password: mysqlPassword
});

const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;

const redisClient = redis.createClient(redisPort, redisHost);

const rateLimitWindowMilliseconds = 60000;
const rateLimitWindowMaxRequests = 10;

function getUserTokenBucket(ip) {
  return new Promise((resolve, reject) => {
    redisClient.hgetall(ip, function (err, tokenBucket) {
      if (err) {
        reject(err);
      } else {
        if (tokenBucket) {
          tokenBucket.tokens = parseFloat(tokenBucket.tokens);
        } else {
          tokenBucket = { tokens: rateLimitWindowMaxRequests, last: Date.now() };
        }
        resolve(tokenBucket);
      }
    });
  });
}

function saveUserTokenBucket(ip, tokenBucket) {
  return new Promise((resolve, reject) => {
    redisClient.hmset(ip, tokenBucket, function (err, response) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function rateLimit(req, res, next) {
  let userHasSufficientTokens = true;
  getUserTokenBucket(req.ip)
    .then((tokenBucket) => {
      const timestamp = Date.now();
      const elapsedMilliseconds = timestamp - tokenBucket.last;
      const refreshRate = rateLimitWindowMaxRequests / rateLimitWindowMilliseconds;
      tokenBucket.tokens += elapsedMilliseconds * refreshRate;
      tokenBucket.tokens = Math.min(tokenBucket.tokens, rateLimitWindowMaxRequests);

      if (tokenBucket.tokens < 1) {
        userHasSufficientTokens = false;
      } else {
        tokenBucket.tokens -= 1;
      }
      tokenBucket.last = timestamp;

      return saveUserTokenBucket(req.ip, tokenBucket);
    })
    .then(() => {
      if (userHasSufficientTokens) {
        next();
      } else {
        res.status(429).json({
          error: "Too many requests per minute"
        });
      }
    })
    .catch((err) => {
      next();
    });
}

/*
 * Morgan is a popular logger.
 */
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(rateLimit);

/*
 * All routes for the API are written in modules in the api/ directory.  The
 * top-level router lives in api/index.js.  That's what we include here, and
 * it provides all of the routes.
 */
app.use('/', api);

app.use('*', function (req, res, next) {
  res.status(404).json({
    error: "Requested resource " + req.originalUrl + " does not exist"
  });
});

MongoClient.connect(mongoURL, function (err, client) {
	if (!err) {
		app.locals.mongoDB = client.db(mongoDBName);
		app.listen(port, function() {
		  console.log("== Server is running on port", port);
		});
	} else {
		console.log(err)
	}
});