const express = require('express');
const router = express.Router();
const c = require('../controllers/predictionsController');

router.get('/', c.getAllPredictions);
router.get('/event/:eventId', c.getPredictionByEvent);
router.post('/generate', c.generatePredictionForEvent);
router.post('/simulate', c.simulateIntervention);
router.patch('/:id/resources', c.updateResources);

module.exports = router;

