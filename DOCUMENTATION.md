# DOCUMENTATION COMPLÈTE - MES CONTACTS

## 📖 À propos de ce document

Ce dossier contient la documentation complète de l'application **Mes Contacts**, une application web de gestion de contacts développée avec Node.js, Express et SQLite.

### Fichiers disponibles dans cette documentation :

| Fichier | Contenu |
|---------|---------|
| `ARCHITECTURE.md` | Vue d'ensemble de l'architecture technique |
| `API.md` | Documentation complète des endpoints API REST |
| `DATABASE.md` | Schéma et explications détaillées des tables |
| `GUIDE_DEPLOYMENT.md` | Guide pour déployer en production |
| `TROUBLESHOOTING.md` | Résolution de problèmes fréquents |

---

## 📚 Table des Matières

1. [Introduction](#1-introduction)
2. [Installation](#2-installation)
3. [Architecture](#3-architecture)
4. [API REST](#4-api-rest)
5. [Base de Données](#5-base-de-données)
6. [Guide de Développement](#6-guide-de-développement)
7. [Déploiement](#7-déploiement)

---

## 1. Introduction

### 🎯 Qu'est-ce que Mes Contacts ?

**Mes Contacts** est une application web complète pour la gestion de contacts, développée avec les technologies suivantes :

- **Backend** : Node.js + Express
- **Base de données** : SQLite (fichier local)
- **Frontend** : JavaScript pur (pas de framework)
- **Uploads** : Multer pour l'import CSV/VCF

### ✨ Fonctionnalités Principales

| Fonctionnalité | Description |
|---------------|-------------|
| **CRUD Contacts** | Créer, lire, modifier, supprimer des contacts |
| **Catégories** | Organisation par tags colorés (Amis, Famille, Clients...) |
| **Import CSV** | Import depuis Excel, Google Sheets ou fichiers CSV externes |
| **Import VCF** | Import depuis votre téléphone ou Outlook (.vcf) |
| **Export Multi-format** | Export vers CSV, VCF, XLSX/Excel |
| **Recherche** | Recherche globale par tous les champs + filtres dynamiques |
| **Tableau de bord** | Statistiques en temps réel (nombre de contacts, dernières actions) |
| **Détection doublons** | Interface pour fusionner contacts identiques |

### 🎨 Interface Utilisateur

L'application comprend 5 sections principales :

1. **Dashboard** - Vue d'ensemble avec statistiques et derniers contacts
2. **Contacts** - Liste complète des contacts avec gestion CRUD
3. **Catégories** - Gestion des tags/catégories colorées
4. **Import/Export** - Upload CSV/VCF ou téléchargement Excel
5. **Paramètres** - Configuration du site + statistiques détaillées

### 📱 Responsive Design

L'interface est complètement responsive :

- **Desktop** (> 992px) : Navigation latérale complète
- **Tablette** (768px - 992px) : Sidebar en haut ou cachable
- **Mobile** (< 768px) : Interface optimisée pour tactile

---

## 2. Installation

### Prérequis

Avant d'installer l'application, assurez-vous d'avoir :

| Composant | Version requise | Lien |
|-----------|-----------------|------|
| Node.js | ≥ 16.0.0 | https://nodejs.org/ |
| npm | ≥ 8.0.0 | (inclu avec Node.js) |

**Vérifier l'installation :**
```bash
node -v        # Doit affasser v16.x ou supérieur
npm -v         # Doit afficher v8.x ou supérieur
```

### Étape 1 : Installer les dépendances

Ouvrez un terminal dans le dossier du projet et exécutez :

```bash
npm install
```

Cela installera toutes les dépendances listées dans `package.json` :

| Dépendance | Rôle | Version |
|------------|------|---------|
| `express` | Framework web backend | ^4.x |
| `better-sqlite3` | Base de données SQLite native | ^9.x |
| `multer` | Gestion des fichiers uploadés | ^1.4.x |
| `csv-stringify` | Conversion vers/export CSV | ^6.x |
| `node-vcf` | Parsing/génération de fichiers VCF | ^3.x |
| `xlsx` (SheetJS) | Manipulation d'Excel XLSX | ^0.20.x |
| `cookie-parser` | Gestion des cookies/sessions | ^1.x |

### Étape 2 : Configuration environnementale (optionnel)

Pour personnaliser le port d'écoute, copiez et modifiez `.env.example` :

```bash
# Copier le fichier de configuration
cp .env.example .env

# Modifier si nécessaire
echo "PORT=3000" > .env
echo "NODE_ENV=development" >> .env
```

Configuration disponible dans `.env` :

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `PORT` | Port d'écoute du serveur | 3000 |
| `NODE_ENV` | Mode de fonctionnement | development |

### Étape 3 : Lancer l'application

#### Mode Développement (avec auto-rechargement)

```bash
npm run dev
```

Cela lancera **nodemon** qui surveille les fichiers sources et recharge automatiquement le serveur à chaque modification.

#### Mode Production

```bash
npm start
```

Ce mode lance Express sans surveillance de fichiers, idéal pour la production.

### Accéder à l'application

Après avoir lancé le serveur :

- **URL principale** : http://localhost:3000
- **API REST** : http://localhost:3000/api/*

---

## 3. Architecture

### 🏗️ Vue d'ensemble

L'application utilise une architecture MVC simplifiée sans framework frontalier. Toutes les données sont stockées dans une base SQLite fichier local.

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (public/)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   index.html │  │    style.css │  │     app.js       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                   SERVER (src/)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   server.js  │→ │ index.js     │→│   api.js          │  │
│  │              │  │ (Routes)     │  │   (API Endpoints)│  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│       ↓                    ↓                     ↓           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ contactCtrl  │  │configCtrl    │  │     db/          │  │
│  │              │  │              │  │   database.js    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕ SQLite
┌─────────────────────────────────────────────────────────────┐
│                  DATA (data/)                                │
│         ┌──────────────────────────────────┐                │
│         │           contacts.db            │                │
│         │     (tables + données persist.)  │                │
│         └──────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### 📁 Structure du projet détaillée

```
G:\Claude-Contacts\
├── public/                    # Fichiers frontend statiques
│   ├── css/
│   │   └── style.css          # Feuille de style responsive (600+ lignes)
│   ├── js/
│   │   └── app.js             # Logique JavaScript frontend (~2700 lignes)
│   ├── uploads/               # Fichiers importés temporairement (VIDÉ)
│   ├── index.html             # Page principale complète (5919 caractères)
│   └── js/
│       └── app.js             # Logique JavaScript SPA
├── src/                       # Code backend (Serveur + Routes)
│   ├── controllers/           # Contrôleurs de gestion des données
│   │   ├── contactController.js    # CRUD + recherche + fusion contacts
│   │   └── configController.js     # Configuration du site + stats
│   ├── db/                    # Gestion de la base SQLite
│   │   ├── database.js       # Initialisation + définition du schema
│   │   └── parser.js         # Parseur CSV/VCF (legacy - non utilisé)
│   ├── middleware/           # Middlewares Express
│   │   └── auth.js           # Authentification simple (non utilisée)
│   ├── routes/               # Routes de l'application
│   │   ├── api.js             # Toutes les routes API REST
│   │   └── index.js           # Routes principales frontend SPA
│   └── server.js              # Point d'entrée du serveur Express
├── data/                      # Données persistantes
│   ├── contacts.db           # SQLite (auto-généré au premier lancement)
│   └── uploads/              # Fichiers importés temporaires
├── .gitignore                 # Fichiers ignorés par Git
├── package.json               # Dépendances Node.js + scripts npm
├── README.md                  # Documentation principale
└── .env.example               # Modèle de configuration (.env non inclus)
```

### 🔄 Flux typique - Création d'un contact

1. **Client** : Utilisateur clique sur "Nouveau contact" dans l'interface HTML
2. **Frontend (app.js)** : Ouvre la modal et collecte les données du formulaire
3. **API Call** : `POST /api/contacts` avec le JSON contenant les données du contact
4. **Backend (api.js → contactController)** :
   - Valide les données obligatoires (nom, prénom)
   - Normalise les noms de catégories (suppression accents → MAJUSCULES)
   - Vérifie l'existence des catégories dans la base SQLite
5. **Database (database.js)** : Exécute `INSERT INTO contacts...` avec prepared statement
6. **Réponse** : Le backend renvoie le JSON du contact créé avec son ID
7. **Frontend** : Actualise la liste des contacts sans recharger la page

### 🎨 Flux Import CSV/VCF

1. **Drag & Drop** : L'utilisateur glisse-dépose un fichier CSV/VCF sur l'upload area
2. **Multer** : Fichier stocké temporairement dans `public/uploads/`
3. **Traitement (api.js)** :
   - Pour CSV : Parse ligne par ligne → création contacts + catégories automatiques
   - Pour VCF : Utilisation de `vcard-parser` pour lire le format standard
4. **Nettoyage** : Fichier supprimé immédiatement après traitement (`fs.unlinkSync()`)
5. **Réponse** : JSON avec succès et nombre de contacts importés

### 🔒 Sécurité implémentée

| Menace | Protection mise en place |
|--------|-------------------------|
| **Injection SQL** | Prepared statements via `db.prepare()` pour toutes les requêtes |
| **Uploads malveillants** | Multer limite à 10Mo + extension vérifiée (CSV/VCf/XLSX/images) |
| **Injection JavaScript** | Les tags HTML dans les formulaires sont échappés côté serveur |
| **Accès non autorisé** | Aucun système d'authentification (single-user, usage local uniquement) |

> ⚠️ **Important** : Cette application n'inclut pas de système d'authentification. Elle est conçue pour une utilisation single-user ou multi-utilisateurs sans sécurité avancée (pas de hachage de mots de passe, pas de JWT, etc.). Pour un usage public/multi-utilisateur en production, implémenter une authentification complète est recommandé.

---

## 4. API REST

### 📡 Endpoints disponibles

Tous les endpoints retournent un JSON au format standard :

```json
{
  "success": true,
  "message": "Opération effectuée avec succès",
  "data": { ... }
}
```

Les erreurs retournent :

```json
{
  "success": false,
  "error": "Message d'erreur descriptif"
}
```

### ✏️ Gestion des contacts (CRUD)

#### GET /api/contacts - Liste tous les contacts

Retourne une paginération de 10 contacts par défaut.

**Paramètres query :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `page` | number | Numéro de page (défaut : 1) |
| `limit` | number | Nombre d'items par page (défaut : 10) |

**Réponse :**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nom": "Dupont",
      "prenom": "Jean",
      "titre": "M.",
      "prenom_honneur_prefix": "",
      "prenom_honneur_suffix": "",
      "surnom": "D.",
      "email": "jean.dupont@example.com",
      "telephone": "+33123456789",
      "organisation": "Ma Entreprise SA",
      "adresse": "123 rue de l'Exemple",
      "code_postal": "75000",
      "pays": "France",
      "ville": "Paris",
      "region": "Île-de-France",
      "anniversaire": "1985-05-20",
      "conjoint": "Marie Dupont",
      "tags": "Client;VIP;Prioritaire",
      "notes": "Contact principal pour le projet X",
      "categories": [
        { "id": 1, "nom": "CLIENT VIP", "couleur": "#4285f4" },
        { "id": 3, "nom": "PRIORITAIRE", "couleur": "#ff9900" }
      ],
      "created_at": "2026-05-13T10:30:00.000Z"
    }
  ],
  "total_contacts": 42,
  "total_pages": 5
}
```

#### GET /api/contacts/:id - Obtenir un contact spécifique

Récupère les informations complètes d'un contact donné son ID.

**Exemple :**

```bash
curl http://localhost:3000/api/contacts/1
```

**Réponse :** (même structure que la liste, mais sans pagination)

#### POST /api/contacts - Créer un nouveau contact

Le second paramètre (`prenom`) est **obligatoire**. Si les catégories ne sont pas fournies, elles seront créées automatiquement avec une couleur aléatoire.

**Requête :**

```bash
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Martin",
    "prenom": "Sophie",
    "email": "sophie.martin@example.com",
    "telephone": "+33612345678",
    "organisation": "Tech Solutions SAS",
    "tags": "Client;Nouveau",
    "notes": "Introduite par Jean Dupont"
  }'
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "id": 3,
    "nom": "Martin",
    "prenom": "Sophie",
    ...
    "categories": [
      { "id": 5, "nom": "CLIENT", "couleur": "#70ad47" },
      { "id": 6, "nom": "NOUVEAU", "couleur": "#ea4335" }
    ]
  },
  "message": "Contact créé avec succès"
}
```

#### PUT /api/contacts/:id - Mettre à jour un contact

Tous les champs sont optionnels (sauf `nom` et `prenom`). La méthode synchronise automatiquement les catégories avec la base.

**Requête :**

```bash
curl -X PUT http://localhost:3000/api/contacts/1 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nouvel@email.com",
    "telephone": "+33987654321",
    "tags": "Client;VIP;Prioritaire"
  }'
