require('dotenv').config();
const express = require('express');
const app = express();
const bcrypt = require('bcryptjs');
// const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');
const User = require('./model/user');
const Investment = require('./model/investment');
const Wallet = require('./model/wallet');
const Deposit = require('./model/deposit');
const PORT = process.env.PORT || 3000;
const cors = require('cors');

app.use(cors(
  {
    origin: 'http://localhost:3000',
    credentials: true
  }
));

app.use(express.json());
require('./database/db');

app.post('Register', async (req, res) => {
  try {
    const { name, email, username, country, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, username, country, password: hashedPassword });
    await user.save();
    res.status(201).send({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Registration failed' });
  }
});

app.post('Login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ error: 'Invalid password' });
    }
    const token = jwt.sign({ email
    }, process.env.SECRET_KEY, { expiresIn: '1h' });
    res.send({ token });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Login failed' });
  }
});

app.post('investment', async (req, res) => {
  try {
    const { planName, principalAmount, interestRate, period } = req.body;
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.userId;

    const userWallet = await Wallet.findOne({ user: userId });

    if (userWallet.balance < principalAmount) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }

    userWallet.balance -= principalAmount;
    await userWallet.save();

    const investment = new Investment({ userId, planName, principalAmount, interestRate, period });
    await investment.save();

    setTimeout(async () => {
      const investmentRecord = await Investment.findById(investment._id);

      userWallet.balance += investmentRecord.earnings;
      await userWallet.save();

      investmentRecord.status = 'Completed';
      await investmentRecord.save();
    }, period * 1000 * 60 * 60);

      res.status(201).send({ message: 'Investment added successfully', investment });
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: 'Investment creation failed' });
    }
  }
);

app.get('/wallet', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.userId;

    const wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    res.status(200).json({ balance: wallet.balance });
  } catch (error) {
    console.error('Error retrieving wallet balance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/deposit', async (req, res) => {
  try {
    // const token = req.headers.authorization.split(' ')[1];
    // const decoded = jwt.verify(token, process.env.SECRET_KEY);
    // const userId = decoded.userId;
    const { userId, currency, amount } = req.body;

    if (!userId || !currency || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deposit = new CryptocurrencyDeposit({
      user: userId,
      currency,
      amount,
      status: 'pending'
    });
    await deposit.save();

    return res.status(201).json({ message: 'Cryptocurrency deposit initiated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/withdrawal', async (req, res) => {
  // const token = req.headers.authorization.split(' ')[1];
  // const decoded = jwt.verify(token, process.env.SECRET_KEY);
  // const userId = decoded.userId;
  const { currency, amount } = req.body;
  const { userId } = req.user;

  try {
    const user = await User.findById(userId).populate('wallet');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { wallet } = user;
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found for user' });
    }

    if (!wallet.balances[currency] || wallet.balances[currency] < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Simulate withdrawal transaction
    wallet.balances[currency] -= amount;
    wallet.totalBalance -= amount;
    await wallet.save();

    return res.status(200).json({ message: 'Withdrawal successful', wallet });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return res.status(500).json({ error: 'Withdrawal failed' });
  }
});

// app.post('/reviews', async (req, res) => {
//   try {
//     const { name, title, rating, comment } = req.body;
//     const token = req.headers.authorization.split(' ')[1];
//     const decoded = jwt.verify(token, process.env.SECRET_KEY);
//     const userId = decoded.userId;
//     const review = new Review({ name, userId, title, rating, comment });
//     await review.save();
//     res.status(201).send({ message: 'Review added successfully', review });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ error: 'Review creation failed' });
//   }
// });

// app.get('/reviews', async (req, res) => {
//   try {
//     const reviews = await Review.find();
//     res.json(reviews);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Server Error');
//   }
// });

// cloudinary.config({
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.CLOUD_API_KEY,
//   api_secret: process.env.CLOUD_API_SECRET,
// });

// cloudinary.uploader.upload("./images/main_hero.jpg",
//   { public_id: "hero_image" }, 
//   function(error, result) {console.log(result); });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});