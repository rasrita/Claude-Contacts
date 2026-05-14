/**
 * Application de Gestion de Contacts - Script Principal
 * Gère toutes les interactions frontend avec l'API backend
 */

// ==============================
// FONCTIONS DE PARSE (import CSV/VCF)
// ==============================
/**
 * Parse une ligne CSV simple (sans gestion des guillemets complexes)
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
 * Parse un fichier CSV en tableaux d'objets
 */
function parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = extractHeaders(lines[0]);
    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const contact = {};
        headers.forEach((header, index) => {
            let value = values[index] || '';
            value = value.trim();
            value = value.replace(/^"|"$/g, '');

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
 * Extraire les en-têtes d'une ligne CSV
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
    return headers.filter(h => {
        const lower = h.toLowerCase();
        return ['nom', 'prénom', 'email', 'telephone', 'phone', 'tel', 'organisation', 'company', 'org', 'tags', 'catégories', 'categories', 'notes'].some(keyword => lower.includes(keyword));
    });
}

/**
 * Parser un fichier VCF en tableaux d'objets
 */
async function parseVCF(vcfContent) {
    console.debug('parseVCF Begin');
    const contacts = [];
    let currentContact = null;
    let count = 0;

    const fnRegex = /FN:(.+)/i;   ///(?:FN[^:]*:)?([^,\n]+)/i;
    const gnRegex = /^N:([^,\/\n]+)$/ ///(?:N[^:]*:)?([^,\/\n]+)/i;
    const emailRegex = /EMAIL;TYPE=INTERNET:(.+)/gi ///EMAIL:(?:[^;\n]*;)*?(.*?)(?=[;,]|$)|TYPE:INTERNET/gi;
    const telRegex = /(?:TEL:|TEL;TYPE=CELL:)(.+)/gi ///TEL:(?:[^;\n]*;)*?(.*?)(?=[;,]|$)|TYPE:WORK/i;
    const orgRegex = /(?:CATEGORIES[^;\n]*;)*?(.*?)NAME(.*?)(?=[;,]|$)|[Oo][Rr][Gg]:(.+)$/i;

    function addContact() {
        //console.debug('addContact', currentContact);
        if (!currentContact) return null;

        currentContact.familialName = cleanValue(currentContact.familialName);
        currentContact.givenName = cleanValue(currentContact.givenName);
        currentContact.email = cleanValue(currentContact.emails[0]);//extractValues(currentContact.emails);
        currentContact.telephone = cleanValue(currentContact.telephones[0]);//extractSingleValue(currentContact.telephone, { type: 'work' }));
        currentContact.organisation = cleanValue(extractSingleValue(currentContact.org, { type: 'work' }));
        currentContact.tags = cleanValue(currentContact.tags);
        currentContact.note = cleanValue(currentContact.note);

        let fullNameParts = [];
        if (currentContact.familialName) {
            fullNameParts.push(currentContact.familialName.trim());
        }
        if (currentContact.givenName) {
            fullNameParts.unshift(currentContact.givenName.trim());
        }
        importContactsVCF();
        return {
            familialName: currentContact.familialName || '',
            givenName: currentContact.givenName || '',
            fullName: fullNameParts.join(' ') || '',
            email: currentContact.emails[0] || null,
            telephone: currentContact.telephones[0] || null,
            organisation: currentContact.organisation || null,
            tags: currentContact.tags || '',
            note: currentContact.note || ''
        };
    }

    const lines = vcfContent.split('\n');
    let inContactBlock = false;
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        //console.debug('Analyse ligne : ', line);

        const upperLine = line.toUpperCase();

        // 1. GESTION DES BALISES DE STRUCTURE (On ne fait pas de 'continue' avant ça !)
        if (upperLine.startsWith('BEGIN:VCARD')) {
            console.debug('Début de contact trouvé');
            currentContact = { emails: [], telephones: [], email: '', telephone:'', org: '', note: '', familialName: '', givenName: '' };
            inContactBlock = true;
            continue; 
        } 

        if (upperLine.startsWith('END:VCARD')) {
            console.debug('Fin de contact trouvée');
            const contact = addContact();
            if (contact && (contact.fullName || contact.email)) {
                contacts.push(contact);
            }
            currentContact = null;
            inContactBlock = false;
            continue;
        }

        // 2. EXTRACTION DES DONNÉES (Seulement si on est dans un bloc VCARD)
        if (inContactBlock) {
            // Utilisation de .includes() ou d'une regex plus souple pour gérer les préfixes "item1."
            if (upperLine.includes('FN:')) {
                const match = line.match(fnRegex);
                currentContact.familialName = match ? match[1] : '';
            } 
            else if (upperLine.includes('N:')) {
                // On retire tout ce qui précède le "N:" (y compris le N: lui-même)
                const content = line.split(/N:/i)[1];
                const parts = content.split(';');
                currentContact.familialName = parts[0] || '';
                currentContact.givenName = parts[1] || '';
            } 
            else if (upperLine.includes('EMAIL;')) {
                //console.debug('Find eamil ',line);
                let telValue = extractSingleMatch(telRegex, { type: 'INTERNET' }) || line.split(/EMAIL.*:/i)[1];
                if (telValue) {
                    const bracketsMatch = telValue.match(/[\[()][-+0-9\s]+/);
                    currentContact.emails.push(bracketsMatch ? bracketsMatch[0] : telValue.trim());
                }
                currentContact.emails.push(...extractAllMatches(line, emailRegex));
            } 
            else if (upperLine.includes('TEL;') || upperLine.includes('TEL:')) {
                //console.debug('Find Tel ',line);
                let telValue = extractSingleMatch(telRegex, { type: 'CELL' }) || line.split(/TEL.*:/i)[1];
                if (telValue) {
                    const bracketsMatch = telValue.match(/[\[()][-+0-9\s]+/);
                    currentContact.telephones.push(bracketsMatch ? bracketsMatch[0] : telValue.trim());
                }
            } 
            else if (upperLine.includes('ADR;')) {
                console.debug('ADR ',line);
                const orgMatch = line.match(/ADR;(.*)/i);
                currentContact.org = orgMatch ? orgMatch[1].split(';')[0] : '';
            } 
            else if (upperLine.includes('CATEGORIES:')) {
                console.debug('CATEGORIES ',line);
                currentContact.note = line.split(/CATEGORIES:/i)[1].trim();
            }
        }
    }
 //   console.debug('const lastContact = addContact();');
    const lastContact = addContact();
    if (lastContact && (lastContact.fullName || lastContact.email)) {
        contacts.push(lastContact);
    }

    async function importContactsVCF()
    {
        console.debug('importContactsVCF', currentContact);
        let prenom, nom, emails, email, telephone, organisation, tags = "";
        nom = currentContact.familialName;
        prenom = currentContact.givenName;
        emails = currentContact.emails;
        email = currentContact.email;
        telephone = currentContact.telephone;
        telephones = currentContact.telephones;
        tags = currentContact.tags;
        organisation = currentContact.organisation;
        // Création via API
        try {
            //console.debug (nom, prenom, email, telephone, organisation, tags);
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom, prenom, email, emails, telephone, telephones, organisation, tags })
            });

            if (response.ok) {
                count++;
                //console.debug('importContactsVCF ', nom, prenom, emails, telephone, telephones, organisation, tags );
            } else {
                console.error('Erreur création contact:', await response.text());
            }
        } catch (err) {
            console.error('Erreur API:', err);
        }
    }
    
    return contacts;
}

/**
 * Nettoyer une valeur
 */
function cleanValue(value) {
    if (!value) return '';
    return value.replace(/^"|"$/g, '').trim();
}

/**
 * Extraire toutes les correspondances d'une regex
 */
function extractAllMatches(text, regex) {
    console.debug('extractAllMatches', regex);
    const matches = [];
    let match;
    while ((match = regex.exec('')) !== null) {
        if (match[0]) matches.push(cleanValue(text || match[0]));
    }
    return matches;
}

/**
 * Extraire une valeur unique avec options de type
 */
function extractSingleValue(text, options = {}) {
    console.debug('extractSingleValue', text, options);
    let result = cleanValue(text);
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

// ==============================
// VARIABLES GLOBALES & CONSTANTES
// ==============================
const API_BASE = '/api';

let contacts = [];      // Liste complète des contacts
let categories = [];    // Liste de toutes les catégories
let config = {};        // Configuration du site
let stats = {};         // Statistiques
let selectedContactIds = new Set();  // Contacts sélectionnés pour la fusion
let duplicateContacts = [];  // Contacts trouvés par doublons

// ==============================
// INITIALISATION
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadDashboard();
    loadContacts();
    loadCategories();
    loadImportExport();
    setupEventListeners();
    setupDuplicateModalListeners();
    setupImportExportListeners();

    // Écouteur hashchange pour la navigation SPA via l'URL
    window.addEventListener('hashchange', (e) => {
        const hash = window.location.hash.replace('#', '');
        const targetId = e.oldURL ? e.oldURL.replace('#', '') : '';

        // Gestion des liens de navigation actuels
        const navLinks = document.querySelectorAll('.nav-links li a');
        let clickedLink = null;
        navLinks.forEach(link => {
            if (link.getAttribute('href') === '#' + targetId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
            if (link.getAttribute('href') === '#' + hash) {
                clickedLink = link;
            }
        });

        // Masquer toutes les sections
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });

        // Afficher la nouvelle section si elle existe
        const targetSection = document.getElementById(hash);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Charger les données pour la nouvelle section
        switch (hash) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'contacts':
                loadContacts();
                break;
            case 'categories':
                loadCategories();
                break;
            case 'import-export':
                loadImportExport();
                break;
            case 'settings':
                loadSettings();
                break;
        }

        // Si pas de changement d'URL, charger la section active via hash
        if (!e.oldURL && document.location.hash) {
            const currentHash = document.location.hash.replace('#', '');
            switch (currentHash) {
                case 'dashboard': loadDashboard(); break;
                case 'contacts': loadContacts(); break;
                case 'categories': loadCategories(); break;
                case 'import-export': loadImportExport(); break;
                case 'settings': loadSettings(); break;
            }
        }
    });
});

