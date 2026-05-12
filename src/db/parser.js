/**
 * Utilitaires de parsing pour les fichiers d'import
 */

/**
 * Parser un fichier CSV en tableaux d'objets
 */
function parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Extraire les en-têtes de la première ligne
    const headers = extractHeaders(lines[0]);

    // Parser chaque ligne
    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const contact = {};
        headers.forEach((header, index) => {
            let value = values[index] || '';
            value = value.trim();
            // Nettoyer les guillemets CSV
            value = value.replace(/^"|"$/g, '');

            // Conversion des types selon l'entête
            switch (header.toLowerCase()) {
                case 'email':
                    contact.email = value;
                    break;
                case 'telephone':
                case 'phone':
                case 'tel':
                    contact.telephone = value;
                    break;
                case 'organisation':
                case 'company':
                case 'org':
                    contact.organisation = value;
                    break;
                case 'tags':
                    contact.tags = value;
                    break;
                case 'notes':
                    contact.notes = value;
                    break;
            }
        });
        return contact;
    });
}

/**
 * Extraire les en-têtes d'une ligne CSV (gestion des guillemets)
 */
function extractHeaders(line) {
    const headers = [];
    let currentHeader = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            headers.push(currentHeader.trim());
            currentHeader = '';
        } else {
            currentHeader += char;
        }
    }
    headers.push(currentHeader.trim());

    // Retourner uniquement les en-têtes pertinents
    return headers.filter(h => {
        const lower = h.toLowerCase();
        return [
            'nom', 'prénom', 'email', 'telephone', 'phone', 'tel',
            'organisation', 'company', 'org',
            'tags', 'catégories', 'categories',
            'notes'
        ].some(keyword => lower.includes(keyword));
    });
}

/**
 * Parser une ligne CSV simple (sans gestion des guillemets complexes)
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);

    return values.map(v => v.trim().replace(/^"|"$/g, ''));
}

/**
 * Parser un fichier VCF en tableaux d'objets
 */
function parseVCF(vcfContent) {
    const contacts = [];
    let currentContact = null;
    let currentGroupedData = {};

    // Regex pour extraire les données vCard
    const fnRegex = /(?:FN[^:]*:)?([^,\n]+)/i;
    const gnRegex = /(?:N[^:]*:)?([^,\/\n]+)/i;
    const emailRegex = /EMAIL:(?:[^;\n]*;)*?(.*?)(?=[;,]|$)/gi;
    const telRegex = /TEL:(?:[^;\n]*;)*?(.*?)(?=[;,]|$)|TYPE:WORK/i;
    const orgRegex = /ORG([^;\n]*;)*?(.*?)NAME(.*?)(?=[;,]|$)|[Oo][Rr][Gg]:(.+)$/i;
    const tagRegex = /(?:CATEGORIES[^:]*:)?([^,\n]+)/i;
    const noteRegex = /NOTE:[^,]*:(.*)/i;

    // Fonction pour ajouter un contact
    function addContact() {
        if (!currentContact) return null;

        // Nettoyer les données1
        currentContact.familialName = cleanValue(currentContact.familialName);
        currentContact.givenName = cleanValue(currentContact.givenName);
        currentContact.emails = extractValues(currentContact.emails);
        currentContact.telephone = cleanValue(extractSingleValue(currentContact.telephone, { type: 'work' }));
        currentContact.organisation = cleanValue(extractSingleValue(currentContact.org, { type: 'work' }));
        currentContact.tags = cleanValue(currentContact.tags);
        currentContact.note = cleanValue(currentContact.note);

        // Nettoyer le nom (normaliser)
        let fullNameParts = [];
        if (currentContact.familialName) {
            fullNameParts.push(currentContact.familialName.trim());
        }
        if (currentContact.givenName) {
            fullNameParts.unshift(currentContact.givenName.trim());
        }

        const contactData = {
            familialName: currentContact.familialName || '',
            givenName: currentContact.givenName || '',
            fullName: fullNameParts.join(' ') || '',
            email: currentContact.emails[0] || null,
            telephone: currentContact.telephone || null,
            organisation: currentContact.organisation || null,
            tags: currentContact.tags || '',
            note: currentContact.note || ''
        };

        return contactData;
    }

    // Parser ligne par ligne
    const lines = vcfContent.split('\n');
    let inContactBlock = false;

    for (let line of lines) {
        line = line.trim();

        // Ignorer les lignes vides et BEGIN:VCARD/END:VCARD
        if (!line || line.toUpperCase() === 'BEGIN:VCARD' || line.toUpperCase() === 'END:VCARD') {
            continue;
        }

        // Fin d'un contact
        if (line.toUpperCase() === 'END:VCARD') {
            const contact = addContact();
            if (contact && (contact.fullName || contact.email)) {
                contacts.push(contact);
            }
            currentContact = null;
            inContactBlock = false;
            currentGroupedData = {};
        } else if (line.toUpperCase().startsWith('BEGIN:VCARD')) {
            // Ajouter le précédent avant de commencer un nouveau
            const contact = addContact();
            if (contact && (contact.fullName || contact.email)) {
                contacts.push(contact);
            }

            currentContact = {};
            inContactBlock = true;
        } else if (inContactBlock) {
            // Extraire les données du contact actuel
            if (/^FN:/.test(line)) {
                const match = line.match(fnRegex);
                currentContact.familialName = match ? match[1] : '';
            } else if (/^N:/.test(line)) {
                // Format N;Prenom;Nom (ou inversement)
                const parts = line.replace('N:', '').split(';');
                currentContact.givenName = parts[0];
                currentContact.familialName = parts[1] || '';
            } else if (/^EMAIL:/.test(line)) {
                const emails = extractAllMatches(emailRegex);
                currentContact.emails = emails;
            } else if (/^TEL:/.test(line)) {
                let telValue = extractSingleMatch(telRegex, { type: 'work' }) || line.replace('TEL:', '').replace('TYPE:WORK', '');
                // Extraire la valeur entre crochets ou parenthèses
                telValue = telValue.match(/[\[()][-+0-9\s]+/) ? telValue.match(/[\[()][-+0-9\s]+)/)[0] : telValue;
                currentContact.telephone = telValue;
            } else if (/^ORG:/.test(line)) {
                const orgMatch = line.match(/[Oo][Rr][Gg]:(.*)/i);
                currentContact.org = orgMatch ? orgMatch[1] : '';
            } else if (/^CATEGORIES:/.test(line)) {
                const categories = extractValues(currentGroupedData.tags);
                currentContact.tags = categories;
            } else if (/^NOTE:/.test(line)) {
                currentContact.note = line.replace('NOTE:', '').trim();
            } else if (line && !/^(REV|UID|VERSION|DT\w+):/.test(line)) {
                // Ajouter à un champ générique pour les autres attributs
                currentGroupedData.tags = line;
            }
        }
    }

    // Ajouter le dernier contact
    const lastContact = addContact();
    if (lastContact && (lastContact.fullName || lastContact.email)) {
        contacts.push(lastContact);
    }

    return contacts;
}

function parseVCF0(vcfContent) {
    const contacts = [];
    let currentContact = null;
    console.debug("parseVCF");
    // Nettoyage simple des valeurs
    const clean = (val) => val ? val.trim().replace(/\\,/g, ',') : '';

    const lines = vcfContent.split(/\r?\n/);

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.toUpperCase().startsWith('BEGIN:VCARD')) {
            currentContact = { emails: [], phones: [], tags: '', note: '', org: '' };
            continue;
        }

        if (line.toUpperCase().startsWith('END:VCARD')) {
            if (currentContact) {
                // Construction du nom complet si FN est manquant
                const fullName = currentContact.fn || `${currentContact.givenName} ${currentContact.familialName}`.trim();
                
                contacts.push({
                    familialName: currentContact.familialName || '',
                    givenName: currentContact.givenName || '',
                    fullName: fullName,
                    email: currentContact.emails[0] || null, // On prend le premier
                    telephone: currentContact.phones[0] || null,
                    organisation: currentContact.org || null,
                    tags: currentContact.tags || '',
                    note: currentContact.note || ''
                });
            }
            currentContact = null;
            continue;
        }

        if (!currentContact) continue;

        // Extraction de la clé et de la valeur (gestion des préfixes item1. et des paramètres ;)
        const match = line.match(/^([^:]+):(.+)$/);
        if (!match) continue;

        let [ , keyPart, value] = match;
        const key = keyPart.toUpperCase();

        // Logique d'extraction par type de champ
        if (key.includes('FN')) {
            currentContact.fn = clean(value);
        } 
        else if (key.includes('N') && !key.includes('FN')) {
            const parts = value.split(';');
            currentContact.familialName = clean(parts[0]);
            currentContact.givenName = clean(parts[1]);
        } 
        else if (key.includes('EMAIL')) {
            currentContact.emails.push(clean(value));
        } 
        else if (key.includes('TEL')) {
            currentContact.phones.push(clean(value));
        } 
        else if (key.includes('ORG')) {
            currentContact.org = clean(value.split(';')[0]);
        } 
        else if (key.includes('CATEGORIES')) {
            currentContact.tags = clean(value);
        } 
        else if (key.includes('NOTE')) {
            currentContact.note = clean(value);
        }
    }
    console.log(currentContact);
    return contacts;
}

