const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mits-rtb-secret-key-2024';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

function generateToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { authenticateToken, generateToken };
