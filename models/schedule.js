const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const scheduleSchema = new Schema({
    staffId: {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
        required: true
    },
    date: { type: Date, required: true },
    shift: {
        type: String,
        required: true,
        enum: ['6A6P', '2P10P', '6P6A', '10P6A', '6A2P'] // FIX: '6A2P' is now a valid option
    }
});

module.exports = mongoose.model('Schedule', scheduleSchema);