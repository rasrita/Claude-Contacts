/**
 * Configuration de la base de données SQLite
 */
const Database = require('better-sqlite3');
const path = require('path');

// Chemin vers le fichier de la base de données
const dbPath = path.join(__dirname, '../../data/contacts.db');

// Initialisation de la connexion à la base de données
const db = new Database(dbPath);

/**
 * Création des tables de la base de données
 */
db.exec(`
    -- Table des contacts (vCard 3.0 + champs personnalisés)
    CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom VARCHAR(100),
        prenom VARCHAR(100),
        titre VARCHAR(50),
        prenom_honneur_prefix VARCHAR(10),
        prenom_honneur_suffix VARCHAR(10),
        surnom VARCHAR(50),
        email VARCHAR(255) ,
        telephone VARCHAR(30),
        organisation VARCHAR(150),
        adresse VARCHAR(255),
        code_postal VARCHAR(10),
        pays VARCHAR(50),
        ville VARCHAR(100),
        region VARCHAR(100),
        anniversaire DATE,
        jour_anniversaire INTEGER,
        conjoint VARCHAR(100),
        enfants TEXT DEFAULT '',
        tags TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des catégories (tags pour le regroupement)
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom VARCHAR(100) NOT NULL UNIQUE,
        couleur VARCHAR(7),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Table liant contacts et catégories (relation many-to-many)
    CREATE TABLE IF NOT EXISTS contact_categories (
        contact_id INTEGER,
        category_id INTEGER,
        PRIMARY KEY (contact_id, category_id),
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    -- Table liant contacts et emails (relation many-to-many pour gérer plusieurs emails)
    CREATE TABLE IF NOT EXISTS contact_emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        type VARCHAR(20) DEFAULT 'work', -- work, personal, home, mobile, etc.
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

     -- Table liant contacts et telephones (relation many-to-many pour gérer plusieurs emails)
    CREATE TABLE IF NOT EXISTS contact_telephones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        telephone VARCHAR(30) NOT NULL UNIQUE,
        type VARCHAR(20) DEFAULT 'CELL', -- work, personal, home, mobile, etc.
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );
    -- Table de configuration du site
    CREATE TABLE IF NOT EXISTS config (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Insertion des valeurs par défaut pour la configuration
    INSERT OR IGNORE INTO config (key, value) VALUES
        ('site_name', 'Mes Contacts'),
        ('footer_text', '&copy; 2026 Application de Gestion de Contacts')
`);

/**
 * Fonction pour fermer la connexion à la base de données
 */
function closeDatabase() {
    db.close();
}

/**
 * Migration automatique pour ajouter les champs vCard manquants
 */
function migrateContactFields() {
    const newColumns = [
        'titre',
        'prenom_honneur_prefix',
        'prenom_honneur_suffix',
        'surnom',
        'adresse',
        'code_postal',
        'pays',
        'ville',
        'region',
        'anniversaire',
        'conjoint'
    ];

    // Vérifier quelles colonnes existent déjà via PRAGMA table_info
    const columnsInfo = db.prepare('PRAGMA table_info(contacts)').all();
    const existingColumnNames = columnsInfo.map(col => col.name);

    // Filtrer les champs manquants
    const missingFields = newColumns.filter(colName => !existingColumnNames.includes(colName));

    if (missingFields.length > 0) {
        // Construire l'expression ALTER TABLE ADD COLUMN pour chaque champ manquant
        const alterStatements = missingFields.map(fn => `ALTER TABLE contacts ADD COLUMN ${fn} VARCHAR(100)`).join('; ');

        try {
            db.exec(alterStatements);
            console.log('Migration : nouveaux champs ajoutés à la table contacts:', missingFields.join(', '));
        } catch (err) {
            console.error('Erreur migration champs manquants:', err.message);
        }
    } else {
        console.log('Tous les champs vCard existants déjà dans la table contacts');
    }
}

// Exécuter les migrations au démarrage
migrateContactFields();

// Migrer les emails legacy (si nécessaire)
const { migrateContactEmails } = require('./migrate-emails');
migrateContactEmails();

module.exports = {
    db,
    closeDatabase
};
