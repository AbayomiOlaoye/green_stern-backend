require('dotenv').config();
const express = require('express');
const app = express();
const bcrypt = require('bcryptjs');
// const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');
const User = require('./Model/user');
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