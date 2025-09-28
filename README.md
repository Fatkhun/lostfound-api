# Lost & Found API (Express + MongoDB)

Minimal backend untuk memposting barang **hilang/ketemu** dengan foto, kategori, dan kontak (WA/sosmed), lengkap autentikasi email+password (JWT). Siap dihubungkan dari Android.

## Quick Start

```bash
cp .env.example .env
# edit MONGODB_URI / BASE_URL / JWT_SECRET jika perlu
npm install
node server.js
```

- Default: API berjalan di `http://localhost:3000` (dari emulator Android gunakan `http://10.0.2.2:3000`).
- Foto statik tersedia di `/uploads/...`

## Endpoints

### Auth
- `POST /api/auth/register` `{ name?, email, password }`
- `POST /api/auth/login` `{ email, password }`
- `GET  /api/auth/me` (Bearer token)

### Categories
- `POST   /api/categories` (auth)
- `GET    /api/categories`
- `GET    /api/categories/:id`
- `PATCH  /api/categories/:id` (auth)
- `DELETE /api/categories/:id` (auth)

### Items
- `POST   /api/items` (auth, multipart/form-data)
  - fields: `categoryId`, `type=lost|found`, `name`, `description?`, `contactType`, `contactValue`, `photo(file)?`
- `GET    /api/items` (query: `q`, `categoryId`, `status=open|claimed`, `type=lost|found`)
- `GET    /api/items/:id`
- `PATCH  /api/items/:id` (auth, multipart optional)
- `DELETE /api/items/:id` (auth, owner/admin)

## Notes
- Field `type` = `lost` atau `found` (karakter posting).
- Field `status` = `open` atau `claimed` (progres/penyelesaian).