/**
 * Initialiser la navigation entre les sections
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-links li a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Empêcher le défilement pour l'ancre
            e.preventDefault();

            // Activer la classe active sur le lien cliqué
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Afficher la section correspondante
            const targetId = link.getAttribute('href').replace('#', '');
            document.querySelectorAll('.page-section').forEach(section => {
                section.classList.remove('active');
            });
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            // Charger les données spécifiques à la section
            switch (targetId) {
                case 'dashboard':
                    console.info('Dashboard Click');
                    loadDashboard();
                    break;
                case 'contacts':
                    loadContacts();
                    break;
                case 'categories':
                    loadCategories();
                    break;
                case 'import-export':
                    loadImportExport();
                    break;
                case 'settings':
                    loadSettings();
                    break;
            }
        });
    });

    // Bouton hamburger pour mobile
    const body = document.body;
    let sidebarCollapsed = false;

    // Créer le bouton toggle si n'existe pas
    let toggleBtn = document.querySelector('.toggle-sidebar-btn');
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-sidebar-btn';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        body.appendChild(toggleBtn);
    }

    // Sur le bouton hamburger
    toggleBtn.addEventListener('click', () => {
        sidebarCollapsed = !sidebarCollapsed;
        if (sidebarCollapsed) {
            document.querySelector('.sidebar').classList.add('collapsed');
            toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        } else {
            document.querySelector('.sidebar').classList.remove('collapsed');
            toggleBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
    });

    // Bouton fermer la sidebar sur mobile depuis le nav
    const closeSidebarBtns = document.querySelectorAll('.sidebar-footer a, .sidebar-footer button');
    closeSidebarBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sidebarCollapsed = true;
            toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        });
    });
}

/**
 * Mettre à jour le titre de la page
 */
function updatePageTitle(title) {
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = title;
    }
}

/**
 * Afficher ou masquer un élément
 */
function toggleElement(element, show) {
    if (!element) return;
    element.style.display = show ? 'block' : 'none';
}

// ==============================
// GESTION DES CONTACTS
// ==============================
/**
 * Charger tous les contacts depuis l'API
 */
async function loadContacts() {
    //console.debug('loadContacts()');
    try {
        const response = await fetch(`${API_BASE}/contacts`);
        const result = await response.json();

        if (result.success) {
            contacts = result.data;
            renderContactsList();
        } else {
            showError('Erreur lors du chargement des contacts');
        }
    } catch (error) {
        console.error('Erreur loadContacts:', error);
        const msg = error.message?.includes('Failed to fetch') || error.message?.includes('network')
            ? 'Le serveur n\'est pas accessible sur http://localhost:3000'
            : error.message || 'Erreur lors du chargement des contacts';
        showError(msg);
    }
}

/**
 * Charger un seul contact par ID
 */
async function loadContactById(id) {
    try {
        const response = await fetch(`${API_BASE}/contacts/${id}`);
        const result = await response.json();

        if (result.success) {
            return result.data;
        }
    } catch (error) {
        console.error('Erreur loadContactById:', error);
    }
    return null;
}

/**
 * Créer un nouveau contact
 */
async function createContact(contactData) {
    try {
        const response = await fetch(`${API_BASE}/contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactData)
        });

        const result = await response.json();

        if (result.success) {
            contactForm.reset();
            closeContactModal();
            loadContacts();
            showNotification('success', 'Contact créé avec succès!');
            return true;
        } else {
            showError(result.message || 'Erreur lors de la création du contact');
        }
    } catch (error) {
        console.error('Erreur createContact:', error);
        const msg = error.message?.includes('Failed to fetch')
            ? 'Le serveur n\'est pas accessible. Vérifiez que le backend tourne sur localhost:3000'
            : error.message || 'Erreur lors de la création du contact';
        showError(msg);
    }
    return false;
}

/**
 * Mettre à jour un contact existant
 */
async function updateContact(id, contactData) {
    try {
        const response = await fetch(`${API_BASE}/contacts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactData)
        });

        const result = await response.json();

        if (result.success) {
            loadContacts();
            showNotification('success', 'Contact mis à jour avec succès!');
            return true;
        } else {
            showError(result.message || 'Erreur lors de la modification du contact');
        }
    } catch (error) {
        console.error('Erreur updateContact:', error);
        const msg = error.message?.includes('Failed to fetch')
            ? 'Le serveur n\'est pas accessible. Vérifiez que le backend tourne sur localhost:3000'
            : error.message || 'Erreur lors de la modification du contact';
        showError(msg);
    }
    return false;
}

/**
 * Supprimer un contact
 */
