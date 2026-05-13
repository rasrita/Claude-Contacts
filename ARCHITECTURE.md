# DOCUMENTATION ARCHITECTURE - MES CONTACTS

## 🏗️ Vue d'ensemble de l'Architecture du Projet

L'application "Mes Contacts" est une **Single Page Application (SPA)** construite avec un modèle MVC simplifié, utilisant Node.js/Express pour le backend et JavaScript vanilla pour le frontend.

### Stack Technique Complète

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Runtime** | Node.js 18+ | Runtime JavaScript serveur |
| **Framework Web** | Express.js v4.x | Framework serveur REST API + serveurs SPA |
| **Base de données** | SQLite3 (better-sqlite3) | Stockage persistant des données contacts |
| **Serveur de développement** | nodemon | Auto-reload lors de modifications du code |
| **Frontend** | JavaScript vanilla, HTML5, CSS3 | Aucune dépendance framework JS requis |
| **Uploads** | Multer (Express middleware) | Gestion multipart/form-data pour fichiers CSV/VCX/XLSX |
| **Sessions** | express-session + memorystore | Stockage temporaire des sessions utilisateurs |
| **Parsers Fichiers** | csv-stringify, node-vcf, xlsx | Import/export multi-formats (CSV, VCF, Excel) |

---

## 📂 Structure Détaillée du Projet

### Arborescence complète des fichiers et dossiers

```
G:\Claude-Contacts\
├── .git/                           # Répertoire de contrôle de version Git
│   ├── config                     # Configuration Git locale
│   ├── objects/                   # Objets commit/tag
│   └── ...
│
├── data/                          # DONNEES PERSISTANTES
│   ├── contacts.db                # Fichier SQLite (auto-créé)
│   └── uploads/                   # Fichiers import temporairement stockés
│       ├── upload-1234567890.csv  # CSV uploadé temporaire
│       └── upload-abcdef123.vcf   # VCF uploadé temporaire
│
├── public/                        # FRONTEND (SPA)
│   ├── css/
│   │   └── style.css              # Tous les styles CSS (CSS pur, pas préprocesseur)
│   ├── js/
│   │   └── app.js                 # Logique frontend complète (routing, événements)
│   └── index.html                 # Template HTML avec toutes les vues en ligne
│
├── src/                          # BACKEND LOGIQUE
│   ├── db/                        # Couche données / accès base de données
│   │   ├── database.js            # Schéma SQL + instance singleton SQLite
│   │   └── parser.js              # Module parser vCard (utilisé pour VCF)
│   ├── middleware/                # Express middlewares personnalisés
│   │   └── auth.js                # Authentification session (non implémentée actuellement)
│   ├── controllers/               # Logique métier / traitement requêtes
│   │   ├── contactController.js   # CRUD contacts + recherche/filtre/fusion
│   │   └── configController.js    # Configuration site + statistiques
│   ├── routes/                    # Routage HTTP Express
│   │   ├── index.js               # Routes SPA principales (/, /#contacts, etc.)
│   │   └── api.js                 # Toutes les API endpoints (REST)
│   └── server.js                  # Fichier entrée point (app.listen)
│
├── .gitignore                     # Fichiers ignorés par Git (.env, data/, node_modules/)
├── package.json                   # Dépendances npm + scripts de développement
├── README.md                      # Documentation principale du projet
├── API.md                         # Documentation complète des endpoints REST
├── DATABASE.md                    # Schéma SQL détaillé des tables
├── DOCUMENTATION.md                # Documentation générale complète
├── ARCHITECTURE.md                # Architecture technique (cette page)
└── TROUBLESHOOTING.md             # Guide de résolution de problèmes

```

---

## 🔄 Architecture Backend (Couche Serveur)

### 1. Fichier d'entrée point - `src/server.js`

Ce fichier initialise l'application Express et lance le serveur HTTP :

```javascript
const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const cookieParser = require('cookie-parser');
const path = require('path');

// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session avec MemoryStore
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: true,
    store: new MemoryStore({ checkPeriod: 86400000 }) // Clean up tous les 24h
}));

app.use(cookieParser());

// Import des routeurs
require('./routes/index.js')(app);   // Routes SPA principales
require('./routes/api.js')(app);     // Routes API REST
require('./db/database.js');         // Initialisation de la base SQLite

// Serveur HTTP
const server = app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

module.exports = { app, server };
```

---

### 2. Couche Base de Données - `src/db/database.js`

Ce fichier définit le schéma SQL et crée l'instance singleton de base SQLite :

```javascript
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Chemin absolu vers la base de données (dossier data/)
const databasePath = path.join(__dirname, '..', 'data', 'contacts.db');

// Vérification du dossier de données + création s'il n'existe pas
if (!fs.existsSync(path.dirname(databasePath))) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

// Initialisation singleton base SQLite
const db = new Database(databasePath, {
    fileMustExist: false, // Créer automatiquement si inexistant (schéma)
    readonly: false       // Mode écriture activé par défaut
});

// Schéma complet de la base de données (CREATE TABLE IF NOT EXISTS)
db.exec(`
-- Table contacts principaux
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    titre VARCHAR(10),
    prenom_honneur_prefix VARCHAR(20),
    prenom_honneur_suffix VARCHAR(20),
    surnom VARCHAR(50),
    email VARCHAR(100),
    telephone VARCHAR(30),
    organisation VARCHAR(100),
    adresse TEXT,
    code_postal VARCHAR(20),
    pays VARCHAR(50),
    ville VARCHAR(100),
    region VARCHAR(100),
    anniversaire DATE,
    conjoint VARCHAR(100),
    tags TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table catégories personnalisables
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom VARCHAR(50) NOT NULL,
    couleur VARCHAR(8) NOT NULL
);

-- Table de jointure contact_categories (N:1)
CREATE TABLE IF NOT EXISTS contact_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(contact_id, category_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_categories_nom ON categories(nom);

-- Insérer catégories par défaut si vide
INSERT OR IGNORE INTO categories (nom, couleur) VALUES ('CLIENT', '#70ad47');
INSERT OR IGNORE INTO categories (nom, couleur) VALUES ('FAMILLE', '#ea4335');
INSERT OR IGNORE INTO categories (nom, couleur) VALUES ('AMIS', '#4caf50');
INSERT OR IGNORE INTO categories (nom, couleur) VALUES ('PRIORITAIRE', '#ff9900');
`);

// Export singleton db accessible via require
module.exports = db;
```

---

### 3. Contrôleurs - Logique Métier

Le code métier est **séparé par contrôleur** dans `src/controllers/`. Chaque contrôleur encapsule la logique d'un domaine spécifique :

#### `src/controllers/contactController.js`

Gère toutes les opérations CRUD sur les contacts + recherche/filtre :

```javascript
const db = require('../db/database.js'); // Singleton SQLite

// ✅ GET /api/contacts?page=1&limit=10 - Liste paginée de contacts
exports.getContacts = function(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Requête SQL avec pagination + catégorie JSON concaténée
    const stmt = db.prepare(`
        SELECT 
            c.*,
            GROUP_CONCAT(cc.nom || ' (' || ca.couleur || ')', ';') as categories_json
        FROM contacts c
        LEFT JOIN contact_categories cc ON c.id = cc.contact_id
        LEFT JOIN categories ca ON cc.category_id = ca.id
        ORDER BY c.id DESC
        LIMIT ? OFFSET ?
    `);
    
    const results = stmt.all(limit, offset);
    
    // Comptage total pour pagination metadata
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM contacts');
    const totalCount = countStmt.get().count;
    
    res.json({
        success: true,
        data: results,
        pagination: {
            current_page: page,
            per_page: limit,
            total_items: totalCount,
            total_pages: Math.ceil(totalCount / limit)
        }
    });
};

// ✅ POST /api/contacts - Création d'un nouveau contact
exports.createContact = function(req, res) {
    try {
        const contactData = req.body;
        
        // Normalisation du champ tags vers colonnes individualisées
        if (contactData.tags && typeof contactData.tags === 'string') {
            const tagsArr = contactData.tags.split(';').filter(t => t.trim());
            
            for (const tag of tagsArr) {
                const normalizedTag = normalizeText(tag); // Sans accent, MAJUSCULES
                
                if (!tagExistsInContact(contactData.id, normalizedTag)) {
                    createOrUpdateCategory(normalizedTag); // Création automatique catégorie
                }
                
                associateContactWithCategory(contactData.id, normalizedTag);
            }
        }
        
        const stmtInsert = db.prepare(`
            INSERT INTO contacts (
                nom, prenom, titre, prenom_honneur_prefix, prenom_honneur_suffix,
                surnom, email, telephone, organisation, adresse, code_postal,
                pays, ville, region, anniversaire, conjoint, tags, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmtInsert.run({
            nom: contactData.nom,
            prenom: contactData.prenom,
            titre: contactData.titre || '',
            prenom_honneur_prefix: contactData.prenom_honneur_prefix || '',
            prenom_honneur_suffix: contactData.prenom_honneur_suffix || '',
            surnom: contactData.surnom || null,
            email: contactData.email || null,
            telephone: contactData.telephone || null,
            organisation: contactData.organisation || null,
            adresse: contactData.adresse || null,
            code_postal: contactData.code_postal || null,
            pays: contactData.pays || null,
            ville: contactData.ville || null,
            region: contactData.region || null,
            anniversaire: contactData.anniversaire || null,
            conjoint: contactData.conjoint || null,
            tags: contactData.tags || null,
            notes: contactData.notes || null
        });
        
        // Récupération du nouvel ID créé
        const newContact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
        
        res.status(201).json({
            success: true,
            message: "Contact créé avec succès",
            data: newContact
        });
        
    } catch (error) {
        console.error("Erreur createContact :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la création du contact"
        });
    }
};

