const express = require('express');

const controller = require('../controllers/slotController');

const router = express.Router();

router.patch('/:slotId', controller.updateSlot);
router.post('/:slotId/block', controller.blockSlot);
router.delete('/:slotId', controller.deleteSlot);

module.exports = router;