```

#### DELETE /api/contacts/:id - Supprimer un contact

La suppression déclenche une cascade automatique vers les tables `contact_categories` (via FOREIGN KEY CASCADE).

**Requête :**

```bash
curl -X DELETE http://localhost:3000/api/contacts/1
```

**Réponse :**

```json
{
  "success": true,
  "message": "Contact ID 1 supprimé avec succès",
  "total_contacts_remaining": 41
}
```

### 🔍 Recherche et filtrage

#### GET /api/contacts/search?q={term} - Recherche globale

Recherche fuzzy sur tous les champs (nom, prénom, email, téléphone, etc.). La recherche est case-insensitive.

**Paramètres query :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `q` | string | Terme de recherche (requ) |

**Exemple :**

```bash
curl "http://localhost:3000/api/contacts/search?q=dupont"
```

**Réponse :** Liste paginée des contacts contenant "dupont" dans l'un quelconque de leurs champs.

#### GET /api/contacts/filter/email?email={e} - Filtrer par email

Retourne tous les contacts dont l'adresse email contient la chaîne fournie (substring match).

**Exemple :**

```bash
curl "http://localhost:3000/api/contacts/filter/email?email=martin"
```

#### GET /api/contacts/filter/phone?phone={p} - Filtrer par téléphone

Retourne tous les contacts dont le numéro de téléphone contient la chaîne fournie.

**Exemple :**

```bash
curl "http://localhost:3000/api/contacts/filter/phone?phone=01"
```

#### GET /api/contacts/filter/organisation?org={o} - Filtrer par organisation

Retourne tous les contacts dont l'organisation contient la chaîne fournie.

**Exemple :**

```bash
curl "http://localhost:3000/api/contacts/filter/organisation?org=tech"
```

### 🔄 Fusion de contacts

#### POST /api/contacts/:id1/merge/:id2 - Fusionner deux contacts

Fusionne les informations de deux contacts en conservant toutes les données. Le contact ID2 sera conservé avec ses champs mis à jour par ceux du contact ID1. Les associations catégories sont également fusionnées (par nom de catégorie normalisé).

**Requête :**

```bash
curl -X POST http://localhost:3000/api/contacts/1/merge/2
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "id1_merged": 1,
    "id2_kept": 2,
    "merged_data": { ... }
  },
  "message": "Contacts fusionnés avec succès"
}
```

### 🏷️ Gestion des catégories

#### GET /api/categories - Liste toutes les catégories

Récupère le catalogue complet des catégories disponibles dans la base de données.

**Réponse :**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nom": "CLIENT VIP",
      "couleur": "#4285f4"
    },
    {
      "id": 3,
      "nom": "PRIORITAIRE",
      "couleur": "#ff9900"
    },
    {
      "id": 4,
      "nom": "NOUVEAU",
      "couleur": "#ea4335"
    }
  ]
}
```