// ✅ PUT /api/contacts/:id - Mise à jour d'un contact + synchronisation catégories
exports.updateContact = function(req, res) {
    const id = req.params.id;
    const updateData = req.body;
    
    // Mise à jour des champs principaux du contact
    const fieldsToUpdate = [
        'nom', 'prenom', 'titre', 'prenom_honneur_prefix', 'prenom_honneur_suffix',
        'surnom', 'email', 'telephone', 'organisation', 'adresse', 'code_postal',
        'pays', 'ville', 'region', 'anniversaire', 'conjoint', 'tags', 'notes'
    ];
    
    // Construction dynamique du WHERE clause pour UPDATE
    const updateClauses = fieldsToUpdate.map(field => {
        if (typeof updateData[field] === 'object') {
            return `${field} = ?`; // JSON objet → placeholder SQL
        } else if (updateData[field] !== undefined && updateData[field] !== null) {
            return `${field} = ?`;
        } else {
            return field; // Ne pas toucher si null/undefined dans body
        }
    }).join(', ');
    
    const values = fieldsToUpdate.map(field => {
        if (typeof updateData[field] === 'object') {
            return JSON.stringify(updateData[field]);
        } else if (updateData[field] !== undefined) {
            return updateData[field];
        } else {
            return null; // NULL pour champs optionnels non modifiés
        }
    });
    
    db.prepare(`
        UPDATE contacts
        SET ${updateClauses}
        WHERE id = ?
    `).run(id, ...values);
    
    // Synchronisation automatique des catégories (basée sur le champ tags)
    if (updateData.tags || true) { // Trier à synchroniser même si absent pour éviter erreurs de null
        const currentContact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
        
        deleteContactCategoriesByTags(currentContact.tags); // Nettoyer catégories obsolètes
        associateContactWithCategory(id, updateData.tags || ''); // Associer nouvelles catégories
        
        if (updateData.categories && Array.isArray(updateData.categories)) {
            for (const cat of updateData.categories) {
                const category = getCategoryByName(cat.nom);
                if (category) {
                    associateContactWithCategory(id, category.nom);
                }
            }
        }
    }
    
    // Retour du contact mis à jour complet
    const updatedContact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    
    res.json({
        success: true,
        message: "Contact mis à jour avec succès",
        data: updatedContact
    });
};

// ✅ DELETE /api/contacts/:id - Suppression cascade (contact + associations)
exports.deleteContact = function(req, res) {
    const id = req.params.id;
    
    db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
    console.log("Contact ID " + id + " supprimé avec CASCADE sur contact_categories");
    
    res.json({
        success: true,
        message: "Contact ID " + id + " supprimé avec succès",
        total_contacts_remaining: db.prepare('SELECT COUNT(*) as count FROM contacts').get().count - 1 // approximatif
    });
};

// ✅ GET /api/contacts/:id/merge/:id2 - Fusion de deux contacts (ID1 vers ID2)
exports.mergeContacts = function(req, res) {
    const id1 = req.params.id1;
    const id2 = req.params.id2;
    
    try {
        // 1. Récupérer les deux contacts
        const contact1 = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id1);
        const contact2 = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id2);
        
        if (!contact1 || !contact2) {
            throw new Error("Contact non trouvé");
        }
        
        console.log("Fusion du contact " + id1 + " vers le contact " + id2);
        
        // 2. Mettre à jour contact2 avec champs prioritaires de contact1 (si non-null)
        const fieldsToUpdate = [
            'nom', 'prenom', 'titre', 'prenom_honneur_prefix', 'prenom_honneur_suffix',
            'surnom', 'email', 'telephone', 'organisation', 'adresse', 'code_postal',
            'pays', 'ville', 'region', 'anniversaire', 'conjoint', 'tags', 'notes'
        ];
        
        const updateClauses = fieldsToUpdate.map(field => `COALESCE(?, ${field})`).join(', ');
        const values = [...fieldsToUpdate.flatMap(f => [contact1[f], contact2[f]]), id2];
        
        db.prepare(`
            UPDATE contacts SET ${updateClauses} WHERE id = ?
        `).run(...values);
        
        // 3. Fusion des catégories (par normalisation du nom tags)
        const categoriesStmt = db.prepare('DELETE FROM contact_categories WHERE contact_id = ?');
        categoriesStmt.run(id2);
        
        // Récupérer toutes les catégories existantes dans le premier contact
        for (const field of ['tags']) {
            if (contact1[field]) {
                const normalizedCats = extractCategoriesFromTags(contact1[field]);
                for (const catName of normalizedCats) {
                    const category = getCategoryByName(catName);
                    if (category) {
                        associateContactWithCategory(id2, category.nom);
                    }
                }
            }
        }
        
        // Récupérer toutes les catégories existantes dans le deuxième contact
        for (const field of ['tags']) {
            if (contact2[field]) {
                const normalizedCats = extractCategoriesFromTags(contact2[field]);
                for (const catName of normalizedCats) {
                    const category = getCategoryByName(catName);
                    if (category) {
                        associateContactWithCategory(id2, category.nom);
                    }
                }
            }
        }
        
        // 4. Retour du contact fusionné
        const mergedContact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id2);
        
        res.json({
            success: true,
            message: "Contacts fusionnés avec succès",
            data: {
                id1_merged: id1,
                id2_kept: id2,
                merged_data: mergedContact
            }
        });
        
    } catch (error) {
        console.error("Erreur mergeContacts :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la fusion des contacts"
        });
    }
};

// ✅ GET /api/contacts/search?q={term} - Recherche fuzzy globale (LIKE sur tous les champs)
exports.searchContacts = function(query) {
    try {
        // Requête SQL utilisant LIKE pour recherche case-insensitive
        const stmt = db.prepare(`
            SELECT 
                c.*,
                GROUP_CONCAT(cc.nom || ' (' || ca.couleur || ')', ';') as categories_json
            FROM contacts c
            LEFT JOIN contact_categories cc ON c.id = cc.contact_id
            LEFT JOIN categories ca ON cc.category_id = ca.id
            WHERE LOWER(c.nom) LIKE ? 
               OR LOWER(c.prenom) LIKE ?
               OR LOWER(c.email) LIKE ?
               OR LOWER(c.telephone) LIKE ?
               OR LOWER(c.organisation) LIKE ?
               OR LOWER(c.tags) LIKE ?
               OR LOWER(c.notes) LIKE ?
            ORDER BY c.id DESC
        `);
        
        // Paramètres de requête avec % pour recherche fuzzy (partielle)
        const searchTerm = '%' + query.toLowerCase() + '%';
        const results = stmt.all(
            searchTerm, searchTerm, searchTerm, searchTerm, 
            searchTerm, searchTerm, searchTerm
        );
        
        console.log("Recherche réussie : " + query);
        return results; // Tableau de résultats trouvés
        
    } catch (error) {
        console.error("Erreur dans searchContacts :", error);
        throw error;
    }
};

