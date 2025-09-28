const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role || 'user' };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
