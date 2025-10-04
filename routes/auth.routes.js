const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabaseClient'); // Import the supabase client
const auth = require('../middlewares/auth');

const router = express.Router();

// Helper function to sign JWT token
const signToken = (user) =>
  jwt.sign(
    { email: user.email, role: user.role || 'user' },
    process.env.JWT_SECRET,
    { subject: user.id.toString(), expiresIn: process.env.JWT_EXPIRES || '7d' }
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

    // Check if email exists in Supabase
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    //console.log("Existing User:", existingUser)
    //console.log("Error:", error);
    
    if (existingUser) {
        return res.conflict('Email sudah terdaftar');
    } else {
        // Insert new user into Supabase
        const createUser = await supabase
          .from('users')
          .insert({ name, email, password });
        //console.log("User:", createUser);
        return res.created({},"Register berhasil");
    }
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
    
    // Find user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, password')
      .eq('email', email)
      .single();

    if (error || !user) return res.badRequest('Email atau password salah');

    // Check password (you should hash the password for production)
    if (user.password !== password) return res.badRequest('Email atau password salah');

    const token = signToken(user);
    return res.ok({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }
);

// Me (Get logged-in user info)
router.get('/me', auth, async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('id', req.user.id)
    .single();

  if (error || !user) return res.notFound();
  return res.ok(user);
});

module.exports = router;
