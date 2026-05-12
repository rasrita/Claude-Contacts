/**
 * Contrôleur pour la gestion des contacts
 */
const { db } = require('../db/database');

/**
 * Obtenir tous les contacts avec leurs catégories
 */
exports.getAllContacts = (req, res) => {
    try {
        // Récupérer tous les contacts
        const contacts = db.prepare('SELECT * FROM contacts ORDER BY prenom ASC, nom ASC').all();

        // Ajouter les catégories pour chaque contact
        const contactsWithCategories = contacts.map(contact => {
            const categories = db.prepare(
                'SELECT c.nom, c.couleur FROM contact_categories cc ' +
                'JOIN categories c ON cc.category_id = c.id WHERE cc.contact_id = ?'
            ).all(contact.id);
            return { ...contact, categories: categories };
        });

        res.json({ success: true, data: contactsWithCategories });
    } catch (error) {
        console.error('Erreur getAllContacts:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Obtenir un contact par ID
 */
exports.getContactById = (req, res) => {
    try {
        const { id } = req.params;
        const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);

        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contact non trouvé' });
        }

        // Récupérer les catégories
        const categories = db.prepare(
            'SELECT c.nom, c.couleur FROM contact_categories cc ' +
            'JOIN categories c ON cc.category_id = c.id WHERE cc.contact_id = ?'
        ).all(id);

        res.json({ success: true, data: { ...contact, categories } });
    } catch (error) {
        console.error('Erreur getContactById:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Créer un nouveau contact
 */
exports.createContact = (req, res) => {
    try {
        const { nom, prenom, titre, prenom_honneur_prefix, prenom_honneur_suffix, surnom, email, telephone, organisation, adresse, code_postal, pays, ville, region, anniversaire, jour_anniversaire, conjoint, enfants, tags, notes, categories } = req.body;

        // Insertion du contact
        const insert = db.prepare(`
            INSERT INTO contacts (nom, prenom, titre, prenom_honneur_prefix, prenom_honneur_suffix, surnom, email, telephone, organisation, adresse, code_postal, pays, ville, region, anniversaire, tags, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insert.run(
            nom || '', prenom || '', titre || null,
            prenom_honneur_prefix || null, prenom_honneur_suffix || null, surnom || null,
            email || null, telephone || null, organisation || null, adresse || null,
            code_postal || null, pays || null, ville || null, region || null,
            anniversaire ? new Date(anniversaire).toISOString().split('T')[0] : null,
            tags || '', notes || ''
        );

        const newContact = db.prepare('SELECT last_insert_rowid() as id').get();

        // Ajouter les catégories si fournies
        if (categories && Array.isArray(categories)) {
            categories.forEach(category => {
                let category_id;
                // Vérifier si la catégorie existe, sinon la créer
                const existingCategory = db.prepare(
                    'SELECT id FROM categories WHERE nom = ?'
                ).get(category.nom);

                if (!existingCategory) {
                    const insertCategory = db.prepare('INSERT INTO categories (nom, couleur) VALUES (?, ?)');
                    // Couleur aléatoire si non fournie
                    const color = category.couleur || getRandomColor();
                    insertCategory.run(category.nom, color);
                    category_id = insertCategory.lastInsertRowid;
                } else {
                    category_id = existingCategory.id;
                }

                db.prepare('INSERT INTO contact_categories (contact_id, category_id) VALUES (?, ?)')
                    .run(newContact.id, category_id);
            });
        }

        // Récupérer le contact complet avec ses catégories
        const contactWithCategories = getContactWithCategories(newContact.id);

        res.status(201).json({ success: true, data: contactWithCategories });
    } catch (error) {
        console.error('Erreur createContact:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Mettre à jour un contact
 */
exports.updateContact = (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        // Vérifier l'existence du contact
        const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Contact non trouvé' });
        }

        // Mise à jour des champs optionnels (ne pas modifier created_at)
        const updateFields = [];
        let values = [id];

        if (updatedData.nom !== undefined) { updateFields.push('nom = ?'); values.push(updatedData.nom); }
        if (updatedData.prenom !== undefined) { updateFields.push('prenom = ?'); values.push(updatedData.prenom); }
        if (updatedData.titre !== undefined) { updateFields.push('titre = ?'); values.push(updatedData.titre || null); }
        if (updatedData.prenom_honneur_prefix !== undefined) { updateFields.push('prenom_honneur_prefix = ?'); values.push(updatedData.prenom_honneur_prefix || null); }
        if (updatedData.prenom_honneur_suffix !== undefined) { updateFields.push('prenom_honneur_suffix = ?'); values.push(updatedData.prenom_honneur_suffix || null); }
        if (updatedData.surnom !== undefined) { updateFields.push('surnom = ?'); values.push(updatedData.surnom || null); }
        if (updatedData.email !== undefined) { updateFields.push('email = ?'); values.push(updatedData.email || null); }
        if (updatedData.telephone !== undefined) { updateFields.push('telephone = ?'); values.push(updatedData.telephone || null); }
        if (updatedData.organisation !== undefined) { updateFields.push('organisation = ?'); values.push(updatedData.organisation || null); }
        if (updatedData.adresse !== undefined) { updateFields.push('adresse = ?'); values.push(updatedData.adresse || null); }
        if (updatedData.code_postal !== undefined) { updateFields.push('code_postal = ?'); values.push(updatedData.code_postal || null); }
        if (updatedData.pays !== undefined) { updateFields.push('pays = ?'); values.push(updatedData.pays || null); }
        if (updatedData.ville !== undefined) { updateFields.push('ville = ?'); values.push(updatedData.ville || null); }
        if (updatedData.region !== undefined) { updateFields.push('region = ?'); values.push(updatedData.region || null); }
        if (updatedData.anniversaire !== undefined) { updateFields.push('anniversaire = ?'); values.push(updatedData.anniversaire ? new Date(updatedData.anniversaire).toISOString().split('T')[0] : null); }
        if (updatedData.tags !== undefined) { updateFields.push('tags = ?'); values.push(updatedData.tags || ''); }
        if (updatedData.notes !== undefined) { updateFields.push('notes = ?'); values.push(updatedData.notes || ''); }

        // Mise à jour de updated_at
        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: 'Aucun champ à modifier' });
        }

        const updateStmt = db.prepare(`UPDATE contacts SET ${updateFields.join(', ')} WHERE id = ?`);
        updateStmt.run(...values);

        // Gestion des catégories (suppression et réajout)
        if (updatedData.categories !== undefined) {
            // Supprimer les anciennes catégories
            db.prepare('DELETE FROM contact_categories WHERE contact_id = ?').run(id);

            // Ajouter les nouvelles catégories
            if (Array.isArray(updatedData.categories)) {
                updatedData.categories.forEach(category => {
                    let category_id;
                    const existingCategory = db.prepare(
                        'SELECT id FROM categories WHERE nom = ?'
                    ).get(category.nom);

                    if (!existingCategory) {
                        const insertCategory = db.prepare('INSERT INTO categories (nom, couleur) VALUES (?, ?)');
                        const color = category.couleur || getRandomColor();
                        insertCategory.run(category.nom, color);
                        category_id = insertCategory.lastInsertRowid;
                    } else {
                        category_id = existingCategory.id;
                    }

                    db.prepare('INSERT INTO contact_categories (contact_id, category_id) VALUES (?, ?)')
                        .run(id, category_id);
                });
            }
        }

        // Récupérer le contact mis à jour
        const updatedContact = getContactWithCategories(id);

        res.json({ success: true, data: updatedContact });
    } catch (error) {
        console.error('Erreur updateContact:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Supprimer un contact
 */
exports.deleteContact = (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier l'existence du contact
        const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Contact non trouvé' });
        }

        // Supprimer le contact (les catégories sont supprimées automatiquement via CASCADE)
        db.prepare('DELETE FROM contacts WHERE id = ?').run(id);

        res.json({ success: true, message: 'Contact supprimé avec succès' });
    } catch (error) {
        console.error('Erreur deleteContact:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Obtenir un contact avec ses catégories
 */
function getContactWithCategories(contactId) {
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);

    if (!contact) return null;

    const categories = db.prepare(
        'SELECT c.nom, c.couleur FROM contact_categories cc ' +
        'JOIN categories c ON cc.category_id = c.id WHERE cc.contact_id = ?'
    ).all(contactId);

    return { ...contact, categories };
}

/**
 * Générer une couleur aléatoire hexadécimale
 */
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

/**
 * Fusionner deux contacts (détection de doublons)
 */
exports.mergeContacts = (req, res) => {
    try {
        const { id1, id2 } = req.params;

        // Vérifier l'existence des deux contacts
        const contact1 = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id1);
        const contact2 = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id2);

        if (!contact1 || !contact2) {
            return res.status(404).json({ success: false, message: 'Un ou les deux contacts non trouvés' });
        }

        // Création du nouveau contact fusionné
        const insert = db.prepare(`
            INSERT INTO contacts (nom, prenom, titre, prenom_honneur_prefix, prenom_honneur_suffix, surnom, email, telephone, organisation, adresse, code_postal, pays, ville, region, anniversaire, tags, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const newRow = insert.run(
            contact2.nom || contact1.nom, contact2.prenom || contact1.prenom, contact2.titre || contact1.titre,
            contact2.prenom_honneur_prefix || contact1.prenom_honneur_prefix, contact2.prenom_honneur_suffix || contact1.prenom_honneur_suffix,
            contact2.surnom || contact1.surnom,
            (contact1.email || contact2.email) || null,
            (contact1.telephone || contact2.telephone) || null,
            (contact1.organisation || contact2.organisation) || null,
            contact1.adresse || contact2.adresse,
            contact1.code_postal || contact2.code_postal,
            contact1.pays || contact2.pays,
            contact1.ville || contact2.ville,
            contact1.region || contact2.region,
            (contact1.anniversaire || contact2.anniversaire) || null,
            `${contact1.tags || ''};${contact2.tags || ''}`.replace(/;/g, ',').trim(),
            (contact1.notes || '') + '\n\n(Fusion avec ' + (contact1.nom || contact1.prenom) + ')' + '\n\n' + (contact2.notes || '')
        );

        const newContactId = newRow.lastInsertRowid;

        // Fusionner les catégories
        db.prepare('INSERT OR REPLACE INTO contact_categories (contact_id, category_id) ' +
            'SELECT ?, cc.category_id FROM contact_categories cc WHERE cc.contact_id = ?')
            .run(newContactId, id1);

        db.prepare('INSERT OR REPLACE INTO contact_categories (contact_id, category_id) ' +
            'SELECT ?, cc.category_id FROM contact_categories cc WHERE cc.contact_id = ?')
            .run(newContactId, id2);

        // Supprimer le premier contact
        db.prepare('DELETE FROM contacts WHERE id = ?').run(id1);

        // Récupérer le nouveau contact fusionné
        const mergedContact = getContactWithCategories(newContactId);

        res.json({ success: true, data: {
            message: `Contacts ${id1} et ${id2} fusionnés`,
            newContactId,
            oldContactIds: [id1, id2],
            contact: mergedContact
        }});
    } catch (error) {
        console.error('Erreur mergeContacts:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Recherche de contacts contenant les termes donnés
 */
exports.searchContacts = (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.json({ success: true, data: [] });
        }

        const searchTerm = `%${q}%`;

        const results = db.prepare(`
            SELECT id, nom, prenom, titre, prenom_honneur_prefix, prenom_honneur_suffix, surnom, email, telephone, organisation, adresse, code_postal, pays, ville, region, anniversaire, tags, notes, created_at, updated_at
            FROM contacts
            WHERE LOWER(nom) LIKE ? OR LOWER(prenom) LIKE ? OR LOWER(email) LIKE ? OR LOWER(telephone) LIKE ?
               OR LOWER(titre) LIKE ? OR LOWER(surnom) LIKE ? OR LOWER(organisation) LIKE ?
               OR LOWER(adresse) LIKE ? OR LOWER(pays) LIKE ? OR LOWER(ville) LIKE ?
            ORDER BY prenom ASC, nom ASC
        `).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);

        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Erreur searchContacts:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Filtrer les contacts par email
 */
exports.filterByEmail = (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.json({ success: true, data: [] });
        }

        const results = db.prepare('SELECT * FROM contacts WHERE LOWER(email) LIKE ? ORDER BY prenom ASC')
            .all('%' + email.toLowerCase() + '%');

        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Erreur filterByEmail:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Filtrer les contacts par téléphone
 */
exports.filterByPhone = (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.json({ success: true, data: [] });
        }

        const results = db.prepare('SELECT * FROM contacts WHERE LOWER(telephone) LIKE ? ORDER BY prenom ASC')
            .all('%' + phone.toLowerCase() + '%');

        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Erreur filterByPhone:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Filtrer les contacts par organisation
 */
exports.filterByOrganisation = (req, res) => {
    try {
        const { org } = req.query;

        if (!org) {
            return res.json({ success: true, data: [] });
        }

        const results = db.prepare('SELECT * FROM contacts WHERE LOWER(organisation) LIKE ? ORDER BY prenom ASC')
            .all('%' + org.toLowerCase() + '%');

        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Erreur filterByOrganisation:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Obtenir toutes les catégories disponibles
 */
exports.getAllCategories = (req, res) => {
    try {
        const categories = db.prepare('SELECT id, nom, couleur, created_at FROM categories ORDER BY nom ASC').all();
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Erreur getAllCategories:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Créer une nouvelle catégorie
 */
exports.createCategory = (req, res) => {
    try {
        const { nom, couleur } = req.body;

        if (!nom || nom.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Le nom de la catégorie est obligatoire' });
        }

        // Normaliser le nom (supprimer les accents, majuscule initiale)
        const normalizedNom = normalizeText(nom);
        const color = couleur || getRandomColor();

        const insert = db.prepare(`
            INSERT INTO categories (nom, couleur) VALUES (?, ?)
        `);

        insert.run(normalizedNom.trim(), color);

        res.status(201).json({ success: true, message: 'Catégorie créée avec succès', data: { nom: normalizedNom.trim(), couleur: color } });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ success: false, message: `La catégorie « ${req.body.nom} » existe déjà` });
        }
        console.error('Erreur createCategory:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur : ' + error.message });
    }
};

/**
 * Mettre à jour une catégorie
 */
exports.updateCategory = (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        // Vérifier l'existence de la catégorie
        const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
        }

        const updateFields = [];
        let values = [id];

        if (updatedData.nom !== undefined) {
            const normalizedNom = normalizeText(updatedData.nom);
            updateFields.push('nom = ?');
            values.push(normalizedNom.trim());
        }
        if (updatedData.couleur !== undefined) {
            updateFields.push('couleur = ?');
            values.push(updatedData.couleur);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: 'Aucun champ à modifier' });
        }

        const updateStmt = db.prepare(`UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`);
        updateStmt.run(...values);

        res.json({ success: true, data: { ...existing, nom: updatedData.nom?.trim() || existing.nom, couleur: updatedData.couleur || existing.couleur } });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ success: false, message: `La catégorie « ${req.body.nom} » existe déjà` });
        }
        console.error('Erreur updateCategory:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur : ' + error.message });
    }
};

/**
 * Supprimer une catégorie
 */
exports.deleteCategory = (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier l'existence de la catégorie
        const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
        }

        // Supprimer les associations contact-catégorie (via CASCADE dans la table foreign key)
        db.prepare('DELETE FROM categories WHERE id = ?').run(id);

        res.json({ success: true, message: 'Catégorie supprimée avec succès' });
    } catch (error) {
        console.error('Erreur deleteCategory:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Normaliser le texte (supprimer les accents et normaliser)
 */
function normalizeText(text) {
    if (!text) return '';
    let normalized = text.normalize('NFD');
    normalized = normalized.replace(/[̀-ͯ]/g, ''); // Supprimer les diacritiques
    normalized = normalized.toUpperCase();
    return normalized;
}
