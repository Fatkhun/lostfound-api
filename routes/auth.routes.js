const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middlewares/auth');

const router = express.Router();

const signToken = (user) =>
  jwt.sign(
    { email: user.email, role: user.role || 'user' },
    process.env.JWT_SECRET,
    { subject: user._id.toString(), expiresIn: process.env.JWT_EXPIRES || '7d' }
  );

// Register
router.post('/register',
  [
    body('email').isEmail().withMessage('Email tidak valid'),
    body('password').isLength({ min: 6 }).withMessage('Min 6 karakter'),
    body('name').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.badRequest('Lengkapi data terlebih dahulu');

    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.conflict('Email sudah terdaftar');

    const user = await User.create({ name, email, password });
    const token = signToken(user);
    return res.created({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  }
);

// Login
router.post('/login',
  [
    body('email').isEmail(),
    body('password').isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.badRequest("Email atau password tidak valid");

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.badRequest('Email atau password salah');

    const ok = await user.comparePassword(password);
    if (!ok) return res.badRequest('Email atau password salah');

    const token = signToken(user);
    return res.ok({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  }
);

// Me
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.notFound();
  return res.ok(user);
});

module.exports = router;
