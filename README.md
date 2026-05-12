# Mes Contacts - Application de Gestion de Contacts

Application web complète de gestion de contacts développée avec **Node.js**, **Express** et **SQLite**. Elle offre une interface utilisateur moderne, responsive et intuitive pour gérer tous vos contacts professionnels et personnels.

---

## 🎯 Fonctionnalités Principales

### Gestion Complète des Contacts (CRUD)
- **Créer** de nouveaux contacts avec toutes les informations nécessaires
- **Lire** tous les contacts via la liste ou le tableau de bord
- **Modifier** les informations d'un contact existant
- **Supprimer** définitivement un contact

### Organisation par Catégories
- Création et gestion de catégories (Tags) pour organiser vos contacts
- Codes couleurs personnalisables pour chaque catégorie
- Filtrage rapide par catégorie

### Import/Export Multi-Format
- **CSV** : Import depuis Excel ou Google Sheets, export vers Excel
- **VCF (vCard)** : Import depuis votre carnet d'adresses mobile, export compatible
- **XLSX/Excel** : Export dans le format moderne d'Excel

### Recherche et Filtrage Avancé
- Recherche globale par nom, prénom, email, téléphone ou organisation
- Filtrage dynamique par email, téléphone ou organisation
- Détection automatique de doublons

### Tableau de Bord
- Vue d'ensemble des statistiques (nombre de contacts, catégories)
- Liste des derniers contacts ajoutés
- Dernier contact créé

---

## 📁 Structure du Projet

```
G:\Claude-Contacts\
├── public/                    # Fichiers frontend statiques
│   ├── css/
│   │   └── style.css          # Feuille de style (design responsive)
│   ├── js/
│   │   └── app.js             # Logique JavaScript frontend
│   ├── uploads/               # Fichiers importés temporairement
│   └── index.html             # Page principale
├── src/                       # Code backend (Serveur + Routes)
│   ├── controllers/           # Contrôleurs de gestion des données
│   │   ├── contactController.js
│   │   └── configController.js
│   ├── db/                    # Gestion de la base de données SQLite
│   │   ├── database.js        # Initialisation de SQLite
│   │   └── parser.js          # Parseur CSV/VCF pour l'import
│   ├── middleware/            # Middlewares Express
│   │   └── auth.js            # Gestion d'authentification simple
│   ├── routes/                # Routes de l'application
│   │   ├── api.js             # Routes API REST
│   │   └── index.js           # Routes principales frontend
│   └── server.js              # Point d'entrée du serveur Express
├── data/                      # Données persistantes
│   ├── contacts.db            # Fichier de base SQLite (auto-généré)
│   └── uploads/               # Fichiers importés
├── .gitignore                 # Fichiers ignorés par Git
├── package.json               # Dépendances Node.js et scripts
├── README.md                  # Documentation (ce fichier)
└── .env.example               # Modèle de configuration environnementale
```

---

## 🛠️ Installation

