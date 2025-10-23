const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const unavailabilitySchema = new Schema({
    staffId: {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
        required: true
    },
    date: { type: Date, required: true }
});

module.exports = mongoose.model('Unavailability', unavailabilitySchema);