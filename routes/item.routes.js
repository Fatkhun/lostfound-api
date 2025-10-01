const express = require('express');
const mongoose = require('mongoose');
const Item = require('../models/Item');
const Category = require('../models/Category');
const { upload } = require('../middlewares/upload');
const auth = require('../middlewares/auth');

const router = express.Router();

const ALLOWED_TYPES = ['lost', 'found'];
const ALLOWED_CONTACTS = ['whatsapp', 'instagram', 'telegram', 'line', 'other'];

/* =========================
   LIST + FILTER + PAGINATION
   GET /api/items?q=&categoryId=&status=&type=&limit=&offset=
========================= */
router.get('/', async (req, res) => {
  try {
    const { q, categoryId, status, type } = req.query;

    // pagination
    let { offset = '0', limit = '20' } = req.query;
    offset = parseInt(offset, 10); if (Number.isNaN(offset) || offset < 0) offset = 0;
    limit  = parseInt(limit, 10);  if (Number.isNaN(limit)  || limit <= 0) limit = 20;
    if (limit > 100) limit = 100;

    // filter
    const filter = {};
    if (categoryId) filter.category = categoryId;
    if (status)     filter.status   = status;
    if (type && ALLOWED_TYPES.includes(String(type).toLowerCase())) {
      filter.type = String(type).toLowerCase();
    }
    if (q) {
      filter.$or = [
        { name:        { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Item.find(filter)
        .populate('category', 'name')
        .populate('owner', 'name email')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Item.countDocuments(filter),
    ]);

    return res.ok({
      items,
      pagination: {
        offset,
        limit,
        total,
        hasMore: offset + items.length < total,
      }
    });
  } catch (e) {
    return res.error(e.message);
  }
});

/* =========================
   HISTORY MILIK USER (AUTH)
   GET /api/items/history?q=&categoryId=&status=&type=&limit=&offset=
========================= */
router.get('/history', auth, async (req, res) => {
  try {
    const { q, categoryId, status, type } = req.query;

    // pagination
    let { offset = '0', limit = '20' } = req.query;
    offset = parseInt(offset, 10); if (Number.isNaN(offset) || offset < 0) offset = 0;
    limit  = parseInt(limit, 10);  if (Number.isNaN(limit)  || limit <= 0) limit = 20;
    if (limit > 100) limit = 100;

    // filter (dibatasi ke owner = user yang login)
    const filter = { owner: req.user.id };
    if (categoryId) filter.category = categoryId;
    if (status && ['open','claimed'].includes(String(status).toLowerCase())) {
      filter.status = String(status).toLowerCase();
    }
    if (type && ['lost','found'].includes(String(type).toLowerCase())) {
      filter.type = String(type).toLowerCase();
    }
    if (q) {
      filter.$or = [
        { name:        { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Item.find(filter)
        .populate('category', 'name')
        .populate('owner', 'name email')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Item.countDocuments(filter),
    ]);

    return res.ok({
      items,
      pagination: {
        offset,
        limit,
        total,
        hasMore: offset + items.length < total,
      }
    });
  } catch (e) {
    return res.error(e.message);
  }
});


/* =========================
   DETAIL
   GET /api/items/:id
========================= */
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.badRequest('INVALID_ID');
    const doc = await Item.findById(req.params.id).populate('category', 'name').populate('owner', 'name email');
    if (!doc) return res.notFound();
    return res.ok(doc);
  } catch (e) {
    return res.error(e.message);
  }
});

/* =========================
   CREATE (MULTIPART)
   POST /api/items
========================= */
router.post('/', auth, upload.single('photo'), async (req, res) => {
  try {
    const { categoryId, type, name, description, contactType, contactValue } = req.body;

    if (!categoryId || !mongoose.isValidObjectId(categoryId))
      return res.badRequest('INVALID_CATEGORY_ID');
    if (!name) return res.badRequest('NAME_REQUIRED');
    if (!contactType || !ALLOWED_CONTACTS.includes(String(contactType).toLowerCase()))
      return res.badRequest('CONTACT_TYPE_INVALID');
    if (!contactValue) return res.badRequest('CONTACT_VALUE_REQUIRED');

    const cat = await Category.findById(categoryId);
    if (!cat) return res.badRequest('Category not found');

    const kind = (type || 'lost').toLowerCase();
    if (!ALLOWED_TYPES.includes(kind)) return res.badRequest('type must be "lost" or "found"');

    const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const photoUrl = req.file ? `${base}/uploads/${req.file.filename}` : undefined;

    const doc = await Item.create({
      category: categoryId,
      type: kind,
      name,
      description,
      photoUrl,
      contact: { type: contactType, value: contactValue },
      owner: req.user.id
    });

    return res.created(doc);
  } catch (e) {
    return res.badRequest(e.message);
  }
});

/* =========================
   UPDATE (MULTIPART OPTIONAL)
   PATCH /api/items/:id
========================= */
router.patch('/:id', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.badRequest('INVALID_ID');

    const current = await Item.findById(req.params.id);
    if (!current) return res.notFound();
    if (current.owner && current.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.forbidden();
    }

    const update = {};
    const { name, description, categoryId, contactType, contactValue, status, type } = req.body;

    if (name) update.name = name;
    if (description) update.description = description;
    if (categoryId) {
      if (!mongoose.isValidObjectId(categoryId)) return res.badRequest('INVALID_CATEGORY_ID');
      update.category = categoryId;
    }
    if (contactType || contactValue) {
      if (contactType && !ALLOWED_CONTACTS.includes(String(contactType).toLowerCase()))
        return res.badRequest('CONTACT_TYPE_INVALID');
      update.contact = {
        type:  contactType || current.contact.type,
        value: contactValue || current.contact.value
      };
    }
    if (status) update.status = status;
    if (type) {
      const kind = String(type).toLowerCase();
      if (!ALLOWED_TYPES.includes(kind)) return res.badRequest('type must be "lost" or "found"');
      update.type = kind;
    }
    if (req.file) {
      const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      update.photoUrl = `${base}/uploads/${req.file.filename}`;
    }

    const doc = await Item.findByIdAndUpdate(req.params.id, update, { new: true });
    return res.ok(doc, 'UPDATED');
  } catch (e) {
    return res.badRequest(e.message);
  }
});

/* =========================
   DELETE
   DELETE /api/items/:id
========================= */
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.badRequest('INVALID_ID');
    const current = await Item.findById(req.params.id);
    if (!current) return res.notFound();
    if (current.owner && current.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.forbidden();
    }
    await current.deleteOne();
    return res.ok({ id: req.params.id }, 'DELETED');
  } catch (e) {
    return res.error(e.message);
  }
});

module.exports = router;
