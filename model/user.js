const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, minLength: 10 },
  username: { type: String, required: true, unique: true, minLength: 6 },
  country: { type: String, required: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  wallet: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' }],
  transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
  investments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Investment' }],
  withdrawals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Withdrawal' }],
  resetToken: { type: String, required: false },
  deposits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Deposit' }],
  referee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, immutable: true, default: Date.now },
});

// userSchema.pre('save', async function (next) {
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

module.exports = mongoose.model('User', userSchema);