// ✅ GET /api/contacts/filter/email?email={e} - Filtrage par email (substring match)
exports.filterByEmail = function(email) {
    try {
        const stmt = db.prepare(`
            SELECT 
                c.*,
                GROUP_CONCAT(cc.nom || ' (' || ca.couleur || ')', ';') as categories_json
            FROM contacts c
            LEFT JOIN contact_categories cc ON c.id = cc.contact_id
            LEFT JOIN categories ca ON cc.category_id = ca.id
            WHERE LOWER(c.email) LIKE ?
            ORDER BY c.id DESC
        `);
        
        const results = stmt.all('%' + email.toLowerCase() + '%');
        return results;
    } catch (error) {
        console.error("Erreur dans filterByEmail :", error);
        throw error;
    }
};

// Méthodes de filtrage similaires pour telephone et organisation...
```

#### `src/controllers/configController.js`

Gère la configuration du site + statistiques :

```javascript
const db = require('../db/database.js');

// ✅ GET /api/config - Récupération complète des paramètres site
exports.getConfig = function(req, res) {
    try {
        // Lecture depuis config session (si configuré dans frontend)
        const sessionConfig = req.session.config || {};
        
        // Retour par défaut + données de session
        const defaultConfig = {
            site_name: "Mes Contacts",
            footer_text: "",
            show_email: true,
            show_telephone: true,
            show_organisation: true,
            max_contacts_per_page: 10,
            default_category_color: "#4285f4"
        };
        
        const mergedConfig = { ...defaultConfig, ...sessionConfig };
        
        console.log("GET /api/config : récupération de " + Object.keys(mergedConfig).length + " paramètres");
        
        res.json({
            success: true,
            data: mergedConfig
        });
        
    } catch (error) {
        console.error("Erreur dans getConfig :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la récupération de la configuration"
        });
    }
};

// ✅ PUT /api/config/:key - Mise à jour d'un paramètre unique
exports.updateConfig = function(req, res) {
    const key = req.params.key;
    const value = req.body.value; // Attend "value": true|false|string dans body
    
    try {
        console.log("Mise à jour config : clé '" + key + "' ← valeur '" + value + "'");
        
        // Mise à jour session (ou persistence fichier si implémenté)
        if (!req.session.config) {
            req.session.config = {};
        }
        req.session.config[key] = value;
        
        res.json({
            success: true,
            message: key + " mis à jour à " + String(value),
            data: {
                key: key,
                value: value
            }
        });
        
    } catch (error) {
        console.error("Erreur dans updateConfig :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour de la configuration"
        });
    }
};

// ✅ GET /api/stats - Statistiques globales (compteurs contacts + dernières créations)
exports.getStats = function() {
    try {
        // Compteur total contacts
        const stmtContacts = db.prepare('SELECT COUNT(*) as count FROM contacts');
        const contactsCount = stmtContacts.get().count;
        
        // Compteur total catégories distinctes (via jointure)
        const stmtCategories = db.prepare(`
            SELECT COUNT(DISTINCT ca.nom) as count 
            FROM contact_categories cc
            JOIN categories ca ON cc.category_id = ca.id
        `);
        const categoriesCount = stmtCategories.get().count;
        
        // Dernier contact créé (avec son timestamp)
        const stmtLastContact = db.prepare(`
            SELECT nom, prenom, created_at 
            FROM contacts 
            ORDER BY id DESC 
            LIMIT 1
        `);
        const lastContact = stmtLastContact.get();
        
        return {
            success: true,
            data: {
                total_contacts: contactsCount,
                total_categories: categoriesCount,
                last_created_contact: lastContact || null
            }
        };
        
    } catch (error) {
        console.error("Erreur dans getStats :", error);
        throw error; // Propager pour erreur serveur 500
    }
};
```

---

### 4. Routes - Routage HTTP API et SPA

#### `src/routes/api.js` - Toutes les routes REST

Ce fichier regroupe **tous** les endpoints API :

```javascript
const express = require('express');
const router = express.Router(); // Routeur multiplexeur pour namespace API
const fs = require('fs');
const path = require('path');
const contactController = require('../controllers/contactController.js');
const configController = require('../controllers/configController.js');
const { parseVCF } = require('./api.js'); // Inline parser VCF

// ==================== CONTACTS ====================

// ✅ GET /api/contacts?page=1&limit=10 - Liste paginée contacts
router.get('/contacts', (req, res) => {
    try {
        const contacts = contactController.getContacts(req, res);
        console.log("GET /api/contacts : " + contacts.data.length + " contacts récupérés");
        
        res.json(contacts);
        
    } catch (error) {
        console.error("Erreur GET /api/contacts :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors du chargement de la liste des contacts"
        });
    }
});

// ✅ GET /api/contacts/:id - Récupération d'un contact unique par ID
router.get('/contacts/:id', (req, res) => {
    const id = req.params.id;
    
    try {
        // Requête SQL avec catégorie JSON concaténée
        const stmt = db.prepare(`
            SELECT 
                c.*,
                GROUP_CONCAT(cc.nom || ' (' || ca.couleur || ')', ';') as categories_json
            FROM contacts c
            LEFT JOIN contact_categories cc ON c.id = cc.contact_id
            LEFT JOIN categories ca ON cc.category_id = ca.id
            WHERE c.id = ?
        `);
        
        const contact = stmt.get(id);
        
        if (contact) {
            console.log("GET /api/contacts/" + id + " : contact trouvé");
            res.json({ success: true, data: contact });
        } else {
            console.log("GET /api/contacts/" + id + " : contact non trouvé");
            res.status(404).json({ success: false, error: "Contact non trouvé" });
        }
        
    } catch (error) {
        console.error("Erreur GET /api/contacts/" + id + " :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la récupération du contact"
        });
    }
});

// ✅ POST /api/contacts - Création d'un nouveau contact
router.post('/contacts', async (req, res) => {
    try {
        const created = await contactController.createContact(req, res);
        
        console.log("POST /api/contacts : contact " + created.data.nom + " " + created.data.prenom + " créé");
        
        res.status(201).json(created);
        
    } catch (error) {
        console.error("Erreur POST /api/contacts :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la création du contact"
        });
    }
});

// ✅ PUT /api/contacts/:id - Mise à jour d'un contact + sync catégories
router.put('/contacts/:id', (req, res) => {
    try {
        const updated = contactController.updateContact(req, res);
        
        console.log("PUT /api/contacts/" + req.params.id + " : contact mis à jour");
        
        res.json(updated);
        
    } catch (error) {
        console.error("Erreur PUT /api/contacts/" + req.params.id + " :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour du contact"
        });
    }
});

// ✅ DELETE /api/contacts/:id - Suppression d'un contact (CASCADE)
router.delete('/contacts/:id', (req, res) => {
    try {
        const deleted = contactController.deleteContact(req, res);
        
        console.log("DELETE /api/contacts/" + req.params.id + " : contact supprimé avec CASCADE");
        
        res.json(deleted);
        
    } catch (error) {
        console.error("Erreur DELETE /api/contacts/" + req.params.id + " :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la suppression du contact"
        });
    }
});

// ✅ POST /api/contacts/:id1/merge/:id2 - Fusion deux contacts (ID1 → ID2)
router.post('/contacts/:id1/merge/:id2', (req, res) => {
    try {
        const merged = contactController.mergeContacts(req, res);
        
        console.log("POST /api/contacts/" + req.params.id1 + "/merge/" + req.params.id2 + 
                   " : fusion effectuée");
        
        res.json(merged);
        
    } catch (error) {
        console.error("Erreur merge contacts :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la fusion des contacts"
        });
    }
});

// ✅ GET /api/contacts/search?q={term} - Recherche globale (LIKE)
router.get('/contacts/search', (req, res) => {
    const query = req.query.q;
    
    if (!query) {
        console.log("GET /api/contacts/search : requête vide (q param obligatoire)");
        return res.status(400).json({ success: false, error: "Paramètre 'q' requis pour la recherche" });
    }
    
    try {
        const results = contactController.searchContacts(query);
        
        console.log("GET /api/contacts/search?q=" + query + " : " + results.length + " résultats trouvés");
        
        res.json({ success: true, data: results });
        
    } catch (error) {
        console.error("Erreur dans searchContacts :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la recherche des contacts"
        });
    }
});

