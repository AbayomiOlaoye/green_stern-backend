require('dotenv').config();
const express = require('express');
const app = express();
// const { MailtrapClient } = require('mailtrap');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
// const nodemailer = require('nodemailer');
// const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');
const User = require('./model/user');
const Investment = require('./model/investment');
const Wallet = require('./model/wallet');
const Withdrawal = require('./model/withdraw');
const Transaction = require('./model/transaction');
const Deposit = require('./model/deposit');
const PORT = process.env.PORT || 7000;
const cors = require('cors');
const verifyJWT = require('./middleware/verify');
const createError = require('./utils/error');

app.use(cors(
  {
    origin: 'https://greenstockscapital.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }
));

app.use(express.json());
require('./database/db');

const generateResetToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// app.get('/users/:id', async (req, res) => {
//   try {
//     const user = await User.findOne(req.params.id);
//     res.json(user);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Server Error');
//   }
// });

app.post('/register', async (req, res) => {
  try {
    const { name, email, username, country, password, referee } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await User.findOne({ username });
    const existingEmail = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
    } else if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists. Please choose a different email.' });
    }

    const user = new User({ name, email, username, country, password: hashedPassword, referee });

    await user.save();

    return res.status(201).send({ message: 'User registered successfully' });
  } catch (error) {
    if (error.name === 'ValidationError') {
      console.error(error);
      return res.status(400).send({ message: 'Check your username. Minimum length is 10', error: error });
    } else {
      console.error(error);
    return res.status(500).send({ error: 'Registration failed', msg: error });}
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      email
    });
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id
    }, process.env.SECRET_KEY, { expiresIn: '3m' });
    const userData = {
      name: user.name,
      email: user.email,
      username: user.username,
      country: user.country,      id: user._id
    };
    res.send({ token, userData });
  } catch (error) {
    console.error(error);
    if (error.name === 'MongoNetworkError') {
      return res.status(500).json({ error: 'Database connection error' });
    }
    res.status(404).json({ error: 'Resource Not Found' });
  }
});

app.post('/invest', verifyJWT, async (req, res) => {
  try {
    const { planName, principalAmount, interestRate, period, min, max, currency } = req.body;
    if (!req.user) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    const user = await User.findById(req.user);

    const userWallet = await Wallet.findOne({ userId: user._id });

    let balance = userWallet.balances[currency];

    if (balance < principalAmount || principalAmount < min || principalAmount > max) {
      return res.status(400).json({ message: 'Insufficient balance or invalid amount' });
    };

    if (!userWallet.balances.hasOwnProperty(currency)) {
      return res.status(400).json({ msg: 'Invalid currency' });
    }

    const earnings = principalAmount * (interestRate / 100);

    userWallet.balances[currency] -= principalAmount;
    userWallet.totalBalance -= principalAmount;

    await userWallet.save();

    const investment = new Investment({ planName, principalAmount, interestRate, period, userId: req.user});
    await investment.save();

    await Transaction.create({ userId: req.user, type: `Investment - ${planName}`, amount: principalAmount, status: 'Pending' });

    setTimeout(async () => {
      const investmentRecord = await Investment.findById({userId: user._id});

      investmentRecord.earnings += earnings;

      investmentRecord.earnings += earnings;
      userWallet.balances[currency] += earnings;
      userWallet.totalBalance += earnings;

      await userWallet.save();

      investmentRecord.status = 'Completed';
      await investmentRecord.save();
    }, period * 1000 * 60 * 60 * 24);

      res.status(201).send({ message: 'Investment added successfully', investment });
    } catch (error) {
      console.error(error);
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: 'Invalid investment details' });
      } else if (error.name === 'CastError') {
        return res.status(400).send({ error: 'Invalid user ID format' });
      } else if (error.name === 'TypeError') {
        return res.status(500).send({ error: 'Investment creation failed' });
      } else {
        return res.status(500).send({ error: error.message });
    };
  }
  }
);

