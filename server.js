require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const itemRoutes = require('./routes/item.routes');
const response = require('./middlewares/response');

const app = express();

// CORS
app.use(cors({ origin: true, credentials: false }));

// Logger & parsers
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(response);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/items', itemRoutes);

// 404
app.use((req, res, next) => {
  if (res.headersSent) return next();
  return res.notFound();
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  // kalau error punya statusCode
  const code = err.statusCode || 500;
  const msg  = err.message || 'INTERNAL_SERVER_ERROR';
  const data = err.data || {};
  return res.error(msg, data, code);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