// ✅ GET /api/contacts/filter/email?email={e} - Filtrer par email substring
router.get('/contacts/filter/email', (req, res) => {
    const email = req.query.email;
    
    if (!email) {
        console.log("GET /api/contacts/filter/email : paramètre 'email' requis");
        return res.status(400).json({ success: false, error: "Paramètre 'email' requis" });
    }
    
    try {
        const results = contactController.filterByEmail(email);
        
        console.log("GET /api/contacts/filter/email?email=" + email + " : " + results.length + " contacts trouvés");
        
        res.json({ success: true, data: results });
        
    } catch (error) {
        console.error("Erreur dans filterByEmail :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors du filtrage par email"
        });
    }
});

// ✅ GET /api/contacts/filter/phone?phone={p} - Filtrer par téléphone substring
router.get('/contacts/filter/phone', (req, res) => {
    const phone = req.query.phone;
    
    if (!phone) {
        console.log("GET /api/contacts/filter/phone : paramètre 'phone' requis");
        return res.status(400).json({ success: false, error: "Paramètre 'phone' requis" });
    }
    
    try {
        const results = contactController.filterByPhone(phone); // Implémentation similaire à filterByEmail
        
        console.log("GET /api/contacts/filter/phone?phone=" + phone + " : " + results.length + " contacts trouvés");
        
        res.json({ success: true, data: results });
        
    } catch (error) {
        console.error("Erreur dans filterByPhone :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors du filtrage par téléphone"
        });
    }
});

// ✅ GET /api/contacts/filter/organisation?org={o} - Filtrer par organisation substring
router.get('/contacts/filter/organisation', (req, res) => {
    const org = req.query.org;
    
    if (!org) {
        console.log("GET /api/contacts/filter/organisation : paramètre 'org' requis");
        return res.status(400).json({ success: false, error: "Paramètre 'organisation' requis" });
    }
    
    try {
        const results = contactController.filterByOrganisation(org); // Implémentation similaire
        
        console.log("GET /api/contacts/filter/organisation?org=" + org + " : " + results.length + " contacts trouvés");
        
        res.json({ success: true, data: results });
        
    } catch (error) {
        console.error("Erreur dans filterByOrganisation :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors du filtrage par organisation"
        });
    }
});


// ==================== CATEGORIES ====================

// ✅ GET /api/categories - Liste toutes les catégories
router.get('/categories', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM categories ORDER BY id ASC');
        const categories = stmt.all();
        
        console.log("GET /api/categories : " + categories.length + " catégories récupérées");
        
        res.json({ success: true, data: categories });
        
    } catch (error) {
        console.error("Erreur GET /api/categories :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors du chargement de la liste des catégories"
        });
    }
});

// ✅ POST /api/categories - Création d'une nouvelle catégorie
router.post('/categories', (req, res) => {
    const categoryData = req.body;
    
    if (!categoryData.nom || !categoryData.couleur) {
        console.log("POST /api/categories : champs 'nom' et 'couleur' requis");
        return res.status(400).json({ success: false, error: "Champs 'nom' et 'couleur' requis" });
    }
    
    try {
        const stmtInsert = db.prepare(`
            INSERT INTO categories (nom, couleur) VALUES (?, ?)
        `);
        
        const result = stmtInsert.run(categoryData.nom, categoryData.couleur);
        const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
        
        console.log("POST /api/categories : catégorie '" + categoryData.nom + "' créée (ID: " + newCategory.id + ")");
        
        res.status(201).json({ success: true, message: "Catégorie créée avec succès", data: newCategory });
        
    } catch (error) {
        console.error("Erreur POST /api/categories :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la création de la catégorie"
        });
    }
});

// ✅ PUT /api/categories/:id - Mise à jour d'une catégorie (nom/couleur)
router.put('/categories/:id', (req, res) => {
    const id = req.params.id;
    const updateData = req.body; // { nom: "...", couleur: "..." }
    
    try {
        console.log("PUT /api/categories/" + id + " : mise à jour de '" + JSON.stringify(updateData).substring(0, 100) + "...'");
        
        db.prepare(`
            UPDATE categories 
            SET nom = COALESCE(?, nom), couleur = COALESCE(?, couleur)
            WHERE id = ?
        `).run(updateData.nom || null, updateData.couleur || null, id);
        
        const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        
        console.log("PUT /api/categories/" + id + " : catégorie mise à jour");
        
        res.json({ success: true, message: "Catégorie mise à jour avec succès", data: updatedCategory });
        
    } catch (error) {
        console.error("Erreur PUT /api/categories/" + id + " :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour de la catégorie"
        });
    }
});

// ✅ DELETE /api/categories/:id - Suppression d'une catégorie (CASCADE sur contact_categories)
router.delete('/categories/:id', (req, res) => {
    const id = req.params.id;
    
    try {
        console.log("DELETE /api/categories/" + id + " : suppression de la catégorie");
        
        db.prepare('DELETE FROM categories WHERE id = ?').run(id);
        
        // Comptage des catégories restantes pour info
        const remainingCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
        
        res.json({ success: true, message: "Catégorie ID " + id + " supprimée avec succès", total_categories_remaining: remainingCount });
        
    } catch (error) {
        console.error("Erreur DELETE /api/categories/" + id + " :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la suppression de la catégorie"
        });
    }
});


// ==================== IMPORT/EXPORT ====================

// ✅ POST /api/import/csv - Import CSV multipart upload
router.post('/import/csv', async function(req, res) {
    try {
        if (!req.file) {
            console.log("POST /api/import/csv : fichier uploadé manquant dans la requête");
            return res.status(400).json({ success: false, error: "Aucun fichier CSV fourni" });
        }
        
        const file = req.file;
        const filePath = file.path;
        
        console.log("POST /api/import/csv : import du fichier '" + file.originalname + "' (" + Math.round(file.size/1024) + " Ko)");
        
        // Lecture ligne par ligne (hors en-tête première ligne)
        let contactsCounter = 0;
        const fs = require('fs');
        
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const lines = fileContent.split(/\r?\n/).slice(1); // Ignorer la première ligne (en-tête)
            
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex].trim();
                
                if (!line) continue; // Ligne vide
                
                try {
                    const dataLineSplit = line.split(';');
                    
                    if (dataLineSplit.length > 0 && dataLineSplit.length < columns.length) {
                        console.log("POST /api/import/csv : ligne " + (lineIndex + 2) + " : données incomplètes, ignorée");
                        continue;
                    }
                    
                    // Extraction valeurs selon indices colonnes
                    const prenom = dataLineSplit[columns.indexOf('prenom')];
                    const nom = dataLineSplit[columns.indexOf('nom')];
                    const email = dataLineSplit[columns.indexOf('email')];
                    const telephone = dataLineSplit[columns.indexOf('telephone')];
                    const organisation = dataLineSplit[columns.indexOf('organisation')];
                    const tags = dataLineSplit[columns.indexOf('tags')];
                    const notes = dataLineSplit[columns.indexOf('notes')];
                    
                    // Création contact via controller (catégories auto-crées si absent)
                    if (prenom !== "" && nom !== "") {
                        const contactData = {
                            prenom: prenom,
                            nom: nom,
                            email: email || null,
                            telephone: telephone || null,
                            organisation: organisation || null,
                            tags: tags || null,
                            notes: notes || null,
                            categories: [{ nom: 'CLIENT', couleur: '#70ad47' }] // Par défaut "CLIENT" en vert
                        };
                        
                        await contactController.createContact(contactData);
                        contactsCounter++;
                    }
                } catch (errorLine) {
                    console.log("POST /api/import/csv : ligne " + (lineIndex + 2) + " - erreur:", errorLine.message);
                }
            }
            
        } catch (errorRead) {
            console.error("POST /api/import/csv : lecture du fichier échouée :", errorRead);
        }
        
        // Nettoyage fichier après traitement
        if (file.path) {
            try {
                fs.unlinkSync(file.path);
            } catch (errorUnlink) {
                console.warn("POST /api/import/csv : impossible de supprimer fichier uploadé temporairement :", errorUnlink.message);
            }
        }
        
        console.log("POST /api/import/csv : " + contactsCounter + " contacts importés avec succès");
        
        res.json({ success: true, message: contactsCounter + " contacts importés avec succès", created_contacts_count: contactsCounter });
        
    } catch (errorUpload) {
        console.error("POST /api/import/csv : erreur lors de l'upload/fichier :", errorUpload);
        res.status(500).json({ success: false, error: "Erreur lors de la lecture du fichier CSV" });
    }
});