app.get('/wallet', verifyJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ message: 'Missing user ID' });
    }

    const user = await User.findById(req.user);

    const wallet = await Wallet.findOne({userId: user._id});

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    return res.status(200).json({ balance: wallet.balances, address: wallet.addresses, totalBalance: wallet.totalBalance,});
  } catch (error) {
    console.error('Error retrieving wallet balance:', error);
    createError(error.status, error.message);
    if (error.name === 'ReferenceError') {
      return res.status(400).json({ error: 'Invalid user ID format' });
    } else if (error.name === 'TypeError') {
      return res.status(500).json({ error: 'Failed to fetch wallet balance' });
    } else {
      return res.status(500).json({ error: error.message });
    }
  }
});

app.post('/deposit', verifyJWT, async (req, res) => {
  try {
    const { currency, qty, amount } = req.body;

    if (!req.user || !currency || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deposit = new Deposit({
      currency,
      qty,
      amount,
      userId: req.user
    });

    await deposit.save();

    const pending = await Transaction.create({ userId: req.user, type: 'Deposit', amount, status: 'Pending' });

    // Update user's wallet based on deposit
    let wallet = await Wallet.findOne({ userId: req.user });
    if (!wallet) {
      wallet = await Wallet.create({ userId: req.user, balances: { [currency]: amount }, totalBalance: amount });
    } else {
      wallet.balances[currency] += amount;
      wallet.totalBalance += amount;
      await wallet.save();
    }

    setTimeout(async () => {
      await Transaction.findByIdAndUpdate(pending._id, { status: 'Completed' });
    }, 2 * 60 * 1000);

    return res.status(201).json({ message: 'Cryptocurrency deposit initiated successfully' });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid deposit details' });
    } else if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID format' });
    } else if (error.name === 'TypeError') {
      await Transaction.create({ userId: req.user, type: 'Deposit', amount, status: 'Failed' });
      return res.status(400).json({ error: error.message });
    } else {
      return res.status(500).json({ error: error.message });
    }
  }
});

// Get all deposits by user
app.get('/deposits/all', verifyJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    const result = await Deposit.find({}).populate('userId').exec();
    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ data: result });
  } catch (error) {
    console.error('Error fetching deposits:', error);
    if (error.name === 'CastError' || error.name === 'ValidationError' || error.name === 'TypeError') {
      return res.status(400).json({ error: 'Invalid user ID format' });
    } else {
      return res.status(500).json({ error: 'Failed to fetch deposits' });
    }
  }
});

