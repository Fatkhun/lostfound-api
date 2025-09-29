const { Schema, model, Types } = require('mongoose');

const itemSchema = new Schema({
  category: { type: Types.ObjectId, ref: 'Category', required: true },
  type: { type: String, enum: ['lost','found'], default: 'lost', index: true }, // lost=hilang, found=ditemukan
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  photoUrl: { type: String },
  contact: {
    type: { type: String, enum: ['whatsapp','telegram'], required: true },
    value: { type: String, required: true, trim: true }
  },
  status: { type: String, enum: ['open','claimed'], default: 'open' },
  owner: { type: Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = model('Item', itemSchema);