// ✅ POST /api/import/vcf - Import VCF (vCard) multipart upload avec node-vcf
router.post('/import/vcf', async function(req, res) {
    try {
        if (!req.file) {
            console.log("POST /api/import/vcf : fichier uploadé manquant");
            return res.status(400).json({ success: false, error: "Aucun fichier VCF fourni" });
        }
        
        const file = req.file;
        const filePath = file.path;
        
        console.log("POST /api/import/vcf : import du fichier '" + file.originalname + "' (" + Math.round(file.size/1024) + " Ko)");
        
        let textData = '';
        
        // Lecture contenu fichier
        fs.readFile(filePath, 'utf8', function(err, data) {
            if (err) throw err;
            textData = data;
            
            // Parsing vCard avec node-vcf (library standard VCF)
            try {
                const parsedCard = vcardParser.parse(textData);
                
                console.log("POST /api/import/vcf : fichier VCF parsé avec succès (" + (parsedCard.cards || []).length + " cartes)");
                
                // Création contacts à partir de(s) card(s) parse(s)
                let counterVcf = 0;
                
                for (const card of parsedCard.cards || []) {
                    const nomComplet = card.fullName || 'Sans Nom';
                    
                    // Extraction prénom/nom selon format vCard (N=first+last, FN=full name)
                    const noms = (card.fullName || '').split(' ');
                    const prenom = noms.slice(0, noms.length - 1).join(' ');
                    const nom = noms[noms.length - 1] || 'Sans Nom';
                    
                    // Création contact via controller
                    await contactController.createContact({
                        prenom: prenom,
                        nom: nom,
                        email: card.email[0] || null,
                        telephone: card.telephone[0] || null,
                        organisation: card.organization[0] || null,
                        notes: card.note[0] || null,
                        categories: [{ nom: 'CLIENT', couleur: '#70ad47' }] // Par défaut "CLIENT" en vert
                    });
                    
                    counterVcf++;
                }
                
            } catch (errorVcf) {
                console.error("POST /api/import/vcf : erreur parsing vCard :", errorVcf);
            }
            
            // Nettoyage fichier uploadé
            if (file.path) {
                try {
                    fs.unlinkSync(file.path);
                } catch (errorUnlink) {
                    console.warn("POST /api/import/vcf : impossible de supprimer fichier uploadé temporairement :", errorUnlink.message);
                }
            }
            
            res.json({ success: true, message: counterVcf + " contacts importés avec succès", created_contacts_count: counterVcf });
        });
        
    } catch (errorUpload) {
        console.error("POST /api/import/vcf : erreur upload fichier :", errorUpload);
        res.status(500).json({ success: false, error: "Erreur lors de l'upload du fichier VCF" });
    }
});

// ✅ POST /api/export/csv - Export CSV (multipart download)
router.post('/export/csv', async function(req, res) {
    try {
        const ids = req.query.ids ? req.query.ids.split(',').filter(id => id.trim()) : []; // Tous les contacts si ids=vide
        
        console.log("POST /api/export/csv : export des " + ids.length + " contacts spécifiés (ou tous)");
        
        // Récupération des données depuis la base SQLite
        let contacts = [];
        
        if (ids.length > 0) {
            const stmt = db.prepare('SELECT * FROM contacts WHERE id IN (?)');
            contacts = stmt.all(ids);
        } else {
            contacts = db.prepare('SELECT * FROM contacts').all();
        }
        
        // Conversion tableau CSV via csv-stringify (library performante pour CSV)
        const stringify = require('csv-stringify/sync');
        
        // Définition des colonnes à exporter dans l'ordre attendu
        const columns = [
            'prenom', 'nom', 'email', 'telephone', 'organisation', 
            'adresse', 'code_postal', 'pays', 'ville', 'region',
            'anniversaire', 'conjoint', 'tags', 'notes'
        ];
        
        // Construction objet CSV avec les champs requis
        const rows = contacts.map(contact => {
            const row = {};
            for (const col of columns) {
                row[col] = contact[col];
            }
            return row;
        });
        
        // Génération string CSV + encoding UTF-8
        const csvContent = stringify(rows, { delimiter: ';', quoted: true });
        
        // Rendu fichier CSV avec header de download auto navigateur
        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.header('Content-Disposition', 'attachment; filename="export.csv"');
        res.send(csvContent);
        
    } catch (errorExport) {
        console.error("POST /api/export/csv : erreur export :", errorExport);
        res.status(500).json({ success: false, error: "Erreur lors de l'export CSV" });
    }
});

// ✅ POST /api/export/vcf - Export VCF (multipart download)
router.post('/export/vcf', async function(req, res) {
    try {
        const ids = req.query.ids ? req.query.ids.split(',').filter(id => id.trim()) : []; // Tous les contacts si ids=vide
        
        console.log("POST /api/export/vcf : export des " + ids.length + " contacts spécifiés (ou tous)");
        
        // Récupération données base SQLite
        let contacts = [];
        
        if (ids.length > 0) {
            const stmt = db.prepare('SELECT * FROM contacts WHERE id IN (?)');
            contacts = stmt.all(ids);
        } else {
            contacts = db.prepare('SELECT * FROM contacts').all();
        }
        
        // Génération VCF multi-contact (format standard vCard)
        let vcfContent = 'BEGIN:VCARD\nVERSION:3.0\n';
        
        for (const contact of contacts) {
            const nomParts = contact.nom.split(' ');
            const prenom = contact.prenom;
            const lastName = contact.nom;
            
            // Bloc vCard pour ce contact
            vcfContent += 'BEGIN:VCARD\nVERSION:3.0\n';
            
            if (prenom && lastName) {
                vcfContent += `N;TZ;u;;${lastName};${prenom};;\n`;
            }
            
            if (contact.email) {
                vcfContent += `EMAIL;INTERNET:${contact.email}\n`;
            }
            
            if (contact.telephone) {
                const phoneParts = contact.telephone.split('@').map(p => p.trim());
                if (phoneParts[0]) {
                    vcfContent += `TEL;TYPE=CELL:${phoneParts[0]}\n`;
                }
            }
            
            if (contact.organisation) {
                vcfContent += `ORG;WORK:;${contact.organisation};;\n`;
            }
            
            if (contact.adresse) {
                vcfContent += `ADR;HOME;TYPE=WORK;;;;;;${contact.adresse};\n`;
                if (contact.code_postal && contact.pays) {
                    vcfContent += `${contact.code_postal}  ${contact.pays}\n`;
                }
                if (contact.ville) {
                    vcfContent += `${contact.ville}\n`;
                }
            }
            
            if (contact.notes) {
                vcfContent += `NOTE:${contact.notes}\n`;
            }
            
            vcfContent += 'END:VCARD\n';
        }
        
        // Rendu fichier VCF avec header de download auto navigateur
        res.header('Content-Type', 'text/vcard; charset=utf-8');
        res.header('Content-Disposition', 'attachment; filename="export.vcf"');
        res.send(vcfContent);
        
    } catch (errorExport) {
        console.error("POST /api/export/vcf : erreur export :", errorExport);
        res.status(500).json({ success: false, error: "Erreur lors de l'export VCF" });
    }
});

// ✅ POST /api/export/xlsx - Export Excel XLSX avec SheetJS
router.post('/export/xlsx', async function(req, res) {
    try {
        const ids = req.query.ids ? req.query.ids.split(',').filter(id => id.trim()) : []; // Tous les contacts si ids=vide
        
        console.log("POST /api/export/xlsx : export des " + ids.length + " contacts spécifiés (ou tous)");
        
        // Récupération données base SQLite
        let contacts = [];
        
        if (ids.length > 0) {
            const stmt = db.prepare('SELECT * FROM contacts WHERE id IN (?)');
            contacts = stmt.all(ids);
        } else {
            contacts = db.prepare('SELECT * FROM contacts').all();
        }
        
        // Utilisation de SheetJS pour générer workbook Excel moderne (.xlsx)
        const xlsx = require('xlsx');
        const fs = require('fs');
        const path = require('path');
        
        // Définition des colonnes à exporter
        const columns = [
            'prenom', 'nom', 'email', 'telephone', 'organisation', 
            'adresse', 'code_postal', 'pays', 'ville', 'region',
            'anniversaire', 'conjoint', 'tags', 'notes'
        ];
        
        // Transformation tableau dans format workbook pour export SheetJS
        const sheetData = contacts.map(contact => {
            const row = {};
            for (const col of columns) {
                row[col] = contact[col];
            }
            return row;
        });
        
        // Création workbook avec feuille "Contacts"
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet([sheetData.map(d => Object.values(d))]);
        
        xlsx.utils.book_append_sheet(wb, ws, 'Contacts');
        
        // Rendu fichier XLSX avec header de download auto navigateur
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.header('Content-Disposition', 'attachment; filename="export.xlsx"');
        res.send(xlsx.write(wb, { type: 'buffer' }));
        
    } catch (errorExport) {
        console.error("POST /api/export/xlsx : erreur export :", errorExport);
        res.status(500).json({ success: false, error: "Erreur lors de l'export XLSX" });
    }
});


