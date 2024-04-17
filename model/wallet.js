const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  addresses: {
    BTC: { type: String, default: 'Not Added Yet' },
    ETH: { type: String, default: 'Not Added Yet' },
    BNB: { type: String, default: 'Not Added Yet' },
    USDT: { type: String, default: 'Not Added Yet' },
  },
  totalBalance: { type: Number, default: 0 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
});

const Wallet = mongoose.model('Wallet', WalletSchema);

module.exports = Wallet;
