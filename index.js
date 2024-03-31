require('dotenv').config();
const express = require('express');
const app = express();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
// const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');
const User = require('./model/user');
const Investment = require('./model/investment');
const Wallet = require('./model/wallet');
const Withdrawal = require('./model/withdraw');
const Transaction = require('./model/transaction');
const Deposit = require('./model/deposit');
const PORT = process.env.PORT || 3000;
const cors = require('cors');
const verifyJWT = require('./middleware/verify');
const createError = require('./utils/error');

app.use(cors(
  {
    origin: 'http://localhost:3000',
    credentials: true
  }
));

app.use(express.json());
require('./database/db');



const generateResetToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

// Construct the email message
const regMail = (recipientEmail) => {
  `from: mindbytetechies@gmail.com,
  to: ${recipientEmail},
  subject: 'Welcome to the Team!',
  text: We are glad to have you on board!,
  html: <p>Use the following link to login:</p><p><a href="http://localhost:3000/login">Start Investing</a></p>`;
};

const withdrawSuccess = (recipientEmail) => {
  `from: mindbytetechies@gmail.com,
  to: ${recipientEmail},
  subject: 'Welcome to the Team!',
  text: We are glad to have you on board!,
  html: <p>Use the following link to login:</p><p><a href="http://localhost:3000/login">Start Investing</a></p>`;
};

const sendEmail = async (recipientEmail) => {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    }
  });

  // Send the email
  try {
    await transporter.sendMail(regMail(recipientEmail), (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent successfully:', info.response);
      }
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }
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

app.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, username, country, password, referee } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
    }

    const user = new User({ name, email, username, country, password: hashedPassword, referee });
    await user.save();
    sendEmail(user.email);
    res.status(201).send({ message: 'User registered successfully' });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).send({ message: 'Check your username. Minimum length is 6' });
    } else {
      console.error(error);
    res.status(500).send({ error: 'Registration failed' });}
  }
});

app.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    });
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ error: 'Invalid password' });
    }
    const token = jwt.sign({ userId: user._id
    }, process.env.SECRET_KEY, { expiresIn: '24h' });
    res.send({ token, userInfo: user});
  } catch (error) {
    if (res.status(500).json) {
      return res.status(500).json({ error: 'Login failed' });
    }
    res.status(404).json({ error: 'Resource Not Found' });
  }
});

app.post('/invest', verifyJWT, async (req, res) => {
  try {
    const { planName, principalAmount, interestRate, period } = req.body;
    if (!req.user) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    const user = await User.findById(req.user);

    const userWallet = await Wallet.findOne({ userId: user._id });

    let balance = userWallet.balance;

    if (balance < principalAmount) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }

    balance -= principalAmount;
    await userWallet.save();

    const investment = new Investment({ planName, principalAmount, interestRate, period, userId: req.user});
    await investment.save();

    await Transaction.create({ userId: req.user, type: `Investment - ${planName}`, amount: principalAmount, status: 'Pending' });

    setTimeout(async () => {
      const investmentRecord = await Investment.findById({userId: user._id});

      investmentRecord.earnings += earnings + principalAmount;

      balance += investmentRecord.earnings;
      await userWallet.save();

      investmentRecord.status = 'Completed';
      await investmentRecord.save();
    }, period * 1000 * 60 * 60);

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

    const wallet = await Wallet.findOne({userId: user._id})

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    res.status(200).json({ balance: wallet.balances, totalBalance: wallet.totalBalance});
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
    console.log(result);
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

    const { currency, amount } = req.body;

    const wallet = await Wallet.findOne({ userId: req.user });

    if (!wallet.balances[currency] || wallet.balances[currency] < amount) {
      await Transaction.create({ userId: req.user, type: 'Withdrawal', amount, status: 'Failed' });
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await Withdrawal.create({ currency, amount, userId: req.user });

    wallet.balances[currency] -= amount;
    wallet.totalBalance -= amount;
    await wallet.save();

    await Transaction.create({ userId: req.user, type: 'Withdrawal', amount, status: 'Completed' });

    return res.status(200).json({ message: 'Withdrawal successful', wallet });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return res.status(500).json({ error: 'Withdrawal failed' });
  }
});

app.get('/transactions', async (req, res) => {
  const { userId } = req.user;

  try {
    const user = await User.findById(userId).populate('transactions');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const transactions = user.transactions;

    return res.status(200).json({ transactions });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

app.post('/referral', async (req, res) => {
  const { referralCode } = req.body;
  const { userId } = req.user;

  try {
    const referee = await User.findById(userId);
    if (!referee) {
      return res.status(404).json({ error: 'User not found' });
    }

    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return res.status(400).json({ error: 'Invalid referral code' });
    }

    if (!referee.firstDepositAmount) {
      return res.status(400).json({ error: 'Referee has not made a deposit yet' });
    }

    const referralBonusAmount = referee.deposits[0] * 0.1;

    referee.wallet.totalBalance += referralBonusAmount;
    referrer.wallet.totalBalance += referralBonusAmount;

    await referee.wallet.save();
    await referrer.wallet.save();

    return res.status(200).json({ message: 'Referral bonus credited successfully' });
  } catch (error) {
    console.error('Referral error:', error);
    return res.status(500).json({ error: 'Referral failed' });
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