const mongoose = require('mongoose');

const DepositSchema = new mongoose.Schema({
  currency: { type: String, required: true },
  qty: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
    default: 'Pending',
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
}, { timestamps: true });

module.exports = mongoose.model('Deposit', DepositSchema);
