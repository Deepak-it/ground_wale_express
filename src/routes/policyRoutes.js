const express = require('express');

const controller = require('../controllers/policyController');

const router = express.Router();

router.get('/terms', controller.getTerms);
router.get('/privacy', controller.getPrivacy);

module.exports = router;