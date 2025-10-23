const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const staffSchema = new Schema({
    name: { type: String, required: true, unique: true },
    role: {
        type: String,
        required: true,
        enum: ['Nurse', 'Nursing Attendant', 'Supervisor']
    },
    // CORE FIX: Change the default back to 40 hours
    targetHours: { type: Number, default: 40 } 
});

module.exports = mongoose.model('Staff', staffSchema);