// ==================== CONFIGURATION ====================

// ✅ GET /api/config - Récupération complète configuration site
router.get('/config', (req, res) => {
    try {
        // Lecture depuis config session (si configuré dans frontend)
        const sessionConfig = req.session.config || {};
        
        // Retour par défaut + données de session
        const defaultConfig = {
            site_name: "Mes Contacts",
            footer_text: "",
            show_email: true,
            show_telephone: true,
            show_organisation: true,
            max_contacts_per_page: 10,
            default_category_color: "#4285f4"
        };
        
        const mergedConfig = { ...defaultConfig, ...sessionConfig };
        
        console.log("GET /api/config : récupération de " + Object.keys(mergedConfig).length + " paramètres");
        
        res.json({ success: true, data: mergedConfig });
        
    } catch (error) {
        console.error("Erreur GET /api/config :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la récupération de la configuration"
        });
    }
});

// ✅ PUT /api/config/:key - Mise à jour paramètre unique configuration
router.put('/config/:key', (req, res) => {
    const key = req.params.key;
    const value = req.body.value; // Attend "value": true|false|string dans body
    
    try {
        console.log("PUT /api/config/" + key + " : mise à jour vers valeur '" + value + "'");
        
        // Mise à jour session (ou persistence fichier si implémenté)
        if (!req.session.config) {
            req.session.config = {};
        }
        req.session.config[key] = value;
        
        res.json({
            success: true,
            message: key + " mis à jour à " + String(value),
            data: { key: key, value: value }
        });
        
    } catch (error) {
        console.error("Erreur PUT /api/config/" + key + " :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la mise à jour de la configuration"
        });
    }
});


// ==================== STATISTIQUES ====================

// ✅ GET /api/stats - Statistiques globales (compteurs contacts + dernières créations)
router.get('/stats', (req, res) => {
    try {
        // Compteur total contacts
        const stmtContacts = db.prepare('SELECT COUNT(*) as count FROM contacts');
        const contactsCount = stmtContacts.get().count;
        
        // Compteur total catégories distinctes (via jointure)
        const stmtCategories = db.prepare(`
            SELECT COUNT(DISTINCT ca.nom) as count 
            FROM contact_categories cc
            JOIN categories ca ON cc.category_id = ca.id
        `);
        const categoriesCount = stmtCategories.get().count;
        
        // Dernier contact créé (avec son timestamp)
        const stmtLastContact = db.prepare(`
            SELECT nom, prenom, created_at 
            FROM contacts 
            ORDER BY id DESC 
            LIMIT 1
        `);
        const lastContact = stmtLastContact.get();
        
        console.log("GET /api/stats : " + contactsCount + " contacts, " + categoriesCount + " catégories");
        
        res.json({
            success: true,
            data: {
                total_contacts: contactsCount,
                total_categories: categoriesCount,
                last_created_contact: lastContact || null
            }
        });
        
    } catch (error) {
        console.error("Erreur GET /api/stats :", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la récupération des statistiques"
        });
    }
});


// ==================== ROUTES MIDDLEWARE (serveur SPA) ====================

// Routes pour servir les fichiers statiques (SPA frontend)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Catch-all route fallback pour SPA (si URL API non trouvée, c'est le frontend)
app.get('*', function(req, res) {
    // Exclusion des routes API par leur chemin (/api/*)
    if (req.path.startsWith('/api/')) {
        return; // Let the API routes handle this request instead
    }
    
    // Pour toutes les autres requêtes, servir l'index.html (single-page app)
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Export routeur pour injection dans serveur principal
module.exports = router;
```

#### `src/routes/index.js` - Routes principales SPA

Gère la navigation fragment-based (`#dashboard`, `#contacts`, etc.) sans rechargement de page :

```javascript
const express = require('express');
const app = express(); // Reçoit app du point d'entrée server.js
const fs = require('fs');
const path = require('path');
const contactController = require('../controllers/contactController.js');
const configController = require('../controllers/configController.js');

// ✅ GET / - Tableau de bord (vue dashboard par défaut)
app.get('/', function(req, res) {
    // Rendu de index.html avec hash #dashboard par défaut si vide
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ✅ GET /#contacts - Vue contacts (liste + modales)
app.get('/#contacts', function(req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ✅ GET /#categories - Vue catégories (liste + ajout/modification/suppression)
app.get('/#categories', function(req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ✅ GET /#import-export - Vue import/export CSV/VCX/XLSX
app.get('/#import-export', function(req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ✅ GET /#settings - Vue configuration site + statistiques
app.get('/#settings', function(req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ✅ GET /#dashboard - Tableau de bord (statistiques globales + vue récapitulative contacts)
app.get('/#dashboard', async function(req, res) {
    try {
        // Comptage global contacts + catégories
        const stmtContacts = db.prepare('SELECT COUNT(*) as count FROM contacts');
        const contactsCount = stmtContacts.get().count;
        
        const stmtCategories = db.prepare(`
            SELECT COUNT(DISTINCT ca.nom) as count 
            FROM contact_categories cc
            JOIN categories ca ON cc.category_id = ca.id
        `);
        const categoriesCount = stmtCategories.get().count;
        
        // Derniers 10 contacts créés (avec timestamp)
        const recentContactsStmt = db.prepare(`
            SELECT id, nom, prenom, email, telephone, organisation, created_at 
            FROM contacts 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        const recentContacts = recentContactsStmt.all();
        
        console.log("GET /#dashboard : récupération tableau de bord (" + contactsCount + " contacts, " + categoriesCount + " catégories)");
        
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
        
    } catch (error) {
        console.error("Erreur GET /#dashboard :", error);
        res.status(500).send("Erreur lors du chargement du tableau de bord");
    }
});

module.exports = app; // Export routeur pour injection dans serveur principal
```

---

### 5. Serveur HTTP Principal - `src/server.js` (simplified view)

Le point d'entrée de l'application regroupe tous les middlewares et routeurs :

```javascript
const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session); // Session persistante RAM + rechargement après restarts serveur
const cookieParser = require('cookie-parser');
const path = require('path');

// Initialisation application Express
const app = express();

// Configuration environnement
const PORT = process.env.PORT || 3000;

// Middlewares essentiels :
app.use(express.static(path.join(__dirname, '..', 'public'))); // Fichiers statiques CSS/JS
app.use(express.urlencoded({ extended: true }));               // Parsed bodies (POST JSON)
app.use(express.json());                                        // Parsed JSON body payloads

// Session avec MemoryStore pour persistance multi-restarts serveur
app.use(session({
    secret: process.env.SESSION_SECRET || 'change-me-in-production', // Changez en prod !
    resave: false,                                                 // Ne pas sauvegarder sessions non-modifiées
    saveUninitialized: true,                                       // Pas de session vide dans MemoryStore
    store: new MemoryStore({ checkPeriod: 86400000 })              // Clean up toutes les 24h
}));

app.use(cookieParser());                                          // Parser cookies pour auth futur si besoin

// Import des routeurs
require('./routes/index.js')(app);     // Routes SPA principales (/, #contacts, etc.)
require('./routes/api.js')(app);       // Toutes les API endpoints REST (GET/POST/etc)
require('./db/database.js');           // Initialisation base SQLite + schéma

// Serveur HTTP final
const server = app.listen(PORT, function() {
    console.log(`
╔═══════════════════════════════════════════════╗
║  🚀 MES CONTACTS - Serveur démarré !          ║
║  📍 http://localhost:${PORT}                        ║
║  👤 Gestion de contacts (SQLite)              ║
║  📥 Import CSV | VCF | Export Excel XLSX      ║
╚═══════════════════════════════════════════════╝
    `);
});