### Prérequis
- **Node.js** v16.0 ou supérieur ([https://nodejs.org/](https://nodejs.org/))
- Recommandé : npm v8.0 ou supérieur

### 1. Installer les Dépendances

Ouvrez un terminal dans le dossier du projet et exécutez :

```bash
npm install
```

Cela installera toutes les dépendances définies dans `package.json` :
- `express` - Framework web backend
- `better-sqlite3` - Base de données SQLite native pour Node.js
- `multer` - Gestion des fichiers uploadés (import)
- `csv-stringify` - Conversion vers/export vers CSV
- `node-vcf` - Parsing/génération de fichiers VCF
- `xlsx` (SheetJS) - Manipulation de fichiers Excel XLSX
- `cookie-parser` - Gestion des cookies/sessions

### 2. Configuration Environnementale (Optionnel)

Copiez le fichier `.env.example` vers `.env` et modifiez les valeurs si nécessaire :

```bash
# Mode de fonctionnement
NODE_ENV=development      # development ou production

# Port d'écoute du serveur
PORT=3000                # Défaut : 3000
```

### 3. Lancer l'Application

**Mode Développement (avec auto-rechargement) :**
```bash
npm run dev
```

**Mode Production :**
```bash
npm start
```

Le serveur s'ouvrira automatiquement sur :
- **URL principale** : http://localhost:3000
- **API REST** : http://localhost:3000/api/*

---

## 🎨 Interface Utilisateur

### Pages Principales

| Section | Description | Accès |
|---------|-------------|-------|
| **Tableau de bord** | Vue d'ensemble avec statistiques et derniers contacts | Page d'accueil |
| **Contacts** | Liste complète + ajout/modification/suppression | `/#contacts` |
| **Catégories** | Gestion des tags/catégories colorées | `/#categories` |
| **Import/Export** | Upload CSV/VCF ou téléchargement XLSX | `/#import-export` |
| **Paramètres** | Configuration du site + statistiques détaillées | `/#settings` |

### Design Responsive

- **Desktop** : Navigation latérale à gauche avec toutes les sections visibles
- **Tablette** (768px) : Sidebar en haut ou cachable via hamburger menu
- **Mobile** (< 480px) : Sidebar qui s'empile et cacheable, interface optimisée pour tactile

### Fonctionnalités Clés

#### Ajouter un Contact
1. Cliquez sur "Nouveau contact" (icône + verte)
2. Remplissez le nom, prénom (obligatoires)
3. Email, téléphone, organisation (facultatifs)
4. Tags/Catégories : s'écrivent automatiquement lors de l'ajout d'une nouvelle catégorie
5. Notes pour informations supplémentaires
6. Cliquez sur "Enregistrer"

#### Catégories
- **Création automatique** : Saisissez un tag dans le champ "Tags" lors de l'ajout d'un contact, puis cliquez sur "Enregistrer" → la catégorie sera créée automatiquement avec une couleur aléatoire
- **Gestion manuelle** : Onglet "Catégories" pour ajouter/éditer/supprimer des catégories
- **Couleurs** : Choisissez la couleur via un sélecteur de couleurs

#### Import CSV
Format attendu (séparateur par virgule) :

| Prénom | Nom | Email | Téléphone | Organisation | Tags | Notes |
|--------|-----|-------|-----------|--------------|------|-------|
| Jean | Dupont | jean.dupont@email.com | 0123456789 | Ma Entreprise | Client;VIP | - |

**Étapes d'import :**
1. Onglet "Importer" → glissez-déposez ou cliquez pour sélectionner un fichier CSV
2. Le fichier sera parse et les contacts créés automatiquement
3. Les catégories seront créées si elles n'existent pas déjà

#### Import VCF (vCard)
Format standard `.vcf` utilisé par la plupart des téléphones et Outlook.

**Étapes d'import :**
1. Onglet "Importer" → choisissez le fichier `.vcf`
2. Les contacts seront importés avec toutes leurs données (nom, email, téléphone, etc.)

#### Export CSV/VC/XLSX
1. Onglet "Exporter"
2. Cochez les formats souhaités :
   - ✅ **CSV** pour Excel/Google Sheets
   - ✅ **VCF** compatible téléphones
   - ✅ **XLSX** format Excel moderne
3. Cochez "Tous les contacts" ou sélectionnez des contacts spécifiques
4. Cliquez sur "Télécharger l'export"

#### Détection de Doublons
L'application propose une interface pour fusionner deux contacts similaires lorsque vous travaillez avec un fichier CSV qui contient des doublons potentiels :
- Affichage des contacts similaires trouvés
- Fusion automatique en conservant toutes les données

---

## 📡 API REST (pour intégrations avancées)

### Points d'Accès Principaux

#### Contacts
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/contacts` | Liste tous les contacts avec catégories |
| GET | `/api/contacts/:id` | Obtenir un contact spécifique par ID |
| POST | `/api/contacts` | Créer un nouveau contact |
| PUT | `/api/contacts/:id` | Mettre à jour un contact existant |
| DELETE | `/api/contacts/:id` | Supprimer un contact |
| GET | `/api/contacts/search?q={term}` | Recherche de contacts par terme |
| POST | `/api/contacts/:id1/merge/:id2` | Fusionner deux contacts |

#### Catégories
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/categories` | Liste toutes les catégories |
| POST | `/api/categories` | Créer une nouvelle catégorie |
| PUT | `/api/categories/:id` | Mettre à jour une catégorie |
| DELETE | `/api/categories/:id` | Supprimer une catégorie |

#### Import/Export
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/import/csv` | Importer depuis fichier CSV (multipart/form-data) |
| POST | `/api/import/vcf` | Importer depuis fichier VCF (multipart/form-data) |
| POST | `/api/export/csv?ids=1,2,3` | Exporter vers CSV |
| POST | `/api/export/vcf` | Exporter vers VCF |
| POST | `/api/export/xlsx` | Exporter vers Excel XLSX |

#### Configuration & Statistiques
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/config` | Obtenir toutes les configurations du site |
| PUT | `/api/config/:key` | Mettre à jour une configuration |
| GET | `/api/stats` | Obtenir les statistiques (nombre de contacts, catégories) |

---

## 🔒 Sécurité

- **Validations** : Tous les champs ont des validations basiques côté serveur
- **Sécurité SQL** : Utilisation de prepared statements pour prévenir les injections SQL
- **Uploads limités** : Fichiers uploadés limités à 10Mo maximum
- **Types vérifiés** : Seulement les fichiers CSV, VCF, XLSX/Excel et images acceptés

> ⚠️ **Note importante** : Cette application n'inclut pas de système d'authentification complet (JWT, sessions avec hachage des mots de passe). Pour une utilisation en production multi-utilisateurs, il faudra implémenter une authentification complète.

---

## 🐛 Dépannage

### Problème : La base de données SQLite ne s'affiche pas

**Solution :** Le fichier `data/contacts.db` est auto-généré au premier démarrage. Vérifiez que le dossier `data/` existe et a les droits d'écriture appropriés.

### Problème : Erreur lors de l'import CSV/VCF

**Causes possibles :**
- Fichier corrompu ou format invalide
- En-têtes inattendus dans le fichier CSV
- Caractères spéciaux non gérés

**Solution :** Vérifiez que votre fichier suit les formats documentés ci-dessus.

### Problème : Les contacts disparaissent après redémarrage

**Cause :** Le dossier `data/` n'a pas les droits d'écriture, ou la base de données est corrompue.

**Solution :**
```bash
# Vérifier l'espace disque disponible (Windows)
# Ouvrez PowerShell et tapez : Test-Path .\data\contacts.db

# Si le fichier existe mais semble vide, renommez-le pour en créer un nouveau :
Move-Item -Force data\contacts.db backup.db
```

### Problème : L'interface ne s'affiche pas correctement

**Solution :**
1. Assurez-vous d'utiliser un navigateur moderne (Chrome, Firefox, Edge)
2. Vérifiez la console du navigateur (F12 → Console) pour les erreurs JavaScript
3. Actualisez la page (Ctrl+F5)

---

## 📦 Fonctionnalités Avancées

### Fusion de Contacts
Utilisez l'API `/api/contacts/:id1/merge/:id2` pour fusionner deux contacts ayant des informations similaires. Le contact ID2 sera conservé avec toutes les données des deux contacts combinées.

### Statistiques en Temps Réel
Le tableau de bord et la page paramètres affichent :
- Nombre total de contacts
- Nombre de catégories définies
- Dernier contact créé (nom, prénom, date)

### Persistance des Données
Toutes les données sont stockées dans le fichier `data/contacts.db`. Vous pouvez sauvegarder ce fichier pour transférer vos contacts sur un autre serveur.

---

## 📝 Changelog

### Version 1.0.0 (mai 2026)
- ✅ CRUD complet des contacts (Nom, Prénom, Email, Téléphone, Organisation, Tags, Notes)
- ✅ Système de catégories avec codes couleurs personnalisables
- ✅ Import depuis CSV et VCF (vCard)
- ✅ Export vers CSV, VCF et XLSX (Excel)
- ✅ Recherche globale et filtrage dynamique
- ✅ Interface responsive (desktop/tablette/mobile)
- ✅ Tableau de bord avec statistiques
- ✅ Détection de doublons et fusion de contacts

---

## 📄 Licence

Ce projet est fourni sous la licence MIT. Libre utilisation, modification et redistribution à condition que le copyright initial soit conservé.

---

## 👤 Support & Contributions

Pour signalez des bugs ou proposer de nouvelles fonctionnalités :
- Vérifiez d'abord les messages d'erreur dans la console du navigateur (F12)
- Consultez les logs du serveur (`npm start` affiche en console)
- Créez un dossier `logs/` pour capturer les erreurs serveur

---

<div align="center">
  <strong>Développé avec ❤️ par l'équipe Contacts
</strong>
</div>
