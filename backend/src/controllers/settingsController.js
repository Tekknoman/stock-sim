const Settings = require('../models/Settings');

// Get all settings
exports.getAllSettings = (req, res) => {
    try {
        const settings = Settings.getAll();
        res.json(settings);
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
};

// Get a single setting
exports.getSetting = (req, res) => {
    try {
        const { key } = req.params;
        const value = Settings.get(key);

        if (!value) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        res.json({ key, value });
    } catch (error) {
        console.error('Error getting setting:', error);
        res.status(500).json({ error: 'Failed to get setting' });
    }
};

// Update a setting
exports.updateSetting = (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (value === undefined) {
            return res.status(400).json({ error: 'Value is required' });
        }

        Settings.set(key, value);
        res.json({ message: 'Setting updated successfully', key, value });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
};

// Update multiple settings
exports.updateMultipleSettings = (req, res) => {
    try {
        const settings = req.body;

        if (!settings || Object.keys(settings).length === 0) {
            return res.status(400).json({ error: 'Settings object is required' });
        }

        Settings.setMultiple(settings);
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};