async function deleteContact(id) {
    /*
    if (!confirm('Voulez-vous vraiment supprimer ce contact ? Cette action est irréversible.')) {
        return false;
    }
    */
    try {
        const response = await fetch(`${API_BASE}/contacts/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            loadContacts();
            showNotification('success', 'Contact supprimé avec succès!');
            return true;
        } else {
            showError(result.message || 'Erreur lors de la suppression du contact');
        }
    } catch (error) {
        console.error('Erreur deleteContact:', error);
        const msg = error.message?.includes('Failed to fetch')
            ? 'Le serveur n\'est pas accessible. Vérifiez que le backend tourne sur localhost:3000'
            : error.message || 'Erreur lors de la suppression du contact';
        showError(msg);
    }
    return false;
}

/**
 * Mettre à jour la liste des contacts
 */
function renderContactsList() {
    const container = document.getElementById('contacts-list');
    if (!container) return;

    if (contacts.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucun contact enregistré. Cliquez sur "Nouveau contact" pour en ajouter un !</p>';
        return;
    }

    // Trier les contacts par nom puis prénom
    const sortedContacts = [...contacts].sort((a, b) => {
        const aName = `${a.nom} ${a.prenom}`.toLowerCase();
        const bName = `${b.nom} ${b.prenom}`.toLowerCase();
        return aName.localeCompare(bName);
    });

    container.innerHTML = sortedContacts.map(contact => createContactCard(contact)).join('');
}

/**
 * Créer le HTML d'une carte de contact
 */
function createContactCard(contact) {
    const initials = (contact.prenom?.charAt(0) || '') + (contact.nom?.charAt(0) || '');
    const categoriesHtml = contact.categories && contact.categories.length > 0
        ? '<div class="contact-tags">' +
            contact.categories.map(cat => `<span class="contact-tag" style="background-color: ${cat.couleur};">${cat.nom}</span>`).join('') +
            '</div>'
        : '';

    const initialLetter = (contact.prenom || contact.nom || 'C').charAt(0);

    return `
        <div class="contact-card" data-id="${contact.id}">
            <div class="contact-header">
                <div class="contact-avatar">${initialLetter}</div>
                <div class="contact-info">
                    <span class="contact-name">${escapeHtml(contact.nom)} ${escapeHtml(contact.prenom)}</span>
                    <span class="contact-email">${escapeHtml(contact.email || 'Pas d\'email')}${!contact.email ? '<i class="fas fa-envelope-open-text" style="color: var(--danger-color);"></i>' : ''}</span>
                </div>
            </div>
            ${categoriesHtml}
            <div class="contact-actions">
                <button class="btn btn-primary btn-edit-contact" data-id="${contact.id}"><i class="fas fa-edit"></i> Éditer</button>
                <button class="btn btn-danger btn-delete-contact" data-id="${contact.id}"><i class="fas fa-trash"></i> Supprimer</button>
            </div>
        </div>
    `;
}

/**
 * Ouvrir le modal d'ajout/édition de contact
 */
function openContactModal(contact = null) {
    const modal = document.getElementById('contact-modal');
    if (!modal) return;

    const title = document.getElementById('contact-modal-title');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const deleteBtn = document.querySelector('.delete-btn');
    const saveBtn = document.getElementById('save-contact-btn');

    // Formulaires
    const contactForm = {
        id: document.getElementById('contact-id'),
        nom: document.getElementById('nom'),
        prenom: document.getElementById('prenom'),
        email: document.getElementById('email'),
        telephone: document.getElementById('telephone'),
        organisation: document.getElementById('organisation'),
        tagsInput: document.getElementById('tags-input'),
        notes: document.getElementById('notes')
    };

    // Sauvegarder l'ID du contact en cours d'édition pour le localStorage
    if (contact) {
        window.editContactId = contact.id;
    } else {
        window.editContactId = null;
    }

    // Restaurer les données depuis localStorage si disponibles
    restoreContactFromLocalStorage(window.editContactId);

    if (contact) {
        // Mode édition - boutons Enregistrer, Annuler, Supprimer doivent être affichés
        title.textContent = 'Modifier le contact';
        cancelBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
        saveBtn.style.display = 'inline-block';

        contactForm.id.value = contact.id;
        contactForm.nom.value = contact.nom || '';
        contactForm.prenom.value = contact.prenom || '';
        contactForm.email.value = contact.email || '';
        contactForm.telephone.value = contact.telephone || '';
        contactForm.organisation.value = contact.organisation || '';

        // Tags - convertir en chaîne avec point-virgule
        const tags = contact.categories ? contact.categories.map(c => c.nom).join(';') : '';
        contactForm.tagsInput.value = tags;

        contactForm.notes.value = contact.notes || '';
    } else {
        // Mode création - masquer le bouton Enregistrer car on utilise submit du formulaire et masquer Annuler
        title.textContent = 'Ajouter un contact';
        cancelBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        saveBtn.style.display = 'none';

        contactForm.id.value = '';
        contactForm.nom.value = '';
        contactForm.prenom.value = '';
        contactForm.email.value = '';
        contactForm.telephone.value = '';
        contactForm.organisation.value = '';
        contactForm.tagsInput.value = '';
        contactForm.notes.value = '';

        // Reset des erreurs si existantes
        document.querySelectorAll('.form-group').forEach(el => {
            el.style.border = '1px solid var(--border-color)';
        });
    }

    modal.classList.add('show');
}

/**
 * Fermer le modal de contact
 */
function closeContactModal() {
    const modal = document.getElementById('contact-modal');
    if (!modal) return;
    modal.classList.remove('show');

    // Reset du formulaire
    const contactFormElements = [
        'nom', 'prenom', 'email', 'telephone', 'organisation', 'tags-input', 'notes'
    ];
    contactFormElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Reset des erreurs
    document.querySelectorAll('.form-group').forEach(el => {
        el.style.border = '1px solid var(--border-color)';
    });
}

/**
 * Fermer le modal d'édition et annuler les modifications
 */
function closeEditModal() {
    cleanupLocalStorageKeys(); // Nettoyer toutes les clés d'édition
    closeContactModal();
}

// ==============================
// GESTION DES CATÉGORIES
// ==============================
/**
 * Charger toutes les catégories
 */
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        const result = await response.json();

        if (result.success) {
            categories = result.data;
            renderCategoriesList();
        }
    } catch (error) {
        console.error('Erreur loadCategories:', error);
    }
}

/**
 * Créer une nouvelle catégorie
 */
async function createCategory(categoryData) {
    try {
        const response = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });

        const result = await response.json();

        if (result.success) {
            const modal = document.getElementById('category-modal');
            const idField = document.getElementById('category-id');
            const nomField = document.getElementById('category-nom');
            const couleurField = document.getElementById('category-couleur');

            // Remettre à zéro le formulaire
            idField.value = '';
            nomField.value = '';
            couleurField.value = '#70ad47';

            closeCategoryModal();
            loadCategories();
            showNotification('success', 'Catégorie créée avec succès!');
        } else {
            showError(result.message || 'Erreur lors de la création de la catégorie');
        }
    } catch (error) {
        console.error('Erreur createCategory:', error);
        const msg = error.message?.includes('Failed to fetch') || error.message?.includes('network')
            ? 'Le serveur n\'est pas accessible sur http://localhost:3000'
            : error.message || 'Erreur lors de la création de la catégorie';
        showError(msg);
    }
}

/**
 * Mettre à jour une catégorie
 */
async function updateCategory(id, categoryData) {
    try {
        const response = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });

        const result = await response.json();

        if (result.success) {
            loadCategories();
            showNotification('success', 'Catégorie mise à jour avec succès!');
        } else {
            showError(result.message || 'Erreur lors de la modification de la catégorie');
        }
    } catch (error) {
        console.error('Erreur updateCategory:', error);
        const msg = error.message?.includes('Failed to fetch') || error.message?.includes('network')
            ? 'Le serveur n\'est pas accessible sur http://localhost:3000'
            : error.message || 'Erreur lors de la modification de la catégorie';
        showError(msg);
    }
}

/**
 * Supprimer une catégorie
 */
async function deleteCategory(id) {
    if (!confirm('Voulez-vous vraiment supprimer cette catégorie ? Les contacts associés la perdront.')) {
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            loadCategories();
            showNotification('success', 'Catégorie supprimée avec succès!');
            return true;
        } else {
            showError(result.message || 'Erreur lors de la suppression de la catégorie');
        }
    } catch (error) {
        console.error('Erreur deleteCategory:', error);
        const msg = error.message?.includes('Failed to fetch') || error.message?.includes('network')
            ? 'Le serveur n\'est pas accessible sur http://localhost:3000'
            : error.message || 'Erreur lors de la suppression de la catégorie';
        showError(msg);
    }
    return false;
}

/**
 * Afficher les catégories
 */
function renderCategoriesList() {
    const container = document.getElementById('categories-list');
    if (!container) return;

    if (categories.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune catégorie définie. Créez-en une pour organiser vos contacts !</p>';
        return;
    }

    container.innerHTML = categories.map(cat => `
        <div class="category-card" style="background: ${cat.couleur}20; border-left: 4px solid ${cat.couleur}; cursor: pointer;" data-id="${cat.id}" onclick="openCategoryEdit(${cat.id})">
            <div class="category-icon" style="background-color: ${cat.couleur}; color: white;">
                <i class="fas fa-tag"></i>
            </div>
            <span class="category-name">${escapeHtml(cat.nom)}</span>
        </div>
    `).join('');

    // Ajouter écouteur pour fermer le modal d'édition de catégorie lors du clic hors
    const categoryEditModal = document.getElementById('category-modal');
    if (categoryEditModal) {
        categoryEditModal.addEventListener('click', (e) => {
            if (e.target === categoryEditModal) {
                closeCategoryEditModal();
            }
        });
    }
}

// ==============================
// MODAL DE FORMULAIRES
// ==============================
function openCategoryModal(category = null) {
    const modal = document.getElementById('category-modal');
    if (!modal) return;

    const title = document.getElementById('category-modal-title');
    const deleteBtn = document.querySelector('.delete-category-btn');
    const saveBtn = document.getElementById('save-category-btn');
    const categoryForm = {
        id: document.getElementById('category-id'),
        nom: document.getElementById('category-nom'),
        couleur: document.getElementById('category-couleur')
    };

    if (category) {
        title.textContent = 'Modifier la catégorie';
        deleteBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';

        categoryForm.id.value = category.id;
        categoryForm.nom.value = category.nom || '';
        categoryForm.couleur.value = category.couleur || '#70ad47';
    } else {
        title.textContent = 'Ajouter une catégorie';
        deleteBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';

        categoryForm.id.value = '';
        categoryForm.nom.value = '';
        categoryForm.couleur.value = '#70ad47';
    }

    modal.classList.add('show');
}

/**
 * Ouvrir le modal d'édition d'une catégorie (avec ses données)
 */
function openCategoryEdit(categoryId) {
    loadCategories().then(result => {
        if (result.success && result.data) {
            const category = result.data.find(c => c.id === categoryId);
            if (category) {
                openCategoryModal(category);
            }
        }
    }).catch(err => {
        console.error('Erreur chargement catégorie pour édition:', err);
    });
}

/**
 * Fermer le modal d'édition d'une catégorie
 */
function closeCategoryEditModal() {
    const modal = document.getElementById('category-modal');
    if (modal) {
        modal.classList.remove('show');
    }

    const categoryId = document.getElementById('category-id').value;
    if (categoryId) {
        try {
            localStorage.removeItem('edit_category_' + categoryId);
        } catch (e) {}
    }
}

function closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (!modal) return;
    modal.classList.remove('show');

    const categoryId = document.getElementById('category-id').value;
    if (categoryId) {
        try {
            localStorage.removeItem('edit_category_' + categoryId);
        } catch (e) {}
    }
}

// ==============================
// GESTION DES DOUBLONS & FUSION
// ==============================
/**
 * Détection de doublons - recherche des contacts similaires
 */
async function searchSimilarContacts(id1, id2) {
    try {
        const response = await fetch(`${API_BASE}/contacts/merge/${id1}/${id2}`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showNotification('success', `Contacts ${id1} et ${id2} fusionnés avec succès!`);
            loadContacts();
            return true;
        } else {
            showError(result.message || 'Erreur lors de la fusion');
        }
    } catch (error) {
        console.error('Erreur searchSimilarContacts:', error);
        const msg = error.message?.includes('Failed to fetch') || error.message?.includes('network')
            ? 'Le serveur n\'est pas accessible sur http://localhost:3000'
            : error.message || 'Erreur lors de la fusion des contacts';
        showError(msg);
    }
    return false;
}

/**
 * Afficher les doublons trouvés (modal)
 */
function showDuplicatesModal(duplicates, onSelectMerge) {
    const modal = document.getElementById('duplicate-modal');
    if (!modal) return;

    duplicateContacts = duplicates;

    if (duplicates.length === 0) {
        modal.classList.remove('show');
        return;
    }

    // Rendre la liste des doublons
    const list = document.getElementById('duplicate-contacts-list');
    list.innerHTML = `
        <div class="contact-header">
            <span>1. </span>
            <div style="flex:1;">
                ${duplicates[0].nom} ${duplicates[0].prenom}
            </div>
            <small>${duplicates[0].email || 'Pas d\'email'}</small>
        </div>
    ` + duplicates.slice(1).map((contact, index) => `
        <div class="duplicate-item" style="padding: 10px; border-bottom: 1px solid var(--border-color);">
            <div class="contact-header">
                <span>${index + 2}. </span>
                <div style="flex:1;">
                    ${contact.nom} ${contact.prenom}
                </div>
                <small>${contact.email || 'Pas d\'email'}</small>
            </div>
        </div>
    `).join('');

    // Bouton fusionner sélectionné
    const mergeBtn = document.getElementById('merge-selected-btn');
    if (mergeBtn) {
        mergeBtn.style.display = duplicates.length > 0 ? 'inline-block' : 'none';
    }

    modal.classList.add('show');

    // Bouton "Fermer les doublons"
    const closeBtn = document.getElementById('close-duplicates-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModalDuplicates());
    }

    // Bouton fusionner (si plusieurs doublons)
    if (mergeBtn) {
        mergeBtn.addEventListener('click', async () => {
            if (duplicateContacts.length >= 2) {
                const merged = await searchSimilarContacts(
                    duplicateContacts[0].id,
                    duplicateContacts[1].id
                );
            } else {
                closeModalDuplicates();
            }
        });
    }
}

function closeModalDuplicates() {
    const modal = document.getElementById('duplicate-modal');
    if (modal) {
        modal.classList.remove('show');
        duplicateContacts = [];
    }
}

// ==============================
// IMPORT/EXPORT
// ==============================
/**
 * Charger les données import/export
 */
async function loadImportExport() {
    try {
        // Charger la configuration si nécessaire
        if (!config) {
            const response = await fetch(`${API_BASE}/config`);
            if (response.ok) config = await response.json();
        }

        // Afficher l'onglet Exporter par défaut au chargement
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.getElementById('export-tab')?.classList.add('active');

        const exportTabBtn = document.querySelector('.tab-btn[data-tab="export"]');
        if (exportTabBtn) exportTabBtn.classList.add('active');

        // Ajouter les écouteurs pour la navigation entre onglets
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTabId = btn.dataset.tab + '-tab';
                document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
                document.getElementById(targetTabId)?.classList.add('active');

                // Gestion de l'état actif des boutons
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    } catch (error) {
        console.error('Erreur loadImportExport:', error);
    }
}

/**
 * Afficher le statut d'upload
 */
function showUploadStatus(status, message = '') {
    const statusEl = document.getElementById('upload-status');
    if (!statusEl) return;

    if (status === 'none') {
        statusEl.innerHTML = '<p>Aucun fichier en attente</p>';
        document.getElementById('import-cancel-btn').style.display = 'none';
    } else if (status === 'csv' || status === 'vcf') {
        const fileIcon = status === 'csv' ? 'fa-file-csv' : 'fa-address-card';
        statusEl.innerHTML = `
            <p><i class="fas fa-check-circle" style="color: green;"></i> Fichier en attente d\'import...</p>
            <small>${message}</small>
        `;
    } else if (status === 'success') {
        statusEl.innerHTML = `
            <p><i class="fas fa-check-circle" style="color: green;"></i> Import terminé avec succès !</p>
            <button id="import-cancel-success-btn" class="btn btn-secondary btn-sm">Annuler import</button>`;
        document.getElementById('import-cancel-success-btn')?.addEventListener('click', () => {
            showUploadStatus('none', '');
        });
    }
     else if (status === 'error') {
        statusEl.innerHTML = `
            <p><i class="fas fa-exclamation-triangle" style="color: var(--danger-color);"></i> Erreur lors de l\'import</p>
            <small>${message}</small>
        `;
    }
}

/**
 * Charger un fichier CSV
 */
function handleCsvUpload(file) {
    if (!file) return false;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const csvContent = e.target.result;
            await parseAndImportCSV(csvContent);
        } catch (error) {
            console.error('Erreur parsing CSV:', error);
            showUploadStatus('error', 'Erreur lors du parsing du fichier');
        }
    };
    reader.readAsText(file);
    return true;
}

/**
 * Charger un fichier VCF
 */
function handleVcfUpload(file) {
    console.debug('handleVcfUpload Begin');
    if (!file) return false;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const vcfContent = e.target.result;
            //await parseAndImportVCF(vcfContent);
            await parseVCF(vcfContent);
        } catch (error) {
            console.error('Erreur parsing VCF:', error);
            showUploadStatus('error', 'Erreur lors du parsing du fichier');
        }
    };
    reader.readAsText(file);
    return true;
}

/**
 * Parser et importer CSV
 */
async function parseAndImportCSV(csvContent) {
    // Utiliser le parsing interne (sans dépendance externe pour éviter les erreurs)
    const lines = csvContent.trim().split('\n').filter(l => l.trim());

    if (lines.length < 2) {
        showUploadStatus('error', 'Le fichier CSV est invalide');
        return;
    }

    // Extraire les en-têtes de la première ligne
    const firstLine = lines[0];
    let headers = [];
    let currentHeader = '';
    let inQuotes = false;

    for (let i = 0; i < firstLine.length; i++) {
        const char = firstLine[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            headers.push(currentHeader.trim().replace(/^"|"$/g, ''));
            currentHeader = '';
        } else {
            currentHeader += char;
        }
    }
    headers.push(currentHeader.trim().replace(/^"|"$/g, ''));

    // Mappage des en-têtes attendus aux en-têtes du fichier
    const fieldMap = {};
    ['nom', 'prenom', 'email', 'telephone', 'phone', 'tel', 'organisation', 'company', 'org', 'tags'].forEach(field => {
        headers.forEach(h => {
            const lower = h.toLowerCase();
            if (lower.includes(field) && !fieldMap[field]) {
                fieldMap[field] = h;
            }
        });
    });

    let count = 0;
    // Utiliser une boucle for...of pour supporter await
    for (const line of lines.slice(1)) {
        const values = line.split(',');
        if (values.length < 2) continue;

        // Extraire nom/prénom des premiers champs
        let nameFields = [];
        for (const field of ['Nom', 'nom', 'Prénom', 'prenom']) {
            const hIndex = headers.findIndex(h => h.toLowerCase() === field);
            if (hIndex !== -1) nameFields.push(hIndex);
        }

        // Récupérer les valeurs dans l'ordre (Prénom, Nom) ou par index
        let prenom = '', nom = '';
        for (let i = 0; i < values.length && !prenom && !nom && i < 3; i++) {
            const val = values[i]?.trim().replace(/^"|"$/g, '') || '';
            if (/^prénom/i.test(headers[i])) prenom = val;
            else if (/^nom/i.test(headers[i])) nom = val;
        }

        // Fallback : si aucun nom/prénom trouvé, diviser le premier champ en deux parties max
        if (!prenom && !nom) {
            const firstField = values[0]?.trim() || '';
            const parts = firstField.split(/[\s,\.;]+/);
            prenom = parts[0] || '';
            nom = parts.slice(1).join(' ') || '';
        }

        // Email (index 2 si pas de mapping)
        const emailIdx = fieldMap.email || 2;
        const email = values[emailIdx]?.trim().replace(/^"|"$/g, '') || null;

        // Téléphone (index 3 si pas de mapping)
        const telIdx = fieldMap.telephone || fieldMap.phone || fieldMap.tel || 3;
        const telephone = values[telIdx]?.trim() || null;

        // Organisation (index 4 si pas de mapping)
        const orgIdx = fieldMap.organisation || fieldMap.company || fieldMap.org || 4;
        const organisation = values[orgIdx]?.trim() || null;

        // Tags (index 5 ou plus, avec ; comme séparateur)
        const tagsIdx = fieldMap.tags || 5;
        let tags = '';
        if (values.length > tagsIdx) {
            const tagStr = values[tagsIdx].replace(/^"|"$/g, '');
            // Convertir les ; en , et supprimer tout ce qui est après un point-virgule pour éviter les erreurs CSV
            const beforeSemicolon = tagStr.split(';')[0] || '';
            tags = beforeSemicolon;
        }

        // Ignorer si pas de nom valide
        if (!prenom && !nom) {
            continue;
        }

        // Création via API (simplifiée sans catégories complexes)
        try {
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nom, prenom, email, telephone, organisation, tags
                })
            });

            if (response.ok) {
                count++;
            } else {
                console.error('Erreur création contact:', await response.text());
            }
        } catch (err) {
            console.error('Erreur API:', err);
        }
    }

    showUploadStatus('success', `${count} contacts créés`);
}

/**
 * Parser et importer VCF
 */
async function parseAndImportVCF2(vcfContent) {
    const lines = vcfContent.split('\n').filter(l => l.trim());

    // Regex pour parser le format vCard standard
    let count = 0;

    // Utiliser une boucle for...of pour supporter await
    for (const rawLine of lines) {
        const line = rawLine.trim();

        // Ignorer les lignes BEGIN/END/REV
        if (/^(BEGIN|END):VCARD/i.test(line) || /^(REV|UID|VERSION|DT[\w]+)/.test(line)) {
            continue;
        }

        // Extraire les données du contact en cours
        const fnMatch = line.match(/FN:([^,\n;]+)/i);
        const nMatch = line.match(/^N:[^,]+(?:[^,]+)$/i);
        const telMatch = line.match(/TEL:(?:[^;\n]*;)*?[-+0-9\s.()\-]+(?=[;,])|TYPE:CELL/i);
        const orgMatch = line.match(/[Oo][Rr][Gg]:([^;\n]*)/i);
        
        // Si c'est un début de contact
        if (fnMatch) {
            const nomParts = fnMatch[1].split(';');
            let prenom, nom;

            // Format : Prenom;Nom (ou inversement)
            if (nomParts.length >= 2) {
                // Essayer de déterminer l'ordre selon le contexte
                prenom = nomParts[0];
                nom = nomParts[1];
            } else {
                prenom = '';
                nom = fnMatch[1];
            }

            const email = line.match(/EMAIL:(.*?)(?:;|$)/i)?.[1]?.trim() || null;
            const telephone = telMatch?.replace('TYPE:CELL', '').trim() || null;
            const organisation = orgMatch?.[1]?.trim() || null;
            const tags = line.match(/^CATEGORIES:[^,\n]+/i)?.[0]?.split(';').map(c => c.trim())?.join(';') || '';

            console.log (line, fnMatch, nMatch, telMatch, orgMatch)
            // Création via API
            try {
                //console.debug (nom, prenom, email, telephone, organisation, tags);
                const response = await fetch('/api/contacts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nom, prenom, email, telephone, organisation, tags })
                });

                if (response.ok) {
                    count++;
                } else {
                    console.error('Erreur création contact:', await response.text());
                }
            } catch (err) {
                console.error('Erreur API:', err);
            }
        }
    }

    showUploadStatus('success', `${count} contacts créés`);
}

async function parseAndImportVCF(vcfContent) {
    // Regex pour extraire les données vCard
    const fnRegex = /(?:FN[^:]*:)?([^,\n]+)/i;
    const gnRegex = /(?:N[^:]*:)?([^,\/\n]+)/i;
    const emailRegex = /EMAIL:(?:[^;\n]*;)*?(.*?)(?=[;,]|$)/gi;
    const telRegex = /TEL:(?:[^;\n]*;)*?(.*?)(?=[;,]|$)|TYPE:WORK/i;
    const orgRegex = /ORG([^;\n]*;)*?(.*?)NAME(.*?)(?=[;,]|$)|[Oo][Rr][Gg]:(.+)$/i;
    const tagRegex = /(?:CATEGORIES[^:]*:)?([^,\n]+)/i;
    const noteRegex = /NOTE:[^,]*:(.*)/i;

    const contacts = [];
    let currentContact = null;

    // Nettoyage simple des valeurs
    const clean = (val) => val ? val.trim().replace(/\\,/g, ',') : '';

    const lines = vcfContent.split(/\r?\n/);
    let count = 0;
    let prenom, nom, email, telephone, organisation, tags;
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.toUpperCase().startsWith('BEGIN:VCARD')) {
            currentContact = { emails: [], phones: [], tags: '', note: '', org: '' };
            continue;
        }

        if (line.toUpperCase().startsWith('END:VCARD')) {
            if (currentContact) {
                console.debug('Aip call ',currentContact);
                // Construction du nom complet si FN est manquant
                const fullName = currentContact.fn || `${currentContact.givenName} ${currentContact.familialName}`.trim();
                console.log(fullName);
                nom = fullName;
                prenom = currentContact.givenName;

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
                // Création via API
                try {
                    console.info (nom, prenom, email, telephone, organisation, tags);                        
                    const response = await fetch('/api/contacts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nom, prenom, email, telephone, organisation, tags })
                    });        

                    if (response.ok) {
                        count++;
                    } else {
                        console.error('Erreur création contact:', await response.text());
                    }
                } catch (err) {
                    console.error('Erreur API:', err);
                }
                nom = prenom = email = tags = telephone = '';
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
        const email = line.match(/EMAIL:(.*?)(?:;|$)/i)?.[1]?.trim() || null;
        const telephone = telMatch?.replace('TYPE:CELL', '').trim() || null;
        const organisation = orgMatch?.[1]?.trim() || null;
        const tags = line.match(/^CATEGORIES:[^,\n]+/i)?.[0]?.split(';').map(c => c.trim())?.join(';') || '';
            console.log(line)
            console.debug(currentContact)
/*
        // Logique d'extraction par type de champ
        if (key.match(/FN:())) {
            console.info('key ' + key);
            currentContact.fn = clean(value);
            console.info('FN ' +currentContact.fn)
        } 
        else if (key.includes('N') && !key.includes('FN')) {
            console.info('key ' + key);
            const parts = value.split(';');
            currentContact.familialName = clean(parts[0]);
            console.info('FN ' + currentContact.familialName)
            currentContact.givenName = clean(parts[1]);
            console.info('N '+ currentContact.givenName)
        } 
        else if (key.includes('EMAIL')) {
            console.info('key ' + key);
            currentContact.emails.push(clean(value));
            console.info('email '+currentContact.emails)
             email = currentContact.emails[0];
        } 
        else if (key.includes('TEL')) {
            console.info('key ' + key);
            currentContact.phones.push(clean(value));
            console.info('tel ' + currentContact.telephone)
             telephone = currentContact.phones[0];
        } 
        else if (key.includes('ORG')) {
            console.info('key ' + key);
            currentContact.org = clean(value.split(';')[0]);
            organisation = currentContact.org;
        } 
        else if (key.includes('CATEGORIES')) {
            console.info('key ' + key);
            currentContact.tags = clean(value);
            tags = currentContact.tags;
        } 
        else if (key.includes('NOTE')) {
            console.info('key ' + key);
            currentContact.note = clean(value);
        }   
 */     
    }

    //return contacts;
}
// ==============================
// EXPORT
// ==============================
/**
 * Exporter les contacts vers CSV
 */
async function exportContacts(format, contactIds) {
    if (!contactIds || contactIds.length === 0) {
        alert('Aucun contact à exporter. Sélectionnez des contacts ou cochez "Tous les contacts"');
        return;
    }

    try {
        if (format === 'csv') {
            // Via GET avec paramètre d'URL pour CSV
            const url = `${API_BASE}/export/csv?ids=${encodeURIComponent(contactIds.join(','))}`;
            window.location.href = url;
        } else if (format === 'vcf') {
            // Via POST pour VCF
            const response = await fetch(`${API_BASE}/export/vcf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: contactIds })
            });

            if (response.ok) {
                window.location.reload();
            } else {
                const text = await response.text();
                console.error('Erreur export VCF:', text);
            }
        } else if (format === 'xlsx') {
            // Via POST avec body JSON pour XLSX
            const response = await fetch(`${API_BASE}/export/xlsx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: contactIds })
            });

            if (response.ok) {
                window.location.reload();
            } else {
                const text = await response.text();
                console.error('Erreur export XLSX:', text);
            }
        }
    } catch (error) {
        console.error('Erreur export:', error);
        alert('Erreur lors de l\'export');
    }
}

// ==============================
// DASHBOARD & STATS
// ==============================
/**
 * Charger le dashboard
 */
async function loadDashboard() {
    console.debug('loadDashboard()');
    updatePageTitle('Tableau de bord');

    // Statistiques globales
    try {
        const statsResponse = await fetch(`${API_BASE}/stats`);
        const result = await statsResponse.json();

        if (result.success) {
            stats = result.data;

            // Mise à jour des compteurs
            const elTotalContacts = document.getElementById('total-contacts');
            const elDashboardTotalContacts = document.getElementById('dashboard-total-contacts');
            const elDashboardTotalCategories = document.getElementById('dashboard-total-categories');
            const elSettingsTotalContacts = document.getElementById('settings-total-contacts');
            const elSettingsTotalCategories = document.getElementById('settings-total-categories');

            if (elTotalContacts) elTotalContacts.textContent = stats.totalContacts || 0;
            if (elDashboardTotalContacts) elDashboardTotalContacts.textContent = stats.totalContacts || 0;
            if (elDashboardTotalCategories) elDashboardTotalCategories.textContent = stats.totalCategories || 0;
            if (elSettingsTotalContacts) elSettingsTotalContacts.textContent = stats.totalContacts || 0;
            if (elSettingsTotalCategories) elSettingsTotalCategories.textContent = stats.totalCategories || 0;

            // Dernier contact créé
            const lastContactEl = document.getElementById('settings-last-contact');
            if (lastContactEl && stats.lastContact) {
                lastContactEl.innerHTML = `
                    <p><i class="fas fa-calendar"></i> Dernier contact :</p>
                    <strong>${escapeHtml(stats.lastContact.nom)} ${escapeHtml(stats.lastContact.prenom)}</strong>
                    <small>${stats.lastContact.created_at || ''}</small>
                `;
            }
        }
    } catch (error) {
        console.error('Erreur loadDashboard stats:', error);
    }

    // Derniers contacts ajoutés
    try {
        const response = await fetch(`${API_BASE}/contacts`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            const lastContactsEl = document.getElementById('last-contacts');
            if (lastContactsEl) {
                // Afficher les 10 derniers contacts
                lastContactsEl.innerHTML = result.data.slice(-10).map(contact => createContactCard(contact)).join('');
            }
        }
    } catch (error) {
        console.error('Erreur loadDashboard contacts:', error);
    }

    // Derniers contacts via localStorage (si disponible pour l'historique)
    try {
        const lastContactsHistory = JSON.parse(localStorage.getItem('last_contacts') || '[]');
        if (lastContactsHistory.length > 0) {
            document.getElementById('last-contacts').innerHTML = `
                <h4>Derniers contacts ajoutés :</h4>
                ${lastContactsHistory.slice(-10).map(contact => createContactCard(contact)).join('')}
            `;
        }
    } catch (e) {
        // Ignorer si localStorage invalide
        console.info('localStorage invalide');
    }
}

/**
 * Charger les paramètres du site
 */
async function loadSettings() {
    updatePageTitle('Paramètres');

    try {
        const response = await fetch(`${API_BASE}/config`);
        const result = await response.json();

        if (result.success) {
            config = result.data;
            // Remplir le champ de nom du site
            const siteNameField = document.getElementById('config-site-name');
            if (siteNameField && config.find(c => c.key === 'site_name')) {
                siteNameField.value = config.find(c => c.key === 'site_name').value || '';
            }
        }

        // Stats via le bouton
        const loadStatsBtn = document.getElementById('load-stats-btn');
        if (loadStatsBtn) {
            loadStatsBtn.addEventListener('click', async () => {
                await loadDashboard();
                showNotification('success', 'Statistiques actualisées');
            });
        }
    } catch (error) {
        console.error('Erreur loadSettings:', error);
    }
}

// ==============================
// FORMULATION DES NOTIFICATIONS & ERREURS
// ==============================
function showNotification(type, message) {
    // Créer le conteneur si n'existe pas
    let notificationContainer = document.getElementById('notifications');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notifications';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(notificationContainer);
    }

    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        margin-bottom: 10px;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
    `;
    notification.innerHTML = `<i class="fas fa-info-circle"></i> ${escapeHtml(message)}`;

    notificationContainer.appendChild(notification);

    // Auto-suppression après 5 secondes
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);

    // Animation keyframes (si pas déjà définis)
    if (!document.getElementById('notify-animations')) {
        const style = document.createElement('style');
        style.id = 'notify-animations';
        style.textContent = `
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(400px); }
                to { opacity: 1; transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);
    }
}

function showError(message) {
    showNotification('error', message);
}

// ==============================
// UTILITAIRES
// ==============================
/**
 * Nettoyer et normaliser le nom (sans accents, majuscule initiale)
 */
function normalizeName(name) {
    if (!name) return '';
    let normalized = name.normalize('NFD');
    normalized = normalized.replace(/[̀-ͯ]/g, ''); // Supprimer les diacritiques
    return normalized.toUpperCase();
}

/**
 * Convertir FormData en objet JSON lisible
 */
function formDataToObject(formData) {
    const data = {};
    formData.forEach((value, key) => {
        // Pour les tags, on utilise une version normalisée pour le localStorage
        if (key === 'tags') {
            data.tagsInput = value;
        } else {
            data[key] = value;
        }
    });
    return data;
}

/**
 * Sauvegarder un contact dans le localStorage pour l'édition ultérieure
 */
function saveContactToLocalStorage(contactId) {
    try {
        const form = document.getElementById('contact-form');
        if (form && form.checkValidity()) {
            const formData = new FormData(form);
            const data = formDataToObject(formData);

            // Sauvegarder pour l'édition
            localStorage.setItem(`edit_contact_${contactId}`, JSON.stringify(data));

            // Mettre à jour la clé pour le rappel lors du retour au dashboard
            if (window.editContactId) {
                localStorage.setItem('contact_id_for_edit', contactId.toString());
            }
        }
    } catch (e) {
        console.error('Erreur sauvegarde localStorage:', e);
    }
}

/**
 * Restaurer un contact depuis le localStorage
 */
function restoreContactFromLocalStorage(contactId) {
    try {
        const data = localStorage.getItem(`edit_contact_${contactId}`);
        if (data) {
            const parsed = JSON.parse(data);
            const nomEl = document.getElementById('nom');
            const prenomEl = document.getElementById('prenom');
            const emailEl = document.getElementById('email');
            const telephoneEl = document.getElementById('telephone');
            const organisationEl = document.getElementById('organisation');
            const tagsInputEl = document.getElementById('tags-input');
            const notesEl = document.getElementById('notes');
            const titreEl = document.getElementById('titre');
            const surnomEl = document.getElementById('surnom');
            const conjointEl = document.getElementById('conjoint');
            const adresseEl = document.getElementById('adresse');
            const codePostalEl = document.getElementById('code_postal');
            const villeEl = document.getElementById('ville');
            const regionEl = document.getElementById('region');
            const paysEl = document.getElementById('pays');
            const anniversaireEl = document.getElementById('anniversaire');

            // Restaurer les valeurs (optionnels)
            if (nomEl) nomEl.value = parsed.nom || '';
            if (prenomEl) prenomEl.value = parsed.prenom || '';
            if (emailEl) emailEl.value = parsed.email || '';
            if (telephoneEl) telephoneEl.value = parsed.telephone || '';
            if (organisationEl) organisationEl.value = parsed.organisation || '';
            if (tagsInputEl) tagsInputEl.value = parsed.tagsInput || '';
            if (notesEl) notesEl.value = parsed.notes || '';
            if (titreEl) titreEl.value = parsed.titre || '';
            if (surnomEl) surnomEl.value = parsed.surnom || '';
            if (conjointEl) conjointEl.value = parsed.conjoint || '';
            if (adresseEl) adresseEl.value = parsed.adresse || '';
            if (codePostalEl) codePostalEl.value = parsed.code_postal || '';
            if (villeEl) villeEl.value = parsed.ville || '';
            if (regionEl) regionEl.value = parsed.region || '';
            if (paysEl) paysEl.value = parsed.pays || '';
            if (anniversaireEl) anniversaireEl.value = parsed.anniversaire || '';
        }
    } catch (e) {
        console.error('Erreur restauration localStorage:', e);
    }
}

/**
 * Nettoyer les clés du localStorage des données en cours d'édition
 */
function cleanupLocalStorageKeys() {
    try {
        const keysToRemove = [];
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('edit_contact_') || key.startsWith('edit_category_')) {
                keysToRemove.push(key);
            }
        });
        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
        console.error('Erreur nettoyage localStorage:', e);
    }
}

/**
 * Encoder du HTML pour l'affichage sécurisé
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==============================
// ÉVÉNEMENTS & LISTENERS
// ==============================
function setupEventListeners() {
    // Boutons Éditer sur la liste des contacts (délégué)
    const editContainer = document.querySelector('#contacts-list, #last-contacts, #dashboard')?.closest('.container-page-content') || document.body;

    editContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-edit-contact');
        if (btn) {
            const card = btn.closest('.contact-card');
            if (card) {
                const contactId = parseInt(card.getAttribute('data-id'));
                if (contactId) {
                    loadContactById(contactId).then(contact => {
                        if (contact) openContactModal(contact);
                    }).catch(err => {
                        console.error('Erreur chargement contact pour édition:', err);
                    });
                }
            }
        }
    }, true);

    // Boutons Supprimer sur la liste des contacts (délégué)
    editContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-delete-contact');
        if (btn) {
            const card = btn.closest('.contact-card');
            if (card) {
                const contactId = parseInt(card.getAttribute('data-id'));
                if (contactId) {
                    // Confirmation avant suppression
                    if (confirm('Supprimer ce contact définitivement ?')) {
                        deleteContact(contactId);
                    }
                }
            }
        }
    }, true);

    // Bouton Ajouter un contact
    const addContactBtn = document.getElementById('add-contact-btn');
    if (addContactBtn) {
        addContactBtn.addEventListener('click', () => openContactModal());
    }

    // Modal d'édition - Bouton Annuler
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', closeEditModal);
    }

    // Bouton Enregistrer dans le formulaire de contact
    const saveContactBtn = document.getElementById('save-contact-btn');
    if (saveContactBtn) {
        saveContactBtn.addEventListener('click', async () => {
            const contactId = document.getElementById('contact-id').value;
            const nom = document.getElementById('nom').value.trim();
            const prenom = document.getElementById('prenom').value.trim();

            // Validation basique
            if (!nom || !prenom) {
                showError('Le nom et le prénom sont obligatoires');
                return;
            }

            const contactData = {
                nom,
                prenom,
                email: document.getElementById('email').value,
                telephone: document.getElementById('telephone').value,
                organisation: document.getElementById('organisation').value,
                tagsInput: document.getElementById('tags-input').value.replace(/;/g, ';'),
                notes: document.getElementById('notes').value,
                categories: []
            };

            // Extraire les catégories des tags
            if (contactData.tagsInput) {
                const tagNames = contactData.tagsInput.split(';');
                for (const tagName of tagNames) {
                    if (tagName.trim()) {
                        const normalizedTag = normalizeName(tagName.trim());

                        // Vérifier si la catégorie existe, sinon la créer
                        let category_id;
                        try {
                            const existingCategory = await loadCategories();
                            const foundCategory = existingCategory.find(c => normalizeName(c.nom) === normalizedTag);

                            if (foundCategory) {
                                category_id = foundCategory.id;
                            } else {
                                // Création automatique de la catégorie
                                createCategory({ nom: tagName.trim(), couleur: getRandomColor() });
                                // Attendre la création pour obtenir le nouvel ID (simplifié : on suppose qu'elle existe déjà dans le localStorage)
                                await new Promise(resolve => setTimeout(resolve, 100));
                            }
                        } catch (e) {
                            console.error('Erreur gestion catégories:', e);
                        }
                    }
                }
            }

            if (contactId) {
                // Mise à jour - nettoyer les données d'édition localStorage
                const updated = await updateContact(contactId, contactData);
                cleanupLocalStorageKeys();
            } else {
                // Création - sauvegarder pour édition ultérieure si le modal reste ouvert
                const created = await createContact(contactData);
                saveContactToLocalStorage(created.id);
            }
        });
    }

    // Bouton Supprimer dans le formulaire
    const deleteContactBtn = document.querySelector('.delete-btn');
    if (deleteContactBtn) {
        deleteContactBtn.addEventListener('click', async () => {
            const contactId = document.getElementById('contact-id').value;
            if (contactId) {
                const deleted = await deleteContact(contactId);
                if (deleted) {
                    closeContactModal();
                }
            }
        });
    }

    // Bouton Enregistrer la catégorie
    const saveCategoryBtn = document.getElementById('save-category-btn');
    if (saveCategoryBtn) {
        saveCategoryBtn.addEventListener('click', async () => {
            const categoryId = document.getElementById('category-id').value;
            const nom = document.getElementById('category-nom').value.trim();
            const couleur = document.getElementById('category-couleur').value;

            if (!nom) {
                showError('Le nom de la catégorie est obligatoire');
                return;
            }

            const categoryData = { nom, couleur };

            if (categoryId) {
                // Mise à jour
                await updateCategory(categoryId, categoryData);
            } else {
                // Création
                await createCategory(categoryData);
            }
        });
    }

    // Bouton Supprimer la catégorie
    const deleteCategoryBtn = document.querySelector('.delete-category-btn');
    if (deleteCategoryBtn) {
        deleteCategoryBtn.addEventListener('click', async () => {
            const categoryId = document.getElementById('category-id').value;
            if (categoryId) {
                await deleteCategory(categoryId);
            }
        });
    }

    // Bouton Ajouter une catégorie
    const addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => openCategoryModal());
    }

    // Bouton Charger plus de contacts
    const loadMoreContactsBtn = document.getElementById('load-more-contacts');
    if (loadMoreContactsBtn) {
        loadMoreContactsBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${API_BASE}/contacts`);
                const result = await response.json();

                if (result.success) {
                    // Ajouter les nouveaux contacts à la liste existante
                    const container = document.getElementById('last-contacts');
                    if (container && result.data.length > 0) {
                        // Préserver l'entête si elle existe
                        let headerHtml = '';
                        if (container.querySelector('h4')) {
                            headerHtml = container.querySelector('h4').innerHTML;
                        }

                        const oldContacts = Array.from(container.querySelectorAll('.contact-card'));
                        const newContacts = result.data.slice(-10).map(c => createContactCard(c));
                        container.innerHTML = headerHtml + newContacts.join('');

                    }
                }
            } catch (error) {
                console.error('Erreur load more contacts:', error);
            }
        });
    }

    // Gestionnaire d'envoi du formulaire de contact
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleContactSubmit();
        });
    }

    // Bouton Charger les statistiques
    const loadStatsBtn = document.getElementById('load-stats-btn');
    if (loadStatsBtn) {
        loadStatsBtn.addEventListener('click', async () => {
            await loadDashboard();
        });
    }

    // Supprimer le localStorage sur fermeture des modals (mode édition)
    const closeButtons = document.querySelectorAll('.btn-close, .cancel-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            await cleanupLocalStorageKeys();
            if (btn.classList.contains('cancel-btn')) {
                // Bouton Annuler - ferme aussi le modal
                closeEditModal.call(this);
            } else {
                // Bouton X à côté du titre - on ne ferme que pour l'édition
                const contactId = document.getElementById('contact-id')?.value;
                if (contactId) {
                    closeEditModal.call(this);
                }
            }
        });
    });
    // Bouton fermer le modal de contact (si existant)                                                                                                          
    const closeModalBtn = document.getElementById('close-modal-btn');                                                                                           
    if (closeModalBtn) {                                                                                                                                        
        closeModalBtn.addEventListener('click', closeContactModal);                                                                                             
    }                                                                                                                                                           
                                                                                                                                                                
    // Bouton fermer le modal de contact (via #close-modal-btn ID)                                                                                              
    const closeModalBtn2 = document.querySelector('#close-modal-btn, .btn-close');                                                                              
    if (closeModalBtn2 && !closeModalBtn2.__hasCloseListener) {                                                                                                 
        closeModalBtn2.addEventListener('click', closeContactModal);                                                                                            
        closeModalBtn2.__hasCloseListener = true;                                                                                                               
    }      

    // Bouton vider la base de données (dans la page paramètres)
    const clearDatabaseBtn = document.getElementById('clear-database-btn')
    if (clearDatabaseBtn) {
        clearDatabaseBtn.addEventListener('click', async () => {
            await clearDatabase();
        });
    }

    // Bouton vérifier l'état de la base de données
    const checkDbStatusBtn = document.getElementById('check-db-status-btn')
    if (checkDbStatusBtn) {
        checkDbStatusBtn.addEventListener('click', async () => {
            await checkDatabaseEmpty();
        });
    }
}

