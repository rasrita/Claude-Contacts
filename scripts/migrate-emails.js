/**
 * Script de migration des emails legacy vers contact_emails
 * À exécuter via: node scripts/migrate-emails.js
 */

const { migrateContactEmails } = require('../src/db/migrate-emails');

console.log('=== Migration des emails ===');
//migrateContactEmails();