#### POST /api/categories - Créer une nouvelle catégorie

**Requête :**

```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "CLIENT FIDÈLE",
    "couleur": "#28a745"
  }'
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "id": 6,
    "nom": "CLIENT FIDÈLE",
    "couleur": "#28a745"
  },
  "message": "Catégorie créée avec succès"
}
```

#### PUT /api/categories/:id - Mettre à jour une catégorie

**Requête :**

```bash
curl -X PUT http://localhost:3000/api/categories/1 \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "CLIENT PREMIUM",
    "couleur": "#007bff"
  }'
```

#### DELETE /api/categories/:id - Supprimer une catégorie

La suppression déclenche une cascade automatique vers la table `contact_categories` (via FOREIGN KEY CASCADE).

**Requête :**

```bash
curl -X DELETE http://localhost:3000/api/categories/1
```

### 📥 Import de fichiers

#### POST /api/import/csv - Importer depuis CSV

Fichier multipart upload avec extension `.csv`. Le parser utilise une séparation simple par virgule (ne gère pas correctement les valeurs CSV quotees).

**Requête :**

```bash
curl -X POST http://localhost:3000/api/import/csv \
  -F "file=@contacts.csv"
```

Format attendu pour `contacts.csv` :

| Prénom | Nom | Email | Téléphone | Organisation | Tags | Notes |
|--------|-----|-------|-----------|--------------|------|-------|
| Jean | Dupont | jean.dupont@email.com | 0123456789 | Ma Entreprise | Client;VIP | - |

