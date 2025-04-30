const express = require('express');
const router = express.Router();
const positionController = require('../controllers/positionController');

// GET all positions
router.get('/', positionController.getAllPositions);

// GET a position by ID
router.get('/:id', positionController.getPositionById);

// POST create a new position
router.post('/', positionController.createPosition);

// PUT close a position
router.put('/:id/close', positionController.closePosition);

module.exports = router;