/**
 * Traitement de la soumission du formulaire de contact
 */
async function handleContactSubmit() {
    const contactId = document.getElementById('contact-id').value;
    const nom = document.getElementById('nom').value.trim();
    const prenom = document.getElementById('prenom').value.trim();

    if (!nom || !prenom) {
        showError('Le nom et le prénom sont obligatoires');
        return false;
    }

    // Récupérer toutes les valeurs des nouveaux champs vCard
    const titre = document.getElementById('titre')?.value || '';
    const prenom_honneur_prefix = document.getElementById('prenom_honneur_prefix')?.value || '';
    const prenom_honneur_suffix = document.getElementById('prenom_honneur_suffix')?.value || '';
    const surnom = document.getElementById('surnom')?.value || '';
    const email = document.getElementById('email')?.value || '';
    const telephone = document.getElementById('telephone')?.value || '';
    const organisation = document.getElementById('organisation')?.value || '';
    const adresse = document.getElementById('adresse')?.value || '';
    const code_postal = document.getElementById('code_postal')?.value || '';
    const pays = document.getElementById('pays')?.value || '';
    const ville = document.getElementById('ville')?.value || '';
    const region = document.getElementById('region')?.value || '';
    const anniversaire = document.getElementById('anniversaire')?.value || '';
    const conjoint = document.getElementById('conjoint')?.value || '';
    const tags = (document.getElementById('tags-input')?.value || '');
    const notes = document.getElementById('notes')?.value || '';

    const contactData = {
        nom,
        prenom,
        titre,
        prenom_honneur_prefix,
        prenom_honneur_suffix,
        surnom,
        email,
        telephone,
        organisation,
        adresse,
        code_postal,
        pays,
        ville,
        region,
        anniversaire,
        conjoint,
        tags,
        notes,
        categories: []
    };

    // Extraire les catégories des tags
    if (contactData.tags) {
        const tagNames = contactData.tags.split(';');
        for (const tagName of tagNames) {
            if (tagName.trim()) {
                const normalizedTag = normalizeName(tagName.trim());

                // Vérifier si la catégorie existe, sinon la créer
                try {
                    const existingCategories = await loadCategories();
                    const foundCategory = existingCategories.find(c => normalizeName(c.nom) === normalizedTag);

                    if (foundCategory) {
                        // Catégorie existante
                    } else {
                        // Création automatique de la catégorie
                        createCategory({ nom: tagName.trim(), couleur: getRandomColor() });
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } catch (e) {
                    console.error('Erreur gestion catégories:', e);
                }
            }
        }
    }

    if (contactId) {
        // Mise à jour
        const updated = await updateContact(contactId, contactData);
    } else {
        // Création
        const created = await createContact(contactData);
    }

    return true;
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

// ==============================
// FUSION DE CONTACTS
// ==============================
async function searchSimilarContacts(id1, id2) {
    try {
        const response = await fetch(`${API_BASE}/contacts/merge/${id1}/${id2}`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showNotification('success', `Contacts ${id1} et ${id2} fusionnés avec succès!`);
            loadContacts();
        } else {
            showError(result.message || 'Erreur lors de la fusion');
        }
    } catch (error) {
        console.error('Erreur searchSimilarContacts:', error);
        const msg = error.message?.includes('Failed to fetch') || error.message?.includes('network')
            ? 'Le serveur n\'est pas accessible sur http://localhost:3000'
            : error.message || 'Erreur lors de la fusion des contacts';
        showError(msg);
    }
}

// ==============================
// GESTION DES MODALS (fusion, doublons)
// ==============================
function setupDuplicateModalListeners() {
    const closeDuplicateBtn = document.getElementById('close-duplicate-modal-btn');
    if (closeDuplicateBtn) {
        closeDuplicateBtn.addEventListener('click', closeModalDuplicates);
    }

    const closeDuplicatesBtn = document.getElementById('close-duplicates-btn');
    if (closeDuplicatesBtn) {
        closeDuplicatesBtn.addEventListener('click', closeModalDuplicates);
    }

    const mergeSelectedBtn = document.getElementById('merge-selected-btn');
    if (mergeSelectedBtn) {
        mergeSelectedBtn.addEventListener('click', async () => {
            if (duplicateContacts.length >= 2) {
                await searchSimilarContacts(duplicateContacts[0].id, duplicateContacts[1].id);
            } else {
                closeModalDuplicates();
            }
        });
    }
}

// ==============================
// IMPORT/EXPORT EVENT LISTENERS
// ==============================
function setupImportExportListeners() {
    // Drag & drop CSV
    const csvUploadArea = document.getElementById('csv-upload-area');
    if (csvUploadArea) {
        csvUploadArea.addEventListener('click', () => {
            const fileInput = document.getElementById('csv-file-input');
            if (fileInput) fileInput.click();
        });

        csvUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            csvUploadArea.classList.add('drag-over');
        });

        csvUploadArea.addEventListener('dragleave', () => {
            csvUploadArea.classList.remove('drag-over');
        });

        csvUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            csvUploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) {
                showUploadStatus('none', '');
                handleCsvUpload(file);
            }
        });

        // Input file CSV
        const csvFileInput = document.getElementById('csv-file-input');
        if (csvFileInput) {
            csvFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) handleCsvUpload(file);
            });
        }

        // Bouton annuler import CSV
        const cancelCsvImportBtn = document.getElementById('import-cancel-btn');
        if (cancelCsvImportBtn) {
            cancelCsvImportBtn.addEventListener('click', () => {
                showUploadStatus('none', '');
            });
        }
    }

    // Drag & drop VCF
    const vcfUploadArea = document.getElementById('vcf-upload-area');
    if (vcfUploadArea) {
        vcfUploadArea.addEventListener('click', () => {
            const fileInput = document.getElementById('vcf-file-input');
            if (fileInput) fileInput.click();   
        });

        vcfUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            vcfUploadArea.classList.add('drag-over');
        });

        vcfUploadArea.addEventListener('dragleave', () => {
            vcfUploadArea.classList.remove('drag-over');
        });

        vcfUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            vcfUploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.vcf')) {
                showUploadStatus('none', '');
                handleVcfUpload(file);
            }
        });

        // Input file VCF
        const vcfFileInput = document.getElementById('vcf-file-input');
        if (vcfFileInput) {
            vcfFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
          //      if (file) handleVcfUpload(file);
            });
        }
    }

    // Bouton Exporter
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const formatExportAllModal = document.getElementById('export-preview-modal');
            const exportPreviewList = document.getElementById('export-preview-list');
            const previewContactCount = document.getElementById('preview-contact-count');

            const format = ['csv', 'vcf', 'xlsx'].filter(f => document.getElementById(`export-${f}-checkbox`).checked);
            let contactIds = [];

            // Filtrer par "Tous les contacts" ou sélectionner les IDs spécifiques
            if (document.getElementById('export-all-contacts').checked) {
                contactIds = contacts.map(c => c.id);
            } else {
                selectedContactIds.forEach(id => contactIds.push(parseInt(id)));
            }

            // Afficher la liste d'aperçu
            if (format.length > 0) {
                exportPreviewList.innerHTML = `
                    <div style="padding: var(--spacing-md);">
                        <p style="margin-bottom: var(--spacing-sm); font-weight: 600;">Formats à exporter :</p>
                        ${format.map(f => `<span style="background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px; margin-right: 8px; color: #666;">${f.toUpperCase()}</span>`).join('')}
                    </div>
                `;

                // Ouvrir le modal de prévisualisation
                formatExportAllModal.classList.add('show');

                // Bouton fermer le modal de prévisualisation
                const closePreviewBtn = document.getElementById('close-export-preview-btn');
                if (closePreviewBtn) {
                    closePreviewBtn.addEventListener('click', () => {
                        formatExportAllModal.classList.remove('show');
                    });
                }

                // Fermer le modal au clic en dehors
                formatExportAllModal.addEventListener('click', (e) => {
                    if (e.target === formatExportAllModal) {
                        formatExportAllModal.classList.remove('show');
                    }
                });
            }
        });
    }
}

