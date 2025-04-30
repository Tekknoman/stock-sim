const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const multer = require('multer');
const path = require('path');

// Configure storage for stock icons
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../public/uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'stock-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|svg/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// GET all stocks
router.get('/', stockController.getAllStocks);

// GET a stock by ID
router.get('/:id', stockController.getStockById);

// GET price history for a stock
router.get('/:id/history', stockController.getPriceHistory);

// GET leaderboard for a stock
router.get('/:id/leaderboard', stockController.getStockLeaderboard);

// POST create a new stock
router.post('/', stockController.createStock);

// PUT update a stock
router.put('/:id', stockController.updateStock);

// DELETE a stock
router.delete('/:id', stockController.deleteStock);

module.exports = router;