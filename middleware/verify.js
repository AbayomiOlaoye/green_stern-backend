require('dotenv').config();
const jwt = require('jsonwebtoken');

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(res, req);
    return res.status(401).json({ error: 'Unauthorized access' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded.userId;
    next();
  } catch (error) {
    console.log(error, token);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = verifyJWT;