/**
 * Vider la base de données (confirmation requise)
 */
async function clearDatabase() {
    // Demander une confirmation supplémentaire pour éviter les clics accidentels
    const confirmAction = window.confirm(
        '⚠️ ATTENTION ! Cette action effacera TOUS les contacts, catégories et leurs relations.\n\n' +
        'Cette action est IRREVERSIBLE. Les données ne pourront pas être récupérées.\n\n' +
        'Êtes-vous SÛR de vouloir continuer ?\n\nRépondez "OUI" pour confirmer.'
    );

    if (!confirmAction) return false;

    // Ajouter un délai pour permettre à l'utilisateur de revenir en arrière avant d\'envoyer la requête
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        const response = await fetch('/api/clear-db', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ confirm: true })
        });

        if (response.ok) {
            const data = await response.json();

            // Afficher un message de succès
            alert(data.message || 'La base de données a été vidée avec succès.');

            // Recharger l'interface
            window.location.href = window.location.pathname;
            return true;
        } else {
            const errorData = await response.json();
            showError(errorData.error || 'Erreur inconnue');
            return false;
        }
    } catch (error) {
        console.error('Erreur lors du vidage de la base de données:', error);
        showError(`Échec de l'opération : ${error.message}`);
        return false;
    }
}

/**
 * Vérifier si la base de données est vide
 */
