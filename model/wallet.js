const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  balances: {
    BTC: { type: Number, default: 0 },
    ETH: { type: Number, default: 0 },
    BNB: { type: Number, default: 0 },
    USDT: { type: Number, default: 0 },
  },
  addresses: {
    BTC: { type: String, default: '' },
    ETH: { type: String, default: '' },
    BNB: { type: String, default: '' },
    USDT: { type: String, default: '' },
  },
  totalBalance: { type: Number, default: 0 },
});

const Wallet = mongoose.model('Wallet', WalletSchema);

module.exports = Wallet;
