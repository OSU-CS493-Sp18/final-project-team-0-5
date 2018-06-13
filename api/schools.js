const router = require('express').Router();
const validation = require('../lib/validation');

/*
 * Schema describing required/optional fields of a school object.
 */
const schoolSchema = {
  name: { required: true },
  description: { required: true }
};


/*
 * Executes a MySQL query to insert a new school into the database.  Returns
 * a Promise that resolves to the ID of the newly-created school entry.
 */
function insertNewSchool(school, mysqlPool) {
  return new Promise((resolve, reject) => {
    school = validation.extractValidFields(school, schoolSchema);
    school.id = null;
    mysqlPool.query(
      'INSERT INTO schools SET ?',
      school,
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
 * Route to create a new school.
 */
router.post('/', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  if (validation.validateAgainstSchema(req.body, schoolSchema)) {
    insertNewSchool(req.body, mysqlPool)
      .then((id) => {
        res.status(201).json({
          id: id,
          links: {
            school: `/schools/${id}`
          }
        });
      })
      .catch((err) => {
		  res.status(500).json({
			error: "Error inserting school into DB.  Please try again later."
		  });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid school object."
    });
  }
});

/*
 * Executes a MySQL query to fetch a single specified school based on its ID.
 * Returns a Promise that resolves to an object containing the requested
 * school.  If no school with the specified ID exists, the returned Promise
 * will resolve to null.
 */
function getSchoolByID(schoolID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT * FROM schools WHERE id = ?', [ schoolID ], function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
}

/*
 * Route to fetch info about a specific school.
 */
router.get('/:schoolID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const schoolID = parseInt(req.params.schoolID);
  getSchoolByID(schoolID, mysqlPool)
    .then((school) => {
      if (school) {
        res.status(200).json(school);
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to fetch school.  Please try again later."
      });
    });
});

/*
 * Executes a MySQL query to replace a specified school with new data.
 * Returns a Promise that resolves to true if the school specified by
 * `schoolID` existed and was successfully updated or to false otherwise.
 */
function replaceSchoolByID(schoolID, school, mysqlPool) {
  return new Promise((resolve, reject) => {
    school = validation.extractValidFields(school, schoolSchema);
    mysqlPool.query('UPDATE schools SET ? WHERE id = ?', [ school, schoolID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
}

/*
 * Route to update a school.
 */
router.put('/:schoolID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const schoolID = parseInt(req.params.schoolID);
  if (validation.validateAgainstSchema(req.body, schoolSchema)) {
    let updatedSchool = validation.extractValidFields(req.body, schoolSchema);
    getSchoolByID(schoolID, mysqlPool)
      .then((existingSchool) => {
        if (existingSchool) {
          return replaceSchoolByID(schoolID, updatedSchool, mysqlPool);
        } else {
          next();
        }
      })
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              school: `/schools/${schoolID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
          res.status(500).json({
            error: "Unable to update school.  Please try again later."
          });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid school object."
    });
  }
});

/*
 * Executes a MySQL query to delete a school specified by its ID.  Returns
 * a Promise that resolves to true if the school specified by `schoolID`
 * existed and was successfully deleted or to false otherwise.
 */
function deleteSchoolByID(schoolID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('DELETE FROM schools WHERE id = ?', [ schoolID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });

}

/*
 * Route to delete a school.
 */
router.delete('/:schoolID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const schoolID = parseInt(req.params.schoolID);
  deleteSchoolByID(schoolID, mysqlPool)
    .then((deleteSuccessful) => {
      if (deleteSuccessful) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to delete school.  Please try again later."
      });
    });
});


exports.router = router;