async function checkDatabaseEmpty() {
    try {
        const response = await fetch('/api/stats');
        if (response.ok) {
            const stats = await response.json();

            // Mettre à jour les indicateurs dans la page paramètres
            const totalContactsEl = document.getElementById('settings-total-contacts');
            const totalCategoriesEl = document.getElementById('settings-total-categories');

            if (totalContactsEl && totalCategoriesEl) {
                totalContactsEl.textContent = stats.total_contacts || 0;
                totalCategoriesEl.textContent = stats.total_categories || 0;

                // Afficher l'état de la base de données
                const dbStatusDiv = document.getElementById('settings-db-status');
                if (dbStatusDiv) {
                    if ((stats.total_contacts === 0 || !stats.total_contacts) &&
                        (stats.total_categories === 0 || !stats.total_categories)) {
                        dbStatusDiv.innerHTML = '<span style="color: green;"><i class="fas fa-check-circle"></i> Base de données vide</span>';
                    } else {
                        dbStatusDiv.innerHTML = '<span style="color: orange;"><i class="fas fa-exclamation-triangle"></i> Données présentes dans la base</span>';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'état de la base de données:', error);
    }
}

// ==============================
// MODAL DOCUMENTATION vCARD
// ==============================
/**
 * Ouvrir le modal de documentation vCard au premier chargement
 */
function showVCardDoc() {
    const docModal = document.getElementById('vcard-doc-modal');
    if (docModal && localStorage.getItem('vcard_doc_shown') !== 'true') {
        // Mettre à jour le titre du modal selon la page
        const pageTitle = document.getElementById('page-title')?.textContent || 'Mes Contacts';
        docModal.querySelector('h3').innerHTML = `<i class="fas fa-info-circle"></i> Champs vCard standards - Documentation`;

        docModal.style.display = 'block';

        // Fermer après 45 secondes (optionnel)
        setTimeout(() => {
            if (docModal.style.display === 'block') {
                docModal.style.display = 'none';
                localStorage.setItem('vcard_doc_shown', 'true');
            }
        }, 45000);
    }
}

// ==============================
// INITIALISATION
// ==============================
document.addEventListener('DOMContentLoaded', async () => {
    // Attendre que le serveur serve les assets CSS/JS
    await new Promise(resolve => setTimeout(resolve, 300));

    // Afficher la documentation vCard au premier lancement
    showVCardDoc();

    // Charger les données par défaut si nécessaire
    try {
        if (!localStorage.getItem('site_name')) {
            const response = await fetch(`${API_BASE}/config`);
            if (response.ok) {
                const config = await response.json();
                if (config.success) {
                    localStorage.setItem('site_name', config.site_name || 'Mes Contacts');
                    localStorage.setItem('footer_text', config.footer_text || '');
                }
            }
        }
    } catch (error) {
        console.error('Erreur chargement config:', error);
    }

    // Initialiser la liste des contacts par défaut
    await loadContacts();

    // Charger les catégories
    try {
        const response = await fetch(`${API_BASE}/categories`);
        if (response.ok) {
            const result = await response.json();
            if (result.success && !result.data.length) {
                // Créer des catégories de base pour le premier lancement
                createCategory({ nom: 'Amis', couleur: '#4285f4' });
                createCategory({ nom: 'Famille', couleur: '#ea4335' });
                createCategory({ nom: 'Clients', couleur: '#34a853' });
                createCategory({ nom: 'Lien', couleur: '#ff9900' });
            } else if (result.data) {
                categories = result.data;
            }
        }
    } catch (error) {
        console.error('Erreur chargement catégories:', error);
    }

    // Charger les statistiques
    await loadDashboard();

    // Charger la liste des contacts par défaut (10 premiers)
    try {
        const response = await fetch(`${API_BASE}/contacts`);
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                window.contacts = result.data;
            }
        }
    } catch (error) {
        console.error('Erreur chargement contacts par défaut:', error);
    }

    // Charger les contacts du localStorage s'ils existent (pour l'édition)
    const editContactsLocalStorage = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('edit_contact_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                editContactsLocalStorage[data.id] = data;
            } catch (e) {}
        }
    }

    // Appliquer les données en cours d'édition dans le formulaire
    for (const contactId in editContactsLocalStorage) {
        const data = editContactsLocalStorage[contactId];
        if (data && (data.nom || data.prenom)) {
            document.getElementById('nom').value = data.nom || '';
            document.getElementById('prenom').value = data.prenom || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('telephone').value = data.telephone || '';
            document.getElementById('organisation').value = data.organisation || '';
            document.getElementById('tags-input').value = data.tagsInput || '';
            document.getElementById('notes').value = data.notes || '';
        }
    }

    // Vérifier si on a ouvert un contact depuis le localStorage
    const contactIdFromStorage = localStorage.getItem('contact_id_for_edit');
    if (contactIdFromStorage) {
        const id = parseInt(contactIdFromStorage);
        if (id) {
            loadContactById(id).then(contact => {
                if (contact) {
                    openContactModal(contact);
                }
            }).catch(() => {});
        }
    }

    // Initialiser les écouteurs d'événements
    setupEventListeners();
    setupDuplicateModalListeners();
    setupImportExportListeners();
});

