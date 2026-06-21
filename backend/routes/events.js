const express = require('express');
const router = express.Router();
const c = require('../controllers/eventsController');

router.get('/stats', c.getStats);
router.get('/', c.getEvents);
router.get('/:id', c.getEvent);
router.post('/', c.createEvent);
router.put('/:id', c.updateEvent);
router.delete('/:id', c.deleteEvent);

module.exports = router;
