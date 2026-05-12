# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a Node.js + Express + SQLite single-page application (SPA) for contact management. The app uses a simple MVC pattern with no frontend framework - all client-side logic is in vanilla JavaScript (`public/js/app.js`).

### Key Architectural Decisions

**1. Database-First Design**
- The database schema is defined once in `src/db/database.js` via SQL `CREATE TABLE IF NOT EXISTS` statements
- All models are implicit - there's no ORM; raw SQLite queries using `better-sqlite3`
- Foreign keys use CASCADE delete for contacts→contact_categories and categories→contact_categories
- The database file is auto-created on first run at `data/contacts.db`

**2. Controller Pattern (No Model Separation)**
- Controllers in `src/controllers/` handle all business logic
- Each controller method directly interacts with the database via `db.prepare().run()` or `.all()`
- Categories are created automatically if not found when adding to contacts
- All CRUD operations are centralized in controllers (no mixed routing/controller logic)

**3. Import/Export Implementation Details**
- CSV import: File parsed line-by-line, categories auto-created with default green color (#70ad47)
- VCF import: Uses custom `parseVCF()` function (not exported from parser.js - inline in routes/api.js)
- Export to XLSX: Uses SheetJS (`xlsx` package) - data transformed into workbook before export
- After imports, uploaded files are deleted immediately with `fs.unlinkSync()`

**4. Frontend Navigation (SPA Pattern)**
- Single `public/index.html` serves all "pages" via fragment navigation (#dashboard, #contacts, etc.)
- `public/js/app.js` handles routing - hides/shows sections based on URL hash
- Search is global and instant - updates results on any page without API calls

### File Structure Summary

```
src/
├── db/                    # Database layer (single source of truth for schema)
│   ├── database.js       # Schema definition + singleton db instance export
│   └── parser.js         # Not currently used - VCF parsing is inline in api.js
├── middleware/           # Express middlewares
│   └── auth.js           # Simple session-based auth (unused in current version)
├── controllers/          # Business logic for all endpoints
│   ├── contactController.js    # CRUD + search/filter + merge operations
│   └── configController.js     # Site configuration + stats endpoints
├── routes/               # HTTP routing
│   ├── index.js         # SPA route definitions (GET /, specific hashes)
│   └── api.js           # All API endpoints including multipart uploads
public/
├── css/style.css         # All styling in a single file
├── js/app.js             # Single-file SPA logic with routing + event handlers
└── index.html            # Full page template with all sections inline
data/
├── contacts.db           # SQLite database (auto-created)
└── uploads/              # Temporary location for imported files
```

### API Endpoints Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/contacts` | List all contacts with categories |
| GET | `/api/contacts/:id` | Get single contact by ID |
| POST | `/api/contacts` | Create contact (categories auto-created if missing) |
| PUT | `/api/contacts/:id` | Update contact + sync categories |
| DELETE | `/api/contacts/:id` | Delete contact (CASCADE removes related records) |
| POST | `/api/contacts/:id1/merge/:id2` | Merge two contacts, keep ID2 data |
| GET | `/api/contacts/search?q={term}` | Fuzzy search across all fields |
| GET | `/api/contacts/filter/email?email={e}` | Filter by email substring |
| GET | `/api/contacts/filter/phone?phone={p}` | Filter by phone substring |
| GET | `/api/contacts/filter/organisation?org={o}` | Filter by org substring |
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category name/color |
| DELETE | `/api/categories/:id` | Delete category (CASCADE removes associations) |
| POST | `/api/import/csv` | Import CSV file (multipart/form-data) |
| POST | `/api/import/vcf` | Import VCF file (multipart/form-data) |
| POST | `/api/export/csv?ids={comma-separated}` | Export to CSV |
| POST | `/api/export/vcf?ids={comma-separated}` | Export to VCF |
| POST | `/api/export/xlsx?ids={comma-separated}` | Export to Excel |
| GET | `/api/config` | Get all site configuration |
| PUT | `/api/config/:key` | Update configuration value |
| GET | `/api/stats` | Get contact/category counts + last created contact |

### Important Implementation Notes

**Database Initialization**: The `db` singleton in `database.js` creates tables on startup. It's safe to delete `data/contacts.db` - the schema will be recreated automatically.

**Category Management**: When creating/updating a contact, categories are passed as an array of objects with `{ nom, couleur }`. If `couleur` is omitted, a random color is generated using `getRandomColor()`.

**Text Normalization for Categories**: Category names are normalized via `normalizeText()` which removes accents and converts to uppercase (e.g., "Client VIP" → "CLIENT VIP"). This prevents duplicates from accented variants.

**CSV Import Limitation**: The CSV import in `api.js` uses a simplified parsing that assumes comma-separated values without proper quoting handling. For complex CSV files with quoted fields, consider using the `papaparse` package instead.

**VCF Handling**: Uses **`vcard-parser`** (package.json line 14) for VCF import via `src/routes/api.js` line 7 (`const vcardParser = require('vcard-parser')`). Import handler at line ~200 converts VCF to contacts. Export VCF uses custom string concatenation approach (line ~300) - no external library required for export.

**Error Handling Pattern**: All controller methods follow the same error handling pattern: try/catch with logging to console.error, then returning JSON error responses with `success: false` and descriptive messages.

**Frontend Event Delegation**: Most event handlers in `public/js/app.js` use delegation on parent containers (e.g., binding delete events to `.delete-btn` inside the contacts list) rather than direct element listeners.

## Commands for Development

**Start development server with auto-reload:**
```bash
npm run dev
```

**Start production server:**
```bash
npm start
```

**Install dependencies:**
```bash
npm install
```

**Run a single test file (if tests exist):**
```bash
npm test -- path/to/your-test.js
```

## Security Notes

- File uploads are limited to 10MB via Multer configuration
- Allowed file types: images, PDF, CSV, XLSX only
- SQLite uses prepared statements for all queries - SQL injection not possible
- No authentication system implemented yet - treat as single-user app
