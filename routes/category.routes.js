const express = require('express');
const Category = require('../models/Category');
const auth = require('../middlewares/auth');

const router = express.Router();

// Create
router.post('/', auth, async (req, res) => {
  try {
    const doc = await Category.create({ name: req.body.name });
    return res.created(doc);
  } catch (e) {
    return res.badRequest(e.message);
  }
});

// List
router.get('/', async (_req, res) => {
  const list = await Category.find().sort({ name: 1 });
  return res.ok(list);
});

// Detail
router.get('/:id', async (req, res) => {
  const doc = await Category.findById(req.params.id);
  if (!doc) return res.notFound();
  return res.ok(doc);
});

// Update
router.patch('/:id', auth, async (req, res) => {
  try {
    const doc = await Category.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
    if (!doc) return res.notFound();
    return res.ok(doc, 'UPDATED');
  } catch (e) {
    return res.badRequest(e.message);
  }
});

// Delete
router.delete('/:id', auth, async (req, res) => {
  const out = await Category.findByIdAndDelete(req.params.id);
  if (!out) return res.notFound();
  return res.ok({ message: 'Deleted' }, 'DELETED');
});

module.exports = router;
