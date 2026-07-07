const express = require('express');

const controller = require('../controllers/supportController');

const router = express.Router();

router.post('/tickets', controller.createTicket);

module.exports = router;