const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) =>
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname).toLowerCase())
});

function fileFilter(_req, file, cb) {
  const ok = /\.(jpe?g|png|webp)$/i.test(file.originalname);
  ok ? cb(null, true) : cb(new Error('Only jpg/jpeg/png/webp allowed'));
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 3 * 1024 * 1024 } }); // 3MB
module.exports = { upload };
