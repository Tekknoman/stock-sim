const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// GET all settings
router.get('/', settingsController.getAllSettings);

// GET a setting by key
router.get('/:key', settingsController.getSetting);

// PUT update a setting
router.put('/:key', settingsController.updateSetting);

// PUT update multiple settings
router.put('/', settingsController.updateMultipleSettings);

module.exports = router;