// ==============================
// FUSION DE CONTACTS
// ==============================
async function searchSimilarContacts(id1, id2) {
    try {
        const response = await fetch(`${API_BASE}/contacts/merge/${id1}/${id2}`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showNotification('success', `Contacts ${id1} et ${id2} fusionnés avec succès!`);
            loadContacts();
        } else {
            showError(result.message || 'Erreur lors de la fusion');
        }
    } catch (error) {
        console.error('Erreur searchSimilarContacts:', error);
        const msg = error.message?.includes('Failed to fetch') || error.message?.includes('network')
            ? 'Le serveur n\'est pas accessible sur http://localhost:3000'
            : error.message || 'Erreur lors de la fusion des contacts';
        showError(msg);
    }
}

// ==============================
// GESTION DES MODALS (fusion, doublons)
// ==============================
function setupDuplicateModalListeners() {
    const closeDuplicateBtn = document.getElementById('close-duplicate-modal-btn');
    if (closeDuplicateBtn) {
        closeDuplicateBtn.addEventListener('click', closeModalDuplicates);
    }

    const closeDuplicatesBtn = document.getElementById('close-duplicates-btn');
    if (closeDuplicatesBtn) {
        closeDuplicatesBtn.addEventListener('click', closeModalDuplicates);
    }

    const mergeSelectedBtn = document.getElementById('merge-selected-btn');
    if (mergeSelectedBtn) {
        mergeSelectedBtn.addEventListener('click', async () => {
            if (duplicateContacts.length >= 2) {
                await searchSimilarContacts(duplicateContacts[0].id, duplicateContacts[1].id);
            } else {
                closeModalDuplicates();
            }
        });
    }
}

