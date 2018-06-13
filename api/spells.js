const router = require('express').Router();
const validation = require('../lib/validation');
const ObjectId = require('mongodb').ObjectId;

const { generateAuthToken, requireAuthentication } = require('../lib/auth');
const { getUserByID } = require('./users');

/*
 * Schema describing required/optional fields of a spell object.
 */
const spellSchema = {
  userid: { required: true },
  name: { required: true },
  school_fid: { required: true }
};

/*
 * Executes a MySQL query to insert a new spell into the database.  Returns
 * a Promise that resolves to the ID of the newly-created spell entry.
 */
function insertNewSpell(spell, mysqlPool, mongoDB) {
  return new Promise((resolve, reject) => {
    spell = validation.extractValidFields(spell, spellSchema);
    spell.id = null;
    mysqlPool.query(
      'INSERT INTO spells SET ?',
      spell,
      function (err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result.insertId);
        }
      }
    );
  }).then((id) => {
		return addSpellToUser(id, spell.userid, mongoDB);
  });
}

function addSpellToUser(spellID, userID, mongoDB) {
  const usersCollection = mongoDB.collection('users');
  const query = generateUserIDQuery(userID);
  return usersCollection.updateOne(query,{ $push: { spells: spellID } }
  ).then(() => {
    return Promise.resolve(spellID);
  });
}

/*
 * Route to create a new spell.
 */
router.post('/', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const mongoDB = req.app.locals.mongoDB;
  if (validation.validateAgainstSchema(req.body, spellSchema)) {
	if (getUserByID(req.body.userid, mongoDB)) {
		insertNewSpell(req.body, mysqlPool, mongoDB)
		  .then((id) => {
			res.status(201).json({
			  id: id,
			  links: {
				spell: `/spells/${id}`
			  }
			});
		  })
		  .catch((err) => {
				console.log(err);
			res.status(500).json({
			  error: "Error inserting spell into DB.  Please try again later."
			});
		  });
	} else {
		res.status(403).json({
			error: "User is invalid"
		});
	}
  } else {
    res.status(400).json({
      error: "Request body is not a valid spell object"
    });
  }
});

/*
 * Executes a MySQL query to fetch a single specified spell based on its ID.
 * Returns a Promise that resolves to an object containing the requested
 * spell.  If no spell with the specified ID exists, the returned Promise
 * will resolve to null.
 */
function getSpellByID(spellID, mysqlPool) {
  const sql = 'SELECT S.id AS id, S.userid AS user, S.name AS name, SC.name AS school, SC.id AS school_fid FROM spells S ' +
	          'INNER JOIN schools SC ON SC.id = S.school_fid WHERE S.id = ?';
  return new Promise((resolve, reject) => {
    mysqlPool.query(sql, [ spellID ], function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
}

/*
 * Route to fetch info about a specific spell.
 */
router.get('/:spellID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const spellID = parseInt(req.params.spellID);
  getSpellByID(spellID, mysqlPool)
    .then((spell) => {
      if (spell) {
        res.status(200).json(spell);
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to fetch spell.  Please try again later."
      });
    });
});

/*
 * Executes a MySQL query to replace a specified spell with new data.
 * Returns a Promise that resolves to true if the spell specified by
 * `spellID` existed and was successfully updated or to false otherwise.
 */
function replaceSpellByID(spellID, spell, mysqlPool) {
  return new Promise((resolve, reject) => {
    spell = validation.extractValidFields(spell, spellSchema);
    mysqlPool.query('UPDATE spells SET ? WHERE id = ?', [ spell, spellID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
}

/*
 * Route to update a spell.
 */
router.put('/:spellID', requireAuthentication, function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const spellID = parseInt(req.params.spellID);
  if (validation.validateAgainstSchema(req.body, spellSchema)) {
    let updatedSpell = validation.extractValidFields(req.body, spellSchema);
    getSpellByID(spellID, mysqlPool)
      .then((existingSpell) => {
        if (existingSpell) {
            return replaceSpellByID(spellID, updatedSpell, mysqlPool);
        } else {
          next();
        }
      })
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              spell: `/spells/${spellID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: "Unable to update spell.  Please try again later."
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid spell object."
    });
  }
});

/*
 * Executes a MySQL query to delete a spell specified by its ID.  Returns
 * a Promise that resolves to true if the spell specified by `spellID`
 * existed and was successfully deleted or to false otherwise.
 */
function deleteSpellByID(spellID, mysqlPool, mongoDB) {
  usersCollection = mongoDB.collection('users');
  return new Promise((resolve, reject) => {
    mysqlPool.query('DELETE FROM spells WHERE id = ?', [ spellID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
		usersCollection.update({}, {$pull: {spells: spellID}}, {multi: true});
        resolve(result.affectedRows > 0);
      }
    });
  });

}

/*
 * Route to delete a spell.
 */
router.delete('/:spellID', requireAuthentication, function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const mongoDB = req.app.locals.mongoDB;
  const spellID = parseInt(req.params.spellID);
  deleteSpellByID(spellID, mysqlPool, mongoDB)
    .then((deleteSuccessful) => {
      if (deleteSuccessful) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to delete spell.  Please try again later."
      });
    });
});


function generateUserIDQuery(userID) {
	if (ObjectId.isValid(userID)) {
		return { _id: new ObjectId(userID) };
	} else {
		return { userID: userID };
	}
}


exports.router = router;
