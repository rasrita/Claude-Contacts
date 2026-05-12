/**
 * Routes de l'API REST pour la gestion des contacts
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configurer Multer pour les uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max 10Mo
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|csv|xlsx?/;
        const extname = allowedTypes.test(
            path.extname(file.originalname).toLowerCase()
        );
        if (!extname) {
            return cb(new Error('Le fichier n\'est pas d\'un type supporté.'));
        }
        cb(null, true);
    }
});

// Importer les contrôleurs
const contactController = require('../controllers/contactController');
const configController = require('../controllers/configController');

/**
 * API pour la gestion des contacts (CRUD complet)
 */

// GET /api/contacts - Obtenir tous les contacts
router.get('/contacts', contactController.getAllContacts);

// GET /api/contacts/:id - Obtenir un contact par ID
router.get('/contacts/:id', contactController.getContactById);

// POST /api/contacts - Créer un nouveau contact
router.post('/contacts', contactController.createContact);

// PUT /api/contacts/:id - Mettre à jour un contact
router.put('/contacts/:id', contactController.updateContact);

// DELETE /api/contacts/:id - Supprimer un contact
router.delete('/contacts/:id', contactController.deleteContact);

/**
 * API pour la fusion de contacts
 */
// POST /api/contacts/:id1/merge/:id2 - Fusionner deux contacts
router.post('/contacts/:id1/merge/:id2', contactController.mergeContacts);

/**
 * API pour la recherche et le filtrage
 */
// GET /api/contacts/search?q={term} - Recherche par terme
router.get('/contacts/search', contactController.searchContacts);

// GET /api/contacts/filter/email?email={email} - Filtrer par email
router.get('/contacts/filter/email', contactController.filterByEmail);

// GET /api/contacts/filter/phone?phone={phone} - Filtrer par téléphone
router.get('/contacts/filter/phone', contactController.filterByPhone);

// GET /api/contacts/filter/organisation?org={org} - Filtrer par organisation
router.get('/contacts/filter/organisation', contactController.filterByOrganisation);

/**
 * API pour la gestion des catégories
 */

// GET /api/categories - Obtenir toutes les catégories
router.get('/categories', contactController.getAllCategories);

// POST /api/categories - Créer une catégorie
router.post('/categories', contactController.createCategory);

// PUT /api/categories/:id - Mettre à jour une catégorie
router.put('/categories/:id', contactController.updateCategory);

// DELETE /api/categories/:id - Supprimer une catégorie
router.delete('/categories/:id', contactController.deleteCategory);

/**
 * API pour la configuration du site
 */

// GET /api/config - Obtenir toutes les configurations
router.get('/config', configController.getAllConfig);

// GET /api/config/:key - Obtenir une configuration par clé
router.get('/config/:key', configController.getConfigByKey);

// PUT /api/config/:key - Mettre à jour une configuration
router.put('/config/:key', configController.updateConfig);

// GET /api/stats - Obtenir les statistiques
router.get('/stats', configController.getStats);

/**
 * API pour l'import/export (CSV, VCF, XLSX)
 */