app.post('/withdraw', verifyJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    const { currency, amount, address } = req.body;

    const wallet = await Wallet.findOne({ userId: req.user });

    if (!wallet.balances[currency] || wallet.balances[currency] < amount) {
      await Transaction.create({ userId: req.user, type: 'Withdrawal', amount, status: 'Failed' });
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await Withdrawal.create({ currency, address, amount, userId: req.user });

    wallet.balances[currency] -= amount;
    wallet.totalBalance -= amount;
    await wallet.save();

    await Transaction.create({ userId: req.user, type: 'Withdrawal', amount, status: 'Completed' });

    return res.status(200).json({ message: 'Withdrawal successful', wallet });
  } catch (error) {
    // console.error('Withdrawal error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.put('/update-address', verifyJWT, async (req, res) => {
  const { cryptoType, newAddress } = req.body;

  if (!cryptoType || !newAddress) {
    return res.status(400).json({ message: 'Crypto type and address are required' });
  }

  try {
    const wallet = await Wallet.findOne({ userId: req.user });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    if (wallet.addresses.hasOwnProperty(cryptoType)) {
      wallet.addresses[cryptoType] = newAddress;
    } else {
      return res.status(400).json({ message: 'Invalid cryptocurrency type' });
    }

    await wallet.save();

    res.json({ message: 'Address updated successfully', wallet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/transactions/deposits', verifyJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    const deposits = await Transaction.find({userId: req.user, type: /deposit/i}).exec();

    return res.status(200).json({ deposits });
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'ValidationError' || error.name === 'TypeError' || error.name === 'MongoServerSelectionError') {
      console.error('Error fetching transaction history:', error);
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    console.error('Error fetching transaction history:', error);
    return res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});


app.get('/transactions/withdrawals', verifyJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Missing user ID' });
    }
    const withdrawals = await Transaction.find({userId: req.user, type: /withdraw/i}).exec();

    return res.status(200).json({ withdrawals });
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'ValidationError' || error.name === 'TypeError') {
      console.error('Error fetching transaction history:', error);
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    console.error('Error fetching transaction history:', error);
    return res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});


app.get('/transactions/investments', verifyJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    const investments = await Transaction.find({userId: req.user, type: /investment/i}).exec();

    return res.status(200).json({ investments });
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'ValidationError' || error.name === 'TypeError') {
      console.error('Error fetching transaction history:', error);
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    console.error('Error fetching transaction history:', error);
    return res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

// app.post('/referral', verifyJWT, async (req, res) => {
//   try {
//     const referee = await User.findById(req.user);
//     if (!referee) {
//       return res.status(404).json({ error: 'No referrals yet' });
//     }

//     const referrer = await User.findOne({ username: referee.referees });
//     if (!referrer) {
//       return res.status(400).json({ error: 'Invalid referral code' });
//     }

//     if (!referee.firstDepositAmount) {
//       return res.status(400).json({ error: 'Referee has not made a deposit yet' });
//     }

//     const referralBonusAmount = referee.deposits[0] * 0.1;

//     referee.wallet.totalBalance += referralBonusAmount;
//     referrer.wallet.totalBalance += referralBonusAmount;

//     await referee.wallet.save();
//     await referrer.wallet.save();

//     return res.status(200).json({ message: 'Referral bonus credited successfully' });
//   } catch (error) {
//     console.error('Referral error:', error);
//     return res.status(500).json({ error: 'Referral failed' });
//   }
// });

app.get('/referrals', verifyJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'Referral code not found' });
    }

    const user = await User.findById(req.user).populate('referrals');

    return res.status(200).json({ referrals: user.referrals, username: user.username });
  } catch (error) {
    console.error('Referral error:', error);
    return res.status(500).json({ error: 'Referral failed' });
  }
});

app.get('/trades/completed', verifyJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'No trades found' });
    }

    const trades = await Transaction.find({ userId: req.user })
    .where('status').in(['Completed'])
    .exec();

    return res.status(200).json({ trades });
  } catch (error) {
    console.error('Trade error:', error);
    return res.status(500).json({ error: 'Trade failed' });
  }
});

app.get('/trades/pending', verifyJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'No trades found' });
    }

    const trades = await Transaction.find({ userId: req.user })
    .where('status').in(['Pending'])
    .exec();

    return res.status(200).json({ trades });
  } catch (error) {
    console.error('Trade error:', error);
    return res.status(500).json({ error: 'Trade failed' });
  }
});

app.get('/trades/failed', verifyJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'No trades found' });
    }

    const trades = await Transaction.find({ userId: req.user })
    .where('status').in(['Failed'])
    .exec();

    return res.status(200).json({ trades });
  } catch (error) {
    console.error('Trade error:', error);
    return res.status(500).json({ error: 'Trade failed' });
  }
});

app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }
    const resetToken = generateResetToken(); // Implement a function to generate a unique token
    user.resetToken = resetToken;
    await user.save();
    sendEmail(user.email, resetToken); // Implement a function to send the reset email
    res.send({ message: 'Password reset email sent' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to reset password' });
  }
});

app.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    const user = await User.findOne({ email, resetToken: token });
    if (!user) {
      return res.status(404).send({ error: 'Invalid or expired token' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null; // Invalidate the reset token
    await user.save();
    res.send({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to reset password' });
  }
})

app.get('/logout', async (req, res) => {
  try {
    res.clearCookie('token');
    res.send({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Logout failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
