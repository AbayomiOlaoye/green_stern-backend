const mongoose = require('mongoose');

const DepositSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currency: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'pending' },
});

module.exports = mongoose.model('Deposit', DepositSchema);