**Réponse :**

```json
{
  "success": true,
  "message": "3 contacts importés avec succès",
  "created_contacts_count": 3,
  "created_categories_count": 0
}
```

#### POST /api/import/vcf - Importer depuis VCF (vCard)

Format standard `.vcf` utilisé par la plupart des téléphones mobiles et Outlook. Utilise la bibliothèque `node-vcf` pour le parsing.

**Requête :**

```bash
curl -X POST http://localhost:3000/api/import/vcf \
  -F "file=@contacts.vcf"
```

Exemple de contenu fichier VCF (format standard) :

```vcard
BEGIN:VCARD
VERSION:3.0
N;TZ;u;;Dupont;Jean;;;
FN;TZ;j=;u;;Jean Dupont;;
TEL;TYPE=CELL:+33123456789
EMAIL;INTERNET:jean.dupont@email.com
ORG;WORK;department;MyCompany Inc.;:Ma Entreprise
NOTE:Né en 1985, client depuis 2020
END:VCARD
```

**Réponse :**

```json
{
  "success": true,
  "message": "3 contacts importés avec succès",
  "created_contacts_count": 3,
  "created_categories_count": 0
}
```

### 📤 Export de fichiers

#### POST /api/export/csv - Exporter vers CSV

Les paramètres `ids` peuvent être omis pour exporter tous les contacts (séparés par virgule), ou spécifiques.

