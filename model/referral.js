const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  referralCode: {
    type: String,
    required: true,
  },
  referral: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  }],
}, { timestamps: true });

const Referral = mongoose.model('Referral', ReferralSchema);

module.exports = Referral;