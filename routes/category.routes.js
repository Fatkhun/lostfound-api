const express = require('express');
const supabase = require('../config/supabaseClient');
const auth = require('../middlewares/auth');

const router = express.Router();

// Create category
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Insert category into Supabase
    const { data, error } = await supabase
      .from('categories')
      .insert({ name });

    if (error) return res.badRequest(error.message);
    return res.created({},"Berhasil buat kategori");
  } catch (e) {
    return res.badRequest(e.message);
  }
});

// List categories
router.get('/', async (_req, res) => {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .order('id', { ascending: true });

  if (error) return res.error(error.message);
  return res.ok(categories);
});

// Category details
router.get('/:id', async (req, res) => {
  const { data: category, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !category) return res.notFound();
  return res.ok(category);
});

// Update category
router.patch('/:id', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    const { data: updatedCategory, error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', req.params.id)
      .single();

    if (error || !updatedCategory) return res.notFound();
    return res.ok(updatedCategory, 'UPDATED');
  } catch (e) {
    return res.badRequest(e.message);
  }
});

// Delete category
router.delete('/:id', auth, async (req, res) => {
  const { data: deleted, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', req.params.id);

  if (error || !deleted) return res.notFound();
  return res.ok({ message: 'Deleted' }, 'DELETED');
});

module.exports = router;
