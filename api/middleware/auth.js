const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vibe-manga-secret-key-2026');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Phiên đăng nhập hết hạn.' });
  }
};

module.exports = auth;
