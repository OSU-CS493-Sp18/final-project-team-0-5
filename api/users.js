const router = require('express').Router();
const bcrypt = require('bcryptjs');
const ObjectId = require('mongodb').ObjectId;

const { generateAuthToken, requireAuthentication } = require('../lib/auth');


function validateUserObject(user) {
	return user && user.userID && user.name && user.email && user.password;
}

function insertNewUser(user, mongoDB) {
	return bcrypt.hash(user.password, 8)
	.then((passwordHash) => {
		const userDocument = {
			userID: user.userID,
			name: user.name,
			email: user.email,
			password: passwordHash,
			spells: []
		};
		const usersCollection = mongoDB.collection('users');
		return usersCollection.insertOne(userDocument)
			.then((result) => {
				return Promise.resolve(result.insertedId);
		});
	});
}

router.post('/', function (req, res) {
	const mongoDB = req.app.locals.mongoDB;
	if (validateUserObject(req.body)) {
		insertNewUser(req.body, mongoDB).then((id) => {
			res.status(201).json({
				_id: id,
				links: {
					user: '/users/${id}'
				}
			});
		})
		.catch((err) => {
			res.status(500).json({
				error: "Failed to insert new User."
			});
		});
	} else {
		res.status(400).json({
			error: "Request body does not contain a valid user."
		});
	}
});


router.post('/login', function (req, res) {
  const mongoDB = req.app.locals.mongoDB;
  if (req.body && req.body.userID && req.body.password) {
    getUserByID(req.body.userID, mongoDB, true)
      .then((user) => {
        if (user) {
          return bcrypt.compare(req.body.password, user.password);
        } else {
          return Promise.reject(401);
        }
      })
      .then((loginSuccessful) => {
        if (loginSuccessful) {
          return generateAuthToken(req.body.userID);
        } else {
          return Promise.reject(401);
        }
      })
      .then((token) => {
        res.status(200).json({
          token: token
        });
      })
      .catch((err) => {
        console.log(err);
        if (err === 401) {
          res.status(401).json({
            error: "Login Failed: invalid credentials."
          });
        } else {
          res.status(500).json({
            error: "Login Failed: failed to fetch user."
          });
        }
      });
  } else {
    res.status(400).json({
      error: "Login Failed: request needs a userID and password."
    })
  }
});

router.get('/:userID', requireAuthentication, function (req, res, next) {
	const mongoDB = req.app.locals.mongoDB;
	if (req.user !== req.params.userID) {
	  res.status(403).json({
		error: "Unauthorized access to resource"
	  });
  } else {
	  getUserByID(req.params.userID, mongoDB)
		.then((user) => {
			if (user) {
				res.status(200).json(user);
			} else {
				next();
			}
		})
		.catch((err) => {
			res.status(500).json({
				error: "Failed to fetch user"
			});
		});
  }
});


function generateUserIDQuery(userID) {
	if (ObjectId.isValid(userID)) {
		return { _id: new ObjectId(userID) };
	} else {
		return { userID: userID };
	}
}


function getUserByID(userID, mongoDB) {
	const usersCollection = mongoDB.collection('users');
	const query = generateUserIDQuery(userID);
	return usersCollection.find(query).toArray().then((results) => {
		return Promise.resolve(results[0]);
	});
}


/*
 * Route to list all of a user's spells.
 */
router.get('/:userID/spells', requireAuthentication, function (req, res) {
  const mysqlPool = req.app.locals.mysqlPool;
  const userID = req.params.userID;
  getSpellsByUserID(userID, mysqlPool)
    .then((spells) => {
      if (spells) {
        res.status(200).json({ spells: spells });
      } else {
        next();
      }
    })
    .catch((err) => {
		  console.log(err);
      res.status(500).json({
        error: "Unable to fetch spells.  Please try again later."
      });
    });
});


/*
 * Executes a MySQL query to fetch all spells by a specified user, based on
 * on the user's ID.  Returns a Promise that resolves to an array containing
 * the requested spells.  This array could be empty if the specified user
 * does not have any spells.  This function does not verify that the specified
 * user ID corresponds to a valid user.
 */
function getSpellsByUserID(userID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query(
      'SELECT * FROM spells WHERE userid = ?',
      [ userID ],
      function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
}



exports.router = router;
exports.getUserByID = getUserByID;