module.exports = { app, server }; // Export serveur et app pour hot-reload nodemon
```

---

## 🔄 Architecture Frontend (SPA)

### Fichier frontend principal - `public/js/app.js`

Ce fichier regroupe **toute la logique client-side** sans framework JS :

#### Initialisation et Routing Hash-Based

```javascript
// public/js/app.js - Ligne 0-100 environ

// Initialisation application (exécute dès chargement page)
function init() {
    // Navigation entre pages principales (fragment routing)
    window.addEventListener('hashchange', updatePage); // Déclenché quand hash change
    updatePage();                                       // Appel initial pour première vue
    
    // Écouteurs clics navigation manuelle (si changement hash non auto par navigateur)
    document.getElementById('dashboard-link').addEventListener('click', (e) => {
        e.preventDefault();
        history.pushState(null, '', '#dashboard'); // Update URL + historique browser
        updatePage();                              // Refresh vue
    });
    
    // ... autres écouteurs pour contacts/#categories/#import-export/#settings
    
    console.log("MES CONTACTS - Application initialisée");
}

// Fonction mise à jour de la vue (hide/show sections)
function updatePage() {
    const hash = window.location.hash.slice(1) || 'dashboard'; // Hash sans # par défaut dashboard
    hideAllPages();                                            // Cacher toutes les pages
    
    if (hash === 'contacts') {
        showContactsPage(); // Affiche section contacts (liste + modales)
    } else if (hash === 'categories') {
        showCategoriesPage(); // Affiche section catégories
    } else if (hash === 'import-export') {
        showImportExportPage(); // Affiche section import/export
    } else if (hash === 'settings') {
        showSettingsPage(); // Affiche configuration site + statistiques
    } else {
        // Hash vide ou inconnu → tableau de bord par défaut
        showDashboardPage(); 
    }
}

// Fonctions showXxxPage() : hide toutes les sections sauf la cible...
function hideAllPages() {
    ['dashboard', 'contacts', 'categories', 'import-export', 'settings'].forEach(page => {
        const section = document.getElementById(page);
        if (section) {
            section.classList.add('hidden'); // Ajoute .hidden si existe dans CSS
        }
    });
}

function showContactsPage() { ... } // Rend liste contacts + boutons actions
function showCategoriesPage() { ... } // Rend liste catégories + boutons CRUD
...

// Démarrage application (appellation init() après chargement)
document.addEventListener('DOMContentLoaded', init);
```

#### Gestion des Modales et Dialogues

L'application utilise un système de modales réutilisable pour les formulaires de création/mise à jour :

```javascript
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = modal.querySelector('.modal-overlay');
    
    // Affichage modal avec animation fade-in (CSS transitions)
    modal.style.display = 'flex';
    overlay.classList.add('show');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = modal.querySelector('.modal-overlay');
    
    // Masquage modal + suppression event listeners temporaires (mémoisation références)
    overlay.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 300); // Attend fin transition CSS
    
    // Récupération formulaire et reset des champs (si formulaire dans modale)
    const form = modal.querySelector('form');
    if (form) form.reset();
}

// Fermeture modal clic overlay extérieur ou bouton fermer X
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.closest('.modal').querySelector('.close-btn')?.click();
    }
});
```

#### Manipulation DOM : Ajout/Modification des Contacts (via API REST)

```javascript
// Ajout contact depuis modale (#contact-modal)
const form = document.getElementById('add-contact-form'); // Formulaire ajout contacts

form.addEventListener('submit', async function(e) {
    e.preventDefault(); // Empêche reload page classique
    
    // Collecte valeurs formulaire (jQuery alternatif si utilisé)
    const formData = new FormData(form);
    const contactData = Object.fromEntries(formData.entries());
    
    console.log("Ajout contact : " + contactData.nom + " " + contactData.prenom);
    
    try {
        const response = await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Succès : fermeture modale + refresh vue contacts
            closeModal('contact-modal');
            
            refreshContactsList(); // Remplit table DOM depuis API /api/contacts
            
            // Notification success toast personnalisé (si implémenté)
            showToast('✅ Contact ajouté avec succès !');
        } else {
            console.error("Échec ajout contact :", result);
            alert(result.error || "Erreur lors de l'ajout du contact");
        }
        
    } catch (error) {
        console.error("Erreur réseau ajout contact :", error);
        alert("Erreur réseau : impossible de contacter le serveur");
    }
});

// Récupération données API /api/contacts et rendu DOM table HTML
function refreshContactsList() {
    fetch('/api/contacts?page=1&limit=50') // Fetch API moderne (pas XMLHttpRequest)
        .then(res => res.json())
        .then(data => {
            if (data.success && Array.isArray(data.data)) {
                renderContactsTable(data.data);
            } else {
                console.error("API contacts : erreur ou données invalides");
            }
        });
}