// POST /api/import/csv - Importer depuis CSV
router.post('/import/csv', upload.single('file'), (req, res) => {
    const csvContent = req.file ? fs.readFileSync(req.file.path, 'utf-8') : req.body.data;

    try {
        // Parcourir les lignes du CSV et créer des contacts
        const lines = csvContent.split('\n').slice(1); // Ignorer l'en-tête

        lines.forEach(line => {
            if (!line.trim()) return;

            const values = line.split(',');
            if (values.length >= 2) {
                // Normalisation des données
                const contactData = {
                    nom: values[0]?.trim() || '',
                    prenom: values[1]?.trim() || '',
                    email: values[2] ? values[2].trim().replace(/"/g, '') : null,
                    telephone: values[3]?.trim() || null,
                    organisation: values[4]?.trim() || null,
                    tags: values[5]?.trim() || '',
                    notes: ''
                };

                // Création du contact via le contrôleur (via une requête directe SQLite)
                const { db } = require('../db/database');

                const insert = db.prepare(`
                    INSERT INTO contacts (nom, prenom, email, telephone, organisation, tags, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);

                const newRow = insert.run(
                    contactData.nom.trim(),
                    contactData.prenom.trim(),
                    contactData.email || null,
                    contactData.telephone || null,
                    contactData.organisation || null,
                    contactData.tags || '',
                    contactData.notes || ''
                );

                // Ajouter les catégories si fournies dans le fichier CSV
                if (values.length > 6) {
                    const categories = values[6].split(';').map(c => c.trim());
                    categories.forEach(catName => {
                        if (catName && catName !== '') {
                            let category_id;
                            const existingCategory = db.prepare(
                                'SELECT id FROM categories WHERE nom = ?'
                            ).get(catName);

                            if (!existingCategory) {
                                const insertCategory = db.prepare('INSERT INTO categories (nom, couleur) VALUES (?, ?)');
                                insertCategory.run(catName, '#70ad47'); // Vert par défaut pour import
                                category_id = insertCategory.lastInsertRowid;
                            } else {
                                category_id = existingCategory.id;
                            }

                            db.prepare('INSERT OR IGNORE INTO contact_categories (contact_id, category_id) VALUES (?, ?)')
                                .run(newRow.lastInsertRowid, category_id);
                        }
                    });
                }
            }
        });

        // Supprimer le fichier uploadé
        if (req.file && req.file.path) {
            require('fs').unlinkSync(req.file.path);
        }

        res.json({ success: true, message: `Import réussi : ${lines.length} contacts créés` });
    } catch (error) {
        console.error('Erreur d\'import CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'import du fichier CSV',
            error: error.message
        });
    }
});

// POST /api/import/vcf - Importer depuis VCF
router.post('/import/vcf', upload.single('file'), (req, res) => {
    try {
        const vcfContent = req.file ? fs.readFileSync(req.file.path, 'utf-8') : '';

        if (!vcfContent.trim()) {
            return res.status(400).json({ success: false, message: 'Aucune donnée dans le fichier VCF' });
        }

        // Parser les contacts VCF avec vcard-parser
        const parsedVcards = vcardParser.parse(vcfContent);

        if (!parsedVcards || parsedVcards.length === 0) {
            return res.status(400).json({ success: false, message: 'Aucun contact trouvé dans le fichier VCF' });
        }

        // Créer chaque contact via les méthodes API pour maintenir la cohérence avec catégories
        const { db } = require('../db/database');

        parsedVcards.forEach(vcard => {
            const insert = db.prepare(`
                INSERT INTO contacts (nom, prenom, email, telephone, organisation, tags, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            // Construire les notes avec tous les champs vCard standards disponibles
            let fullNotes = '';
            const noteFields = [
                vcard.honorific_prefix,
                vcard.honorific_suffix,
                vcard.nickname,
                vcard.title,
                vcard.birthday,
                vcard.anniversary,
                vcard.spouse,
                vcard.children,
                vcard.address,
                vcard.postal_code,
                vcard.country,
                vcard.locality,
                vcard.region
            ].filter(f => f).map(f => String(f)).join(' | ');

            const newRow = insert.run(
                vcard.family_name || '',
                vcard.given_name || '',
                vcard.emails?.[0]?.address || null,
                vcard.telephones?.[0]?.number || null,
                vcard.organisation || vcard.company || null,
                (vcard.notes || '') + (vcard.tags ? ';' + vcard.tags : ''),
                fullNotes
            );

            // Ajouter les catégories si présentes
            if (contact.categories && Array.isArray(contact.categories)) {
                contact.categories.forEach(catName => {
                    let category_id;
                    const existingCategory = db.prepare(
                        'SELECT id FROM categories WHERE nom = ?'
                    ).get(catName);

                    if (!existingCategory) {
                        const insertCategory = db.prepare('INSERT INTO categories (nom, couleur) VALUES (?, ?)');
                        insertCategory.run(catName, '#70ad47'); // Vert par défaut
                        category_id = insertCategory.lastInsertRowid;
                    } else {
                        category_id = existingCategory.id;
                    }

                    db.prepare('INSERT OR IGNORE INTO contact_categories (contact_id, category_id) VALUES (?, ?)')
                        .run(newRow.lastInsertRowid, category_id);
                });
            }
        });

        // Supprimer le fichier uploadé
        if (req.file && req.file.path) {
            require('fs').unlinkSync(req.file.path);
        }

        res.json({ success: true, message: `Import réussi : ${vcfContacts.length} contacts créés` });
    } catch (error) {
        console.error('Erreur d\'import VCF:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'import du fichier VCF',
            error: error.message
        });
    }
});

// POST /api/export/csv - Exporter vers CSV
router.post('/export/csv', (req, res) => {
    const { ids } = req.body; // IDs des contacts à exporter (optionnel)

    let sql = 'SELECT id, prenom as "Prénom", nom as "Nom", email as "Email", telephone as "Téléphone", organisation as "Organisation", tags as "Tags", notes as "Notes" FROM contacts';
    let parameters = [];

    if (ids && ids.length > 0) {
        sql += ' WHERE id IN (' + ids.map(() => '?').join(',') + ')';
        parameters.push(...ids);
    } else {
        sql += ' ORDER BY prenom ASC, nom ASC';
    }

    const contacts = db.prepare(sql).all(...parameters);

    // Exporter avec csv-stringify
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts_export.csv"');

    const stringify = require('csv-stringify');
    stringify(contacts, {
        headers: ['Prénom', 'Nom', 'Email', 'Téléphone', 'Organisation', 'Tags', 'Notes'],
        quoted: true
    }).pipe(res);
});

// POST /export/vcf - Exporter vers VCF (format simple sans bibliothèque externe)
router.post('/export/vcf', (req, res) => {
    const { ids } = req.body; // IDs des contacts à exporter (optionnel)

    let sql = 'SELECT id, prenom as givenName, nom as familialName, email, telephone, organisation, tags FROM contacts';
    let parameters = [];

    if (ids && ids.length > 0) {
        sql += ' WHERE id IN (' + ids.map(() => '?').join(',') + ')';
        parameters.push(...ids);
    } else {
        sql += ' ORDER BY prenom ASC, nom ASC';
    }

    const contacts = db.prepare(sql).all(...parameters);

    // Générer un fichier VCF simple (format vCard 3.0) sans bibliothèque externe
    let vcfContent = 'BEGIN:VCARD\nVERSION:3.0\n';

    contacts.forEach(contact => {
        // Nom complet (family name ; given name)
        vcfContent += `N:${(contact.nom || '')};${(contact.prenom || '')}\n`;

        // Titre, honneurs
        if (contact.titre) { vcfContent += `TITLE:${contact.titre}\n`; }
        if (contact.prenom_honneur_prefix) { vcfContent += `HONORIFIC-PREFIX:${contact.prenom_honneur_prefix}\n`; }
        if (contact.prenom_honneur_suffix) { vcfContent += `HONORIFIC-SUFFIX:${contact.prenom_honneur_suffix}\n`; }
        if (contact.surnom) { vcfContent += `NICKNAME:${contact.surnom}\n`; }

        // Email(s)
        if (contact.email) {
            contact.email.split(';').forEach(email => {
                vcfContent += `EMAIL;TYPE=INTERNET:${email.trim()}\n`;
            });
        }

        // Téléphone(s)
        if (contact.telephone) {
            contact.telephone.split(';').forEach(tele => {
                vcfContent += `TEL;TYPE=CELL,WORK:${tele.trim()}\n`;
            });
        }

        // Organisation
        if (contact.organisation) { vcfContent += `ORG:${contact.organisation}\n`; }

        // Adresse complète
        if (contact.adresse) { vcfContent += `ADR;TYPE=HOME;;${contact.adresse};;\n`; }
        if (contact.code_postal) { vcfContent += `ADR;TYPE=HOME:;:${contact.code_postal};;\n`; }
        if (contact.pays) { vcfContent += `COUNTRY-REGION:${contact.pays}\n`; }
        if (contact.ville) { vcfContent += `LOCALITY:${contact.ville}\n`; }
        if (contact.region) { vcfContent += `SUBDIVISION:${contact.region}\n`; }

        // Anniversaire
        if (contact.anniversaire) { vcfContent += `BDAY:${contact.anniversaire}\n`; }

        // Spouse / Children
        if (contact.conjoint) { vcfContent += `SPOUSE:${contact.conjoint}\n`; }
        if (contact.enfants) { vcfContent += `CHILD:${contact.enfants}\n`; }

        // Tags (dans NOTE)
        if (contact.tags) { vcfContent += `NOTE;X-CUSTOM-TAGS:${contact.tags}\n`; }

        // Notes complètes
        if (contact.notes) { vcfContent += `NOTE:${contact.notes}\n`; }

        vcfContent += 'END:VCARD\n';
    });

    res.setHeader('Content-Type', 'text/vcard');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts_export.vcf"');
    res.send(vcfContent);
});

// POST /api/export/xlsx - Exporter vers Excel (XLSX)
router.post('/export/xlsx', (req, res) => {
    const { ids } = req.body; // IDs des contacts à exporter (optionnel)

    let sql = 'SELECT id, prenom, nom, email, telephone, organisation, tags, notes FROM contacts';
    let parameters = [];

    if (ids && ids.length > 0) {
        sql += ' WHERE id IN (' + ids.map(() => '?').join(',') + ')';
        parameters.push(...ids);
    } else {
        sql += ' ORDER BY prenom ASC, nom ASC';
    }

    const contacts = db.prepare(sql).all(...parameters);

    // Exporter vers XLSX avec xlsx (SheetJS)
    try {
        const workbook = require('xlsx').workbook;
        const worksheet = require('xlsx').utils.aoa_to_sheet(contacts.map(contact => ({
            'ID': contact.id,
            'Prénom': contact.prenom,
            'Nom': contact.nom,
            'Email': contact.email || '',
            'Téléphone': contact.telephone || '',
            'Organisation': contact.organisation || '',
            'Tags': contact.tags || '',
            'Notes': contact.notes || ''
        })));

        const workbookExport = require('xlsx').workbook_new();
        workbookExport.Sheets["Contacts"] = worksheet;
        workbookExport.SheetNames.push("Contacts");

        // Exporter le fichier Excel
        const buffer = require('xlsx').write(workbookExport, { type: 'binary' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="contacts_export.xlsx"');
        res.send(buffer);
    } catch (error) {
        console.error('Erreur d\'export XLSX:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'export du fichier Excel',
            error: error.message
        });
    }
});

// POST /api/clear-db - Vider la base de données (CASCADE sur toutes les tables)
router.post('/clear-db', (req, res) => {
    const db = require('../db/database').db;

    try {
        // Supprimer avec CASCADE pour gérer les relations étrangères :
        // contacts -> contact_categories -> categories
        // C'est l'ordre inverse de la cascade naturelle (contact_categories → contacts → categories)

        const deleteContactCategories = db.prepare('DELETE FROM contact_categories');
        const deleteContacts = db.prepare('DELETE FROM contacts');
        const deleteCategories = db.prepare('DELETE FROM categories');
        const deleteContactCategoryLinks = db.prepare('DELETE FROM contact_categories'); // lien catégorie-contact

        deleteContactCategories.run();
        deleteContacts.run();
        deleteCategories.run();

        res.json({ success: true, message: 'La base de données a été vidée avec succès' });
    } catch (error) {
        console.error('Erreur de vidage de la base de données:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du vidage de la base de données',
            error: error.message
        });
    }
});

module.exports = router;