// Exemple d'utilisation avec ton contenu
/*
const vcfData = `BEGIN:VCARD
VERSION:3.0
FN:Bruno Anretard
N:Anretard;Bruno;;;
item1.EMAIL;TYPE=INTERNET:ban@info-services.biz
item2.EMAIL;TYPE=INTERNET:bruno.anretard@ge.com
TEL;TYPE=CELL:0696909111
item8.TEL:+596 596 30 02 81
ORG:Info Services;IT
CATEGORIES:Importé,myContacts
END:VCARD`;

console.log(parseVCF(vcfData));
*/

/**
 * Nettoyer une valeur (supprimer les guillemets, espaces superflus)
 */
function cleanValue(value) {
    if (!value) return '';
    return value.replace(/^"|"$/g, '').trim();
}

/**
 * Extraire toutes les correspondances d'une regex
 */
function extractAllMatches(regex) {
    const matches = [];
    let match;
    while ((match = regex.exec(match)) !== null) {
        if (match[0]) matches.push(cleanValue(match[1] || match[0]));
    }
    return matches;
}

/**
 * Extraire une valeur unique avec options
 */
function extractSingleValue(text, options = {}) {
    let result = cleanValue(text);

    // Extraire la valeur entre crochets ou parenthèses
    const valueMatch = result.match(/[\[()][-+0-9\s.,-]+/i);
    if (valueMatch) {
        return cleanValue(valueMatch[0]);
    }

    return result;
}

/**
 * Extraire une seule correspondance avec options de type
 */
function extractSingleMatch(regex, options = {}) {
    const match = regex.exec('');
    if (match && match[1]) {
        return cleanValue(match[1]);
    }
    return null;
}

/**
 * Extraire des valeurs d'un champ vCard
 */
function extractValues(field) {
    if (!field) return [];
    const values = field.split(';');
    return values.map(v => cleanValue(v));
}

module.exports = {
    parseCSV,
    parseVCF,
    extractHeaders,
    parseCSVLine
};