// Rendu tableau HTML depuis données API
function renderContactsTable(contacts) {
    const tbody = document.querySelector('#contacts-table tbody'); // Table HTML contact list
    tbody.innerHTML = ''; // Reset contenu
    
    for (const contact of contacts) {
        const tr = document.createElement('tr');
        
        tr.innerHTML = \`
            <td>\${contact.nom}</td>
            <td>\${contact.prenom}</td>
            <td><span class="badge">\${contact.titre || ''}</span></td>
            <td>\${contact.email || '-'}</td>
            <td><a href="tel:\${contact.telephone}">\${formatPhone(contact.telephone)}</a></td>
            <td>\${contact.organisation || '-'}</td>
            <td>
                <span class="category-chip">
                    \${contact.categories?.map(c => \`<span style="color:\${c.couleur}">\${c.nom}</span>\`).join(', ') || '-'}
                </span>
            </td>
        \`;
        
        tbody.appendChild(tr); // Append row nouvelle table
        
        // Ajout event listener bouton delete (délegation événementaire parent container)
        const deleteBtn = tr.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                if (confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) {
                    // Appel API DELETE /api/contacts/:id
                    fetch('/api/contacts/' + contact.id, { method: 'DELETE' })
                        .then(res => res.json())
                        .then(result => {
                            if (result.success) {
                                refreshContactsList(); // Refresh liste après suppression
                                alert("Contact supprimé");
                            } else {
                                alert("Erreur suppression : " + result.error);
                            }
                        });
                }
            });
        }
    }
    
    console.log("Tableau contacts rafraîchi (" + contacts.length + " entrées)");
}
```

#### Gestion de Recherche Globale (instant search sans rechargement page)

Fonctionnalité SPA : recherche **réactive** sur tous les champs sans requête API !

```javascript
// Fonction recherche globale (mise à jour instantanée toutes pages)
function performSearch(query) {
    if (!query.trim()) {
        refreshContactsList(); // Reset liste complète si recherche vide
        return;
    }
    
    console.log("Recherche contacts : " + query);
    
    try {
        fetch('/api/contacts/search?q=' + encodeURIComponent(query))
            .then(res => res.json())
            .then(data => {
                if (data.success && Array.isArray(data.data)) {
                    // Rendu tableau DOM (même logique que refreshContactsTable)
                    const tbody = document.querySelector('#contacts-table tbody');
                    tbody.innerHTML = ''; // Reset
                    
                    for (const contact of data.data) {
                        const tr = document.createElement('tr');
                        
                        tr.innerHTML = \`
                            <td>\${contact.nom}</td>
                            <td>\${contact.prenom}</td>
                            ... <!-- autres colonnes mêmes que renderContactsTable -->
                        \`;
                        
                        tbody.appendChild(tr);
                    }
                    
                    // Mise à jour titre résultats (si section header existante)
                    const resultsTitle = document.querySelector('.results-title');
                    if (resultsTitle) {
                        resultsTitle.textContent = "Résultats de recherche (" + data.data.length + ")";
                    }
                } else {
                    console.error("Erreur recherche API :", data);
                }
            });
    } catch (error) {
        console.error("Erreur fetch recherche :", error);
    }
}

// Event listener champ input recherche global (#search-input)
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input'); // Champ texte recherche
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            // Recherche instantanée sur touche (debounce 300ms pour éviter appels API excessifs)
            let debounceTimer;
            clearTimeout(debounceTimer);
            
            debounceTimer = setTimeout(function() {
                const query = e.target.value.trim();
                if (query.length >= 1) { // Min 1 caractère minimum
                    performSearch(query); // Déclenche requête API /api/contacts/search?q=xxx
                } else {
                    refreshContactsList(); // Reset liste si recherche vide ou très court
                }
            }, 300); // Délai entre chaque requête (optimisation)
        });
    }
});
```

#### Gestion de Catégories : CRUD complet via API REST

```javascript
// ✅ Création catégorie (POST /api/categories)
const categoriesForm = document.getElementById('add-category-form');

categoriesForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(categoriesForm);
    const categoryData = Object.fromEntries(formData.entries());
    
    console.log("Création catégorie : '" + categoryData.nom + "'");
    
    try {
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('category-modal'); // Ferme modale création
            loadCategoriesList();        // Refresh liste catégories depuis API
            
            // Feedback success notification toast/alert
            showToast('✅ Catégorie créée avec succès !');
        } else {
            console.error("Échec création catégorie :", result);
            alert(result.error || "Erreur lors de la création de la catégorie");
        }
        
    } catch (error) {
        console.error("Erreur réseau création catégorie :", error);
        alert("Erreur réseau : impossible de contacter le serveur");
    }
});

// ✅ Liste catégories depuis API GET /api/categories
function loadCategoriesList() {
    fetch('/api/categories')
        .then(res => res.json())
        .then(data => {
            if (data.success && Array.isArray(data.data)) {
                renderCategoriesList(data.data); // Rendu DOM liste catégories table
            } else {
                console.error("API categories : erreur ou données invalides");
            }
        });
}

// ✅ Rendu liste catégories HTML depuis données API
function renderCategoriesList(categories) {
    const tbody = document.querySelector('#categories-table tbody');
    tbody.innerHTML = ''; // Reset
    
    for (const category of categories) {
        const tr = document.createElement('tr');
        
        tr.innerHTML = \`
            <td>\${category.nom}</td>
            <td><span class="color-preview" style="background-color:\${category.couleur};"></span></td>
            <td>
                <button class="edit-btn btn-sm" data-id="\${category.id}" onclick="openEditCategoryModal(\${category.id})">Modifier</button>
                <button class="delete-btn btn-sm" data-id="\${category.id}" onclick="deleteCategory(\${category.id})">Supprimer</button>
            </td>
        \`;
        
        tbody.appendChild(tr);
    }
    
    console.log("Liste catégories rafraîchie (" + categories.length + " entrées)");
}

// ✅ Suppression catégorie (DELETE /api/categories/:id)
function deleteCategory(id) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer la catégorie ?")) return;
    
    // Appel API DELETE
    fetch('/api/categories/' + id, { method: 'DELETE' })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                loadCategoriesList(); // Refresh liste après suppression
                
                // Feedback user notification success alert/toast
                showToast('✅ Catégorie supprimée avec succès !');
            } else {
                console.error("Échec suppression catégorie :", result);
                alert(result.error || "Erreur lors de la suppression");
            }
        });
}

// ✅ Modification catégorie (PUT /api/categories/:id)
function editCategory(id, nom = "", couleur = "") {
    const category = categories.find(cat => cat.id === id); // Récup depuis DOM
    if (!category) return;
    
    document.getElementById('edit-category-name').value = nom;
    document.getElementById('edit-category-color').value = couleur;
    openModal('edit-category-modal'); // Affiche modale modification
}

// Sauvegarde catégorie mise à jour (via PUT /api/categories/:id)
const editForm = document.getElementById('edit-category-form');

editForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(editForm);
    const categoryData = Object.fromEntries(formData.entries());
    
    console.log("Mise à jour catégorie ID " + id + " : " + JSON.stringify(categoryData));
    
    try {
        const response = await fetch('/api/categories/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('edit-category-modal'); // Ferme modale
            loadCategoriesList();            // Refresh liste catégories
            
            showToast('✅ Catégorie mise à jour avec succès !');
        } else {
            console.error("Échec mise à jour catégorie :", result);
            alert(result.error || "Erreur lors de la modification");
        }
        
    } catch (error) {
        console.error("Erreur réseau mise à jour catégorie :", error);
        alert("Erreur réseau : impossible de contacter le serveur");
    }
});
```

---

## 🔄 Cycle de Vie des Données API ↔ DOM

### Flux complet CRUD via REST API (frontend → backend → database → response)

```
┌─────────────────┐    HTTP POST       ┌─────────────────┐    SQL INSERT     ┌─────────────┐
│  #contact-modal │───────────────────▶│ /api/contacts   │─────────────────▶│ contacts    │
│  (DOM HTML)      │                    │                │                  │   table      │
└─────────────────┘    {json body}     └─────────────────┘    auto-incrément └─────────────┘
                           ▲               │                                      │
                           │               ▼                                      │
                     JSON response         │          (categorie automatique)     │
                  201 Created + data       │                                      │
                           │               └──────────────────┬──────────────────┘
                           ▼                                  │
                   DOM updated via renderContactsTable()     │
                   (fetch().then(...) → innerHTML tbody)     │
                     ✅ Modale fermée                         │
                     ✅ Toast notification                    │
```

### Diagramme de flux complet de l'application

```
┌─────────────┐     HTTP                  ┌─────────────────┐     SQL              ┌──────────────┐
│    #page-   │  ─────────────────────▶   │ /api/* (rest)   │  ───────────────▶   │ SQLite.db    │
│    html      │                           │   controller.js │                     │ + session    │
│              │                          └─────────────────┘                     │ + memory      │
└─────────────┘                                                                 │   store     │
                                       ▼                                         ▼
                                     Frontend SPA                                Base SQLite
                              (JS Vanilla + HTML5)                       (file-based persistent data)
                                       │                                         │
                                       └──────────────────────┬───────────────────┘
                                                              │
                                              Vue Navigation Hash-Based (SPA routing)

Flux complet cycle de vie :
1. User click → DOM event listener → fetch().then(...)
2. Backend controller → SQL prepared statement → SQLite execute
3. DB returns data → Controller JSON response → Frontend parse DOM update
4. Success toast + Modale close + List refresh

```

---

## 📊 Performances et Optimisations

### Débogage performance (profilage navigateur DevTools)

Pour identifier les gouffres temps frontend :

1. Ouvrez Chrome DevTools (F12) → Profil (Performance tab)
2. Enregistrez le profil
3. Reproduisez l'action lente (ex: refresh contacts list)
4. Arrêtez l'enregistrement → Analysez la flame graph

### Optimisations recommandées pour >50 000 contacts

| Technique | Description | Impact attendu |
|-----------|-------------|----------------|
| **Pagination optimisée** | Limiter fetch à page=1&limit=20 (déjà implémenté) | Réduit réseau ×10-50 |
| **Virtual scrolling** | Ne pas rendre DOM rows pour toutes les entrées (>500), utiliser un viewport virtuel | Réduit mémoire JS ×10-20 |
| **Debouncing API calls** | Attendre debounce (ex: 300ms) entre recherches avant fetch /api/contacts/search?q=xxx | Réduit appels réseau excessifs |
| **Index base SQL** | `CREATE INDEX idx_contacts_email ON contacts(email)` (déjà implémenté) | Accélère filtres par email ×5-10× |

### Métriques performances attendues

| Scénario | Temps de réponse | Notes |
|----------|------------------|-------|
| GET /api/contacts?page=1&limit=20 | <50ms (liste vide) à <3s (>5k contacts) | Dépend taille dataset + indexes SQL |
| POST /api/contacts (création) | ~50ms | SQL INSERT simple SQLite |
| POST /api/import/csv (10k lignes) | 1-5s (dépend parsing JS ligne par ligne) | Limite à ~10Mo fichier uploadé |
| GET /api/stats | <10ms | Comptage + dernière création seulement |

---

<div align="center">

## 📚 Documentation complémentaire

- [`API.md`](./API.md) - Documentation complète tous les endpoints REST disponibles
- [`DATABASE.md`](./DATABASE.md) - Schéma SQL détaillé des tables SQLite
- [`DOCUMENTATION.md`](./DOCUMENTATION.md) - Documentation générale du projet
- [`GUIDE_DEPLOYMENT.md`](./GUIDE_DEPLOYMENT.md) - Guide de déploiement en production
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) - Résolution problèmes communs

<div align="center">

**Développé avec ❤️ par l'équipe Contacts</div>

</center>
