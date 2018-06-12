const router = require('express').Router();
const validation = require('../lib/validation');

/*
 * Schema describing required/optional fields of a class object.
 */
const classSchema = {
  name: { required: true },
  primary_attribute_fid: { required: true },
  save_attribute_one_fid: { required: true },
  save_attribute_two_fid: { required: true }
};


/*
 * Executes a MySQL query to insert a new class into the database.  Returns
 * a Promise that resolves to the ID of the newly-created class entry.
 */
function insertNewClass(class, mysqlPool) {
  return new Promise((resolve, reject) => {
    class = validation.extractValidFields(class, classSchema);
    class.id = null;
    mysqlPool.query(
      'INSERT INTO classes SET ?',
      class,
      function (err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result.insertId);
        }
      }
    );
  });
}

/*
 * Route to create a new class.
 */
router.post('/', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  if (validation.validateAgainstSchema(req.body, classSchema)) {
    /*
     * Make sure the user is not trying to class the same business twice.
     * If they're not, then insert their class into the DB.
     */
    insertNewClass(class, mysqlPool)
      .then((id) => {
        res.status(201).json({
          id: id,
          links: {
            class: `/classes/${id}`
          }
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: "Error inserting class into DB.  Please try again later."
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid class object."
    });
  }
});

/*
 * Executes a MySQL query to fetch a single specified class based on its ID.
 * Returns a Promise that resolves to an object containing the requested
 * class.  If no class with the specified ID exists, the returned Promise
 * will resolve to null.
 */
function getClassByID(classID, mysqlPool) {
  const sql = 'SELECT C.name, A1.name AS primary_attribute, A1.id AS primary_attribute_fid, A2.name AS save_attribute_one, A2.id AS save_attribute_one_fid, ' + 
			  'A3.name AS save_attribute_two, A3.id AS save_attribute_two_fid FROM classes C ' +
			  'INNER JOIN attributes A1 ON A1.id = C.primary_attribute_fid ' +
			  'INNER JOIN attributes A2 ON A2.id = C.save_attribute_one_fid ' +
			  'INNER JOIN attributes A3 ON A3.id = C.save_attribute_two_fid ' +
			  'WHERE C.id = ?';
  return new Promise((resolve, reject) => {
    mysqlPool.query(sql, [ classID ], function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
}

/*
 * Route to fetch info about a specific class.
 */
router.get('/:classID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const classID = parseInt(req.params.classID);
  getClassByID(classID, mysqlPool)
    .then((class) => {
      if (class) {
        res.status(200).json(class);
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to fetch class.  Please try again later."
      });
    });
});

/*
 * Executes a MySQL query to replace a specified class with new data.
 * Returns a Promise that resolves to true if the class specified by
 * `classID` existed and was successfully updated or to false otherwise.
 */
function replaceClassByID(classID, class, mysqlPool) {
  return new Promise((resolve, reject) => {
    class = validation.extractValidFields(class, classSchema);
    mysqlPool.query('UPDATE classes SET ? WHERE id = ?', [ class, classID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
}

/*
 * Route to update a class.
 */
router.put('/:classID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const classID = parseInt(req.params.classID);
  if (validation.validateAgainstSchema(req.body, classSchema)) {
    let updatedClass = validation.extractValidFields(req.body, classSchema);
    getClassByID(classID, mysqlPool)
      .then((existingClass) => {
        if (existingClass) {
          return replaceClassByID(classID, updatedClass, mysqlPool);
        } else {
          next();
        }
      })
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              class: `/classes/${classID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: "Unable to update class.  Please try again later."
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid class object."
    });
  }
});

/*
 * Executes a MySQL query to delete a class specified by its ID.  Returns
 * a Promise that resolves to true if the class specified by `classID`
 * existed and was successfully deleted or to false otherwise.
 */
function deleteClassByID(classID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('DELETE FROM classes WHERE id = ?', [ classID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });

}

/*
 * Route to delete a class.
 */
router.delete('/:classID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const classID = parseInt(req.params.classID);
  deleteClassByID(classID, mysqlPool)
    .then((deleteSuccessful) => {
      if (deleteSuccessful) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to delete class.  Please try again later."
      });
    });
});

exports.router = router;
