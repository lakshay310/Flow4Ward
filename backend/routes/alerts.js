const express = require('express');
const router = express.Router();
const c = require('../controllers/alertsController');

router.get('/stats', c.getAlertStats);
router.get('/', c.getAlerts);
router.post('/', c.createAlert);
router.patch('/:id/resolve', c.resolveAlert);

module.exports = router;
