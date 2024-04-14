const mongoose = require('mongoose');

const WithdrawSchema = new mongoose.Schema({
  currency: { type: String, required: true },
  address: { type: String, required: true},
  amount: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', WithdrawSchema);