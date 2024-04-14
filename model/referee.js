const mongoose = require('mongoose');

const RefereeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  referees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral',
  }],
}, { timestamps: true });

const Referee = mongoose.model('Referee', RefereeSchema);

module.exports = Referee;