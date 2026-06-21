const express = require('express');
const router = express.Router();
const c = require('../controllers/trafficController');

router.get('/live', c.getLiveTraffic);
router.get('/summary', c.getTrafficSummary);
router.get('/zone/:zone', c.getTrafficByZone);
router.get('/', c.getTrafficRecords);
router.post('/', c.addTrafficRecord);

module.exports = router;
