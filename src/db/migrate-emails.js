/**
 * Migration pour transférer les emails existants de contacts.email vers contact_emails
 * Cette migration doit être exécutée une seule fois pour migrer les emails legacy
 */

const { db } = require('./database');

function migrateContactEmails() {
    try {
        // Récupérer tous les contacts qui ont un email dans la colonne email
        const oldEmailContacts = db.prepare(`
            SELECT id, email FROM contacts
            WHERE email IS NOT NULL AND email != '' AND LOWER(email) LIKE '%@%'
        `).all();

        if (oldEmailContacts.length === 0) {
            console.log('Migration emails: Aucun email legacy à migrer');
            return;
        }

        // Migrer chaque email vers contact_emails
        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO contact_emails (contact_id, email, type)
            SELECT id, email, 'work' FROM contacts WHERE id = ? AND email != ''
        `);

        let migratedCount = 0;
        oldEmailContacts.forEach(contact => {
            const rowsAffected = insertStmt.run(contact.id);
            if (rowsAffected.changes > 0) {
                migratedCount++;
            }
        });

        console.log(`Migration emails: ${migratedCount} emails migrés de contacts.email vers contact_emails`);

        // Vérifier s'il reste des contacts avec des emails dans la colonne email legacy
        const remainingLegacy = db.prepare(`
            SELECT id, email FROM contacts
            WHERE email IS NOT NULL AND email != '' AND LOWER(email) LIKE '%@%'
        `).all();

        if (remainingLegacy.length === 0) {
            console.log('Migration emails: Tous les emails legacy ont été migrés');
        } else {
            console.log(`Migration emails: ${remainingLegacy.length} contacts conservent encore leurs emails dans la colonne legacy`);
        }

    } catch (error) {
        console.error('Erreur lors de la migration des emails:', error.message);
    }
}

module.exports = { migrateContactEmails };
