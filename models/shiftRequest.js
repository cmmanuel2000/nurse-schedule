const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const shiftRequestSchema = new Schema({
    staffId: {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    shift: {
        type: String,
        required: true,
        enum: ['6A6P', '6A2P', '2P10P', '6P6A', '10P6A']
    }
});

module.exports = mongoose.model('ShiftRequest', shiftRequestSchema);