**Pour exporter TOUS les contacts :**

```bash
curl -X POST http://localhost:3000/api/export/csv \
  -d "ids="
```

**Pour exporter des contacts spécifiques :**

```bash
curl -X POST http://localhost:3000/api/export/csv \
  -d "ids=1,2,5,7"
```

**Réponse :** Fichier CSV en binary à télécharger directement.

#### POST /api/export/vcf - Exporter vers VCF (vCard)

Format multi-contact compatible avec les téléphones mobiles et Outlook.

**Pour exporter TOUS les contacts :**

```bash
curl -X POST http://localhost:3000/api/export/vcf \
  -d "ids="
```

**Réponse :** Fichier `.vcf` en binary à télécharger directement.

#### POST /api/export/xlsx - Exporter vers Excel XLSX

Format moderne d'Excel avec toutes les données organisées en colonnes.

**Pour exporter TOUS les contacts :**

```bash
curl -X POST http://localhost:3000/api/export/xlsx \
  -d "ids="
```

**Réponse :** Fichier `.xlsx` à télécharger directement.

### 🔧 Configuration du site

#### GET /api/config - Obtenir toutes les configurations

Récupère toutes les valeurs de configuration sauvegardées dans la session.

**Réponse :**

```json
{
  "success": true,
  "data": {
    "site_name": "Mes Contacts",
    "footer_text": "",
    "show_email": true,
    "show_telephone": true,
    "show_organisation": true,
    "max_contacts_per_page": 10,
    "default_category_color": "#4285f4"
  }
}
```

#### PUT /api/config/:key - Mettre à jour une configuration

Mette à jour la valeur d'une configuration spécifique.

**Requête :**

```bash
curl -X PUT "http://localhost:3000/api/config/show_email" \
  -H "Content-Type: application/json" \
  -d '"false"'
```

**Réponse :**

```json
{
  "success": true,
  "message": "show_email mis à jour à false",
  "data": {
    "key": "show_email",
    "value": false
  }
}
```

### 📊 Statistiques

#### GET /api/stats - Obtenir les statistiques globales

Retourne le nombre de contacts et catégories, ainsi que le dernier contact créé.

**Réponse :**

```json
{
  "success": true,
  "data": {
    "total_contacts": 42,
    "total_categories": 15,
    "last_created_contact": {
      "nom": "Bernard",
      "prenom": "Pierre",
      "created_at": "2026-05-13T10:30:00.000Z"
    }
  }
}
```

---

## 5. Base de données

### 📊 Schéma SQL complet

La base de données SQLite est définie dans `src/db/database.js`. Voici le schéma détaillé :

#### Table `contacts`

Stocke toutes les informations d'un contact avec support des champs vCard standards.

| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Identifiant unique auto-incrémenté |
| `nom` | VARCHAR(255) | NOT NULL | Nom de famille (ex: "Dupont") |
| `prenom` | VARCHAR(255) | NOT NULL | Prénom (ex: "Jean") |
| `titre` | VARCHAR(255) | - | Titre (M., Mme, Dr., etc.) |
| `prenom_honneur_prefix` | TEXT | - | Prénom honneur préfixe (ex: "Dr" dans "Dr. Jean") |
| `prenom_honneur_suffix` | TEXT | - | Prénom honneur suffixe (ex: "PhD" après le nom) |
| `surnom` | VARCHAR(255) | - | Surnom court (ex: "JD") |
| `email` | VARCHAR(255) | - | Adresse email |
| `telephone` | VARCHAR(255) | - | Numéro de téléphone |
| `organisation` | VARCHAR(255) | - | Entreprise/organisation |
| `adresse` | TEXT | - | Adresse complète |
| `code_postal` | VARCHAR(10) | - | Code postal |
| `pays` | VARCHAR(100) | - | Pays |
| `ville` | VARCHAR(100) | - | Ville |
| `region` | VARCHAR(100) | - | Région/État |
| `anniversaire` | DATE | - | Date d'anniversaire (YYYY-MM-DD) |
| `conjoint` | TEXT | - | Époux(se)/Partenaire |
| `tags` | TEXT | - | Tags séparés par point-virgule (;) |
| `notes` | TEXT | - | Notes libres texte |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Timestamp de création |

#### Table `categories`

Catalogue de catégories (tags) réutilisables avec codes couleurs.

| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Identifiant unique |
| `nom` | VARCHAR(255) | NOT NULL | Nom normalisé (sans accents, MAJUSCULES) |
| `couleur` | VARCHAR(7) | NOT NULL | Couleur hexadécimale (#RRGGBB) |

**Exemples de catégories :**

- "CLIENT VIP" → `#4285f4` (bleu)
- "FAMILLE" → `#ea4335` (rouge)
- "AMIS" → `#4caf50` (vert)
- "PRIORITAIRE" → `#ff9900` (orange)

#### Table `contact_categories`

Table de jonction pour les relations many-to-many entre contacts et catégories.

| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `contact_id` | INTEGER | FOREIGN KEY → contacts(id) CASCADE ON DELETE | ID du contact parent |
| `category_id` | INTEGER | FOREIGN KEY → categories(id) CASCADE ON DELETE | ID de la catégorie liée |

**Contraintes :**

- PRIMARY KEY (`contact_id`, `category_id`) - Couple unique
- ON DELETE CASCADE - Suppression automatique des liens lors de suppression d'un contact ou d'une catégorie

### 🔧 Initialisation automatique

Au premier lancement, la base de données est auto-générée :

```bash
# Au premier démarrage, le fichier contacts.db n'existe pas encore
npm run dev  # Lance nodemon + express

# Au chargement de src/db/database.js :
src/db/database.js (line 20)
    // Créer la table 'contacts' si elle n'existe pas
    db.exec(sql_create_contacts);

src/db/database.js (line 23-26)
    // Créer la table 'contact_categories' si elle n'existe pas
    db.exec(sql_create_contact_categories);

src/db/database.js (line 28-30)
    // Créer la table 'categories' si elle n'existe pas
    db.exec(sql_create_categories);

# Le fichier data/contacts.db est créé automatiquement avec le schéma complet
```

### 📁 Localisation des fichiers

| Fichier | Chemin absolu Windows |
|---------|----------------------|
| `data/contacts.db` | `G:\Claude-Contacts\data\contacts.db` |
| `public/uploads/` | `G:\Claude-Contacts\public\uploads\` |

### 🔍 Inspection la base de données

Vous pouvez inspecter manuellement la base SQLite avec n'importe quel outil :

**En ligne de commande (Windows) :**
```powershell
# Vérifier si le fichier existe
Test-Path "G:\Claude-Contacts\data\contacts.db"

# Afficher les informations du fichier
Get-Item "G:\Claude-Contacts\data\contacts.db" | Select-Object Name, Length, LastWriteTime

# Renommer pour sauvegarde (si nécessaire)
Move-Item -Force "data\contacts.db" "data\contacts_backup.db"
```

**Outils recommandés :**

- **DB Browser for SQLite** (GUI) : https://sqlitebrowser.org/
- **SQLite Expert Lite** : https://www.sqliteexpert.net/
- **DBeaver** : https://dbeaver.io/

### 🧹 Nettoyage et maintenance

#### Vider complètement la base de données

L'API dispose d'un endpoint pour vidér toute la base (avec double confirmation) :

```bash
curl -X POST "http://localhost:3000/api/clear-db" \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'
```

#### Restaurer une sauvegarde

```bash
# Renommer l'ancienne base
Move-Item -Force "data\contacts.db" "data\contacts_old.db"

# Relancer le serveur pour recréation automatique
npm run dev
```

---

## 6. Guide de développement

### 🚀 Scripts npm disponibles

| Script | Commande | Description |
|--------|----------|-------------|
| `dev` | `npm run dev` | Lance nodemon avec auto-reload en mode développement |
| `start` | `npm start` | Lance express en mode production (sans surveillance) |
| `test` | `npm test` | Exécute les tests si des fichiers tests existent |

### 📝 Ajout d'un nouveau champ de contact

Pour ajouter un nouveau champ à l'application :

1. **Modifier la table SQL** (`src/db/database.js`) :

```javascript
// Ajouter une colonne dans la création de la table contacts
const sql_create_contacts = `
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- ... autres colonnes existantes ...
    nouveau_champ VARCHAR(255),  <!-- NOUVELLE COLONNE -->
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;
```

2. **Modifier le routeur API** (`src/routes/api.js`) :

```javascript
// Dans createContact()
const stmt = db.prepare(`
    INSERT INTO contacts (nom, prenom, nouveau_champ, ...)
    VALUES (?, ?, ?, ...)
`);

// Dans updateContact()
const stmtUpdate = db.prepare(`
    UPDATE contacts 
    SET nom = ?, prenom = ?, nouveau_champ = ?, ...
    WHERE id = ?
`);
```

3. **Modifier le formulaire HTML** (`public/index.html`) :

```html
<input type="text" id="nouveau-champ" placeholder="Votre valeur">
```

4. **Modifier la logique frontend** (`public/js/app.js`) :

```javascript
function createContact(data) {
    return fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, nouveau_champ: document.getElementById('nouveau-champ').value })
    }).then(res => res.json());
}
```

### 🎨 Personnalisation des couleurs de catégories

Pour modifier la couleur d'une catégorie :

1. **En interface** : Ouvrez le modal d'édition d'une catégorie et modifiez la couleur via le sélecteur
2. **Via API** :

```bash
curl -X PUT "http://localhost:3000/api/categories/1" \
  -H "Content-Type: application/json" \
  -d '{"nom": "CLIENT VIP", "couleur": "#ff6b6b"}'
```

### 📦 Ajout d'une nouvelle catégorie par défaut

Vous pouvez pré-populer la base avec des catégories lors du premier lancement :

1. **Méthode 1 : Via l'interface web**

   - Allez sur `/#categories`
   - Cliquez sur "Ajouter une catégorie"
   - Remplissez le formulaire (ex: "PARTENAIRES" avec couleur bleue)
   - Enregistrez

2. **Méthode 2 : Injection SQL directe**

```sql
-- Connectez à data/contacts.db avec DB Browser for SQLite
-- Exécutez ces commandes pour ajouter des catégories de base

INSERT INTO categories (nom, couleur) VALUES
('CLIENT', '#4285f4'),
('PARTENAIRE', '#28a745'),
('POTENTIEL', '#fd7e14');
```

### 🧪 Tests manuels pour vérifier le fonctionnement

#### Test création contact :

```bash
curl -X POST "http://localhost:3000/api/contacts" ^
  -H "Content-Type: application/json" ^
  -d "{\"nom\": \"Test\", \"prenom\": \"User\", \"email\": \"test@test.com\"}"
```

#### Test liste contacts :

```bash
curl "http://localhost:3000/api/contacts"
```

#### Test recherche :

```bash
curl "http://localhost:3000/api/contacts/search?q=TEST"
```

---

## 7. Déploiement en production

### 📋 Prérequis de production

- Serveur avec Node.js v16+ installé
- Port 3000 libre (ou configurable via PORT dans .env)
- Droits d'écriture sur le dossier `data/`

### 🔐 Configuration sécurisée

#### Fichier `.env` pour production :

```bash
PORT=3000
NODE_ENV=production
```

**Ne jamais committer `.env` dans Git !** Il est listé dans `.gitignore`.

#### Variables d'environnement recommandées :

| Variable | Valeur de sécurité | Description |
|----------|-------------------|-------------|
| `PORT` | 3000 (ou autre) | Port d'écoute, évitez le 80/443 sans HTTPS |
| `NODE_ENV` | production | Active les comportements optimisés |

### 🚀 Déploiement sur hébergement partagé

1. **Copiez tout le projet** sur votre serveur :

```bash
# Via rsync (Linux/Mac)
rsync -avz /chemin/local/G:/Claude-Contacts/ utilisateur@serveur:/var/www/mes-contacts/

# Ou via SCP
scp -r G:/Claude-Contacts/ utilisateur@serveur:/var/www/mes-contacts/
```

2. **Installez les dépendances :**

```bash
cd /var/www/mes-contacts
npm install --production
```

3. **Configurez le système d'init (systemd) :**

```bash
sudo nano /etc/systemd/sites.mes-contacts.service
```

```ini
[Unit]
Description=Mes Contacts Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/mes-contacts
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /var/www/mes-contacts/node_modules/.bin/nodemon src/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

4. **Redémarrez le service :**

```bash
sudo systemctl start sites.mes-contacts
sudo systemctl enable sites.mes-contacts
```

### ☁️ Déploiement sur plateforme cloud

#### Heroku

1. **Installer Heroku CLI** : https://devcenter.heroku.com/articles/heroku-cli

2. **Créer un application Heroku :**

```bash
heroku login
heroku create mes-contacts-app
git push heroku main
```

3. **Installer dépendances automatiquement via `package.json`**

4. **Configurer l'URL de la base SQLite (via pgenv ou fichier externe)**

#### AWS EC2 / VPS Linux

```bash
# 1. Connectez-vous et installez Node.js
sudo apt update
sudo apt install -y nodejs npm

# 2. Clonez ou copiez le projet
scp -r G:/Claude-Contacts/ root@ec2-instance:/home/ec2-user/mes-contacts

# 3. Installez les dépendances
cd /home/ec2-user/mes-contacts
npm install --production

# 4. Créez un service systemd
sudo nano /etc/systemd/sites.mes-contacts.service
# (collez le contenu de l'exemple ci-dessus)

# 5. Redémarrez
sudo systemctl start sites.mes-contacts
```

### 📊 Monitoring en production

#### Vérifier la santé de l'application :

```bash
# Voir les logs du serveur
journalctl -u sites.mes-contacts -f

# Via curl (endpoint /api/stats)
curl http://localhost:3000/api/stats
```

#### Sauvegarder régulièrement la base SQLite :

```bash
#!/bin/bash
# Script de sauvegarde automatisé (backup.sh)

BACKUP_DIR="/var/backups/mes-contacts"
DATE=$(date +%Y%m%d_%H%M%S)
DATABASE="/var/www/mes-contacts/data/contacts.db"

mkdir -p "$BACKUP_DIR"
cp "$DATABASE" "$BACKUP_DIR/contactsb.$DATE.db"
# Optionnel : compression
# gzip "$BACKUP_DIR/contactsb.$DATE.db.gz"

# Garder seulement les 7 derniers jours de backups
find "$BACKUP_DIR" -name "*.db*" -mtime +7 -delete
```

```bash
sudo crontab -e
# Ajouter cette ligne pour sauvegarder chaque nuit à 2h
0 2 * * * /path/to/backup.sh >> /var/log/contacts_backup.log 2>&1
```

---

## 📚 Annexes

### Glossaire technique

| Terme | Définition |
|-------|------------|
| **CRUD** | Create, Read, Update, Delete (opérations de base sur les données) |
| **SQLite** | Base de données relationnelle légère stockée en fichier unique |
| **MVC** | Modèle-Vue-Contrôleur (architecture classique du développement web) |
| **REST API** | Interface de programmation basée sur des requêtes HTTP standards |
| **CASCADE** | Action automatique de suppression dans les tables liées |
| **vCard** | Format standard pour les fichiers de contacts (.vcf) |

### Codes couleurs utilisés (palette)

| Couleur | Code hexadécimal | Usage typique |
|---------|-----------------|---------------|
| Bleu | `#4285f4` | Clients, Professionnels |
| Vert | `#4caf50` | Amis, Familles |
| Rouge | `#ea4335` | Urgent, VIP |
| Orange | `#ff9900` | Prioritaire, Nouveau |

### Licences

- **Code source** : MIT License (libre utilisation, modification et redistribution)
- **Données utilisateurs** : À la charge de l'utilisateur (RGPD pour applications européennes)

---

<div align="center">

## 📞 Support & Contribution

Pour signaler des bugs ou proposer de nouvelles fonctionnalités :

1. Vérifiez d'abord cette documentation
2. Consultez les logs du serveur (`console` dans terminal de `npm run dev`)
3. Créez un ticket avec l'erreur complète + étapes pour reproduire

<div align="center">

**Développé avec ❤️ par l'équipe Contacts</div>

</center>
