const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  country: { type: String, required: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
  transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
  investments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Investment' }],
  withdrawals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Withdrawal' }],
  deposits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Deposit' }]
});

// userSchema.pre('save', async function (next) {
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

module.exports = mongoose.model('User', userSchema);