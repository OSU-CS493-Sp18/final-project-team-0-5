const router = module.exports = require('express').Router();

router.use('/spells', require('./spells').router);
router.use('/schools', require('./schools').router);
router.use('/attributes', require('./attributes').router);
router.use('/classes', require('./classes').router);
router.use('/users', require('./users').router);
