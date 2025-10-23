const express = require('express');
const router = express.Router();

// Import Mongoose Models
const Staff = require('../models/staff');
const Unavailability = require('../models/unavailability');
const Schedule = require('../models/schedule');
const ShiftRequest = require('../models/shiftRequest');

// Import only the main scheduler function from the logic file
const { generateSchedule } = require('../logic/scheduler');

// --- API Test Route ---
router.get('/', (req, res) => {
    res.json({ message: 'API is connected and ready.' });
});

// --- STAFF ROUTES ---
router.post('/staff', async (req, res) => {
    try {
        const { name, role } = req.body;
        const newStaff = new Staff({ name, role });
        await newStaff.save();
        res.status(201).json(newStaff);
    } catch (err) {
        res.status(400).json({ error: 'Failed to add staff member.', details: err.message });
    }
});

router.get('/staff', async (req, res) => {
    try {
        const staffList = await Staff.find();
        res.status(200).json(staffList);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve staff list.' });
    }
});

// --- UNAVAILABILITY ROUTES ---
router.post('/unavailability', async (req, res) => {
    try {
        const { staffId, date } = req.body;
        const newUnavailability = new Unavailability({ staffId, date });
        await newUnavailability.save();
        res.status(201).json(newUnavailability);
    } catch (err) {
        res.status(400).json({ error: 'Failed to submit unavailability request.', details: err.message });
    }
});

router.get('/unavailability', async (req, res) => {
    try {
        const unavailabilityList = await Unavailability.find();
        res.status(200).json(unavailabilityList);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve unavailability list.' });
    }
});

// --- SHIFT REQUEST ROUTES ---
router.post('/shift-requests', async (req, res) => {
    try {
        const { staffId, date, shift } = req.body;
        const newRequest = new ShiftRequest({ staffId, date, shift });
        await newRequest.save();
        res.status(201).json(newRequest);
    } catch (err) {
        res.status(400).json({ error: 'Failed to submit shift request.', details: err.message });
    }
});


// --- SCHEDULE ROUTES ---
router.post('/generate-schedule', async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Please provide both startDate and endDate.' });
        }
        const result = await generateSchedule(startDate, endDate);
        res.status(200).json(result);
    } catch (err) {
        console.error('Scheduling Error:', err);
        res.status(500).json({ error: 'Failed to generate schedule.', details: err.message });
    }
});

router.get('/schedule', async (req, res) => {
    try {
        const schedule = await Schedule.find()
            .populate('staffId', 'name role')
            .sort('date');
        res.status(200).json(schedule);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve schedule.' });
    }
});

router.delete('/schedule', async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const result = await Schedule.deleteMany({
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });
        res.status(200).json({ message: 'Schedule entries deleted successfully.', deletedCount: result.deletedCount });
    } catch (err) {
        console.error('Deletion Error:', err);
        res.status(500).json({ error: 'Failed to delete schedule entries.' });
    }
});

module.exports = router;