// ==============================
// MODAL DOCUMENTATION vCARD - ÉCOUTEURS
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    // Bouton fermer le modal de documentation vCard
    const closeVcardDocBtn = document.getElementById('close-vcard-doc-btn');
    if (closeVcardDocBtn) {
        closeVcardDocBtn.addEventListener('click', () => {
            const docModal = document.getElementById('vcard-doc-modal');
            if (docModal) docModal.style.display = 'none';
            localStorage.setItem('vcard_doc_shown', 'true');
        });
    }

    // Bouton accepter le modal de documentation vCard
    const acceptVcardDocBtn = document.getElementById('accept-vcard-doc-btn');
    if (acceptVcardDocBtn) {
        acceptVcardDocBtn.addEventListener('click', () => {
            const docModal = document.getElementById('vcard-doc-modal');
            if (docModal) docModal.style.display = 'none';
            localStorage.setItem('vcard_doc_shown', 'true');
        });
    }

    // Fermer le modal de documentation en cliquant en dehors
    const vcardDocModal = document.getElementById('vcard-doc-modal');
    if (vcardDocModal) {
        vcardDocModal.addEventListener('click', (e) => {
            if (e.target === vcardDocModal) {
                vcardDocModal.style.display = 'none';
                localStorage.setItem('vcard_doc_shown', 'true');
            }
        });
    }
});

// Exposer les fonctions pour usage externe
window.App = {
    loadContacts,
    loadCategories,
    createContact,
    updateContact,
    deleteContact,
    searchSimilarContacts,
    clearDatabase,
    checkDatabaseEmpty
};
