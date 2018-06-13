const router = require('express').Router();
const validation = require('../lib/validation');

/*
 * Schema describing required/optional fields of a attribute object.
 */
const attributeSchema = {
  name: { required: true },
  description: { required: true }
};



/*
 * Executes a MySQL query to insert a new attribute into the database.  Returns
 * a Promise that resolves to the ID of the newly-created attribute entry.
 */
function insertNewAttribute(attribute, mysqlPool) {
  return new Promise((resolve, reject) => {
    attribute = validation.extractValidFields(attribute, attributeSchema);
    attribute.id = null;
    mysqlPool.query(
      'INSERT INTO attributes SET ?',
      attribute,
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
 * Route to create a new attribute.
 */
router.post('/', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  if (validation.validateAgainstSchema(req.body, attributeSchema)) {
    insertNewAttribute(req.body, mysqlPool)
      .then((id) => {
        res.status(201).json({
          id: id,
          links: {
            attribute: `/attributes/${id}`
          }
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: "Error inserting attribute into DB.  Please try again later."
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid attribute object."
    });
  }
});

/*
 * Executes a MySQL query to fetch a single specified attribute based on its ID.
 * Returns a Promise that resolves to an object containing the requested
 * attribute.  If no attribute with the specified ID exists, the returned Promise
 * will resolve to null.
 */
function getAttributeByID(attributeID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('SELECT * FROM attributes WHERE id = ?', [ attributeID ], function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
}

/*
 * Route to fetch info about a specific attribute.
 */
router.get('/:attributeID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const attributeID = parseInt(req.params.attributeID);
  getAttributeByID(attributeID, mysqlPool)
    .then((attribute) => {
      if (attribute) {
        res.status(200).json(attribute);
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to fetch attribute.  Please try again later."
      });
    });
});

/*
 * Executes a MySQL query to replace a specified attribute with new data.
 * Returns a Promise that resolves to true if the attribute specified by
 * `attributeID` existed and was successfully updated or to false otherwise.
 */
function replaceAttributeByID(attributeID, attribute, mysqlPool) {
  return new Promise((resolve, reject) => {
    attribute = validation.extractValidFields(attribute, attributeSchema);
    mysqlPool.query('UPDATE attributes SET ? WHERE id = ?', [ attribute, attributeID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
}

/*
 * Route to update a attribute.
 */
router.put('/:attributeID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const attributeID = parseInt(req.params.attributeID);
  if (validation.validateAgainstSchema(req.body, attributeSchema)) {
    let updatedAttribute = validation.extractValidFields(req.body, attributeSchema);
    getAttributeByID(attributeID, mysqlPool)
      .then((existingAttribute) => {
        if (existingAttribute) {
            return replaceAttributeByID(attributeID, updatedAttribute, mysqlPool);
        } else {
          next();
        }
      })
      .then((updateSuccessful) => {
        if (updateSuccessful) {
          res.status(200).json({
            links: {
              attribute: `/attributes/${attributeID}`
            }
          });
        } else {
          next();
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: "Unable to update attribute.  Please try again later."
        });
      });
  } else {
    res.status(400).json({
      error: "Request body is not a valid attribute object."
    });
  }
});

/*
 * Executes a MySQL query to delete a attribute specified by its ID.  Returns
 * a Promise that resolves to true if the attribute specified by `attributeID`
 * existed and was successfully deleted or to false otherwise.
 */
function deleteAttributeByID(attributeID, mysqlPool) {
  return new Promise((resolve, reject) => {
    mysqlPool.query('DELETE FROM attributes WHERE id = ?', [ attributeID ], function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });

}

/*
 * Route to delete a attribute.
 */
router.delete('/:attributeID', function (req, res, next) {
  const mysqlPool = req.app.locals.mysqlPool;
  const attributeID = parseInt(req.params.attributeID);
  deleteAttributeByID(attributeID, mysqlPool)
    .then((deleteSuccessful) => {
      if (deleteSuccessful) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: "Unable to delete attribute.  Please try again later."
      });
    });
});


exports.router = router;
