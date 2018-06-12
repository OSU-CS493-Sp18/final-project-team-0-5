const router = require('express').Router();
const bcrypt = require('bcryptjs');

const { getSpellsByUserID } = require('./spells');
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
  const userID = parseInt(req.params.userID);
  getSpellsByUserID(userID, mysqlPool)
    .then((spells) => {
      if (spells) {
        res.status(200).json({ spells: spells });
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to fetch spells.  Please try again later."
      });
    });
});

function addSpellToUser(spellID, userID, mongoDB) {
  const usersCollection = mongoDB.collection('users');
  const query = generateUserIDQuery(userID);
  return usersCollection.updateOne(
    query,
    { $push: { spells: spellID } }
  ).then(() => {
    return Promise.resolve(spellID);
  });
}



exports.router = router;
exports.getUserByID = getUserByID;
exports.addSpellToUser = addSpellToUser;
