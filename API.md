# DOCUMENTATION API REST - MES CONTACTS

## 📡 Vue d'ensemble

L'application expose une **API REST complète** permettant de gérer les contacts, catégories et configurations via des requêtes HTTP standards.

### Base URL

```bash
http://localhost:3000/api
```

### Format de réponse standard

Tous les endpoints retournent un JSON au format :

#### Succès
```json
{
  "success": true,
  "message": "Opération effectuée avec succès",
  "data": { ... }
}
```

#### Erreur
```json
{
  "success": false,
  "error": "Message d'erreur descriptif"
}
```

---

## 🔍 Recherche et Filtrage

### GET /api/contacts - Liste paginée de contacts

Récupère la liste paginée de tous les contacts avec leurs catégories associées.

**Méthode** : `GET`

**Route complète** : `/api/contacts`

#### Paramètres query (tous optionnels)

| Paramètre | Type | Valeur par défaut | Description |
|-----------|------|-------------------|-------------|
| `page` | integer | 1 | Numéro de la page à afficher |
| `limit` | integer | 10 | Nombre de contacts par page |
| `search` | string | - | Terme de recherche global (alternative à `/api/contacts/search`) |

#### Exemple de requête

```bash
curl "http://localhost:3000/api/contacts?page=1&limit=10"
```

#### Exemple de réponse

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
      "surnom": "J.D.",
      "email": "jean.dupont@example.com",
      "telephone": "+33 1 23 45 67 89",
      "organisation": "Tech Solutions SAS",
      "adresse": "12 Avenue des Champs-Élysées",
      "code_postal": "75008",
      "pays": "France",
      "ville": "Paris",
      "region": "Île-de-France",
      "anniversaire": "1985-03-15",
      "conjoint": "Marie Dupont",
      "tags": "Client;VIP;Nouveau",
      "notes": "Premier client venu, très satisfait.",
      "categories": [
        {
          "id": 1,
          "nom": "CLIENT VIP",
          "couleur": "#4285f4"
        },
        {
          "id": 3,
          "nom": "PRIORITAIRE",
          "couleur": "#ff9900"
        }
      ],
      "created_at": "2026-05-10T14:30:00.000Z"
    }
  ],
  "pagination": {
    "total_contacts": 42,
    "current_page": 1,
    "per_page": 10,
    "total_pages": 5
  }
}
```

---

### GET /api/contacts/:id - Obtenir un contact par ID

Récupère les informations complètes d'un contact spécifique.

**Méthode** : `GET`

**Route complète** : `/api/contacts/:id`

#### Exemple de requête

```bash
curl "http://localhost:3000/api/contacts/1"
```

#### Exemple de réponse

```json
{
  "success": true,
  "data": {
    "id": 1,
    "nom": "Dupont",
    "prenom": "Jean",
    "titre": "M.",
    "prenom_honneur_prefix": "",
    "prenom_honneur_suffix": "",
    "surnom": "J.D.",
    "email": "jean.dupont@example.com",
    "telephone": "+33 1 23 45 67 89",
    "organisation": "Tech Solutions SAS",
    "adresse": "12 Avenue des Champs-Élysées",
    "code_postal": "75008",
    "pays": "France",
    "ville": "Paris",
    "region": "Île-de-France",
    "anniversaire": "1985-03-15",
    "conjoint": "Marie Dupont",
    "tags": "Client;VIP;Nouveau",
    "notes": "Premier client venu, très satisfait.",
    "categories": [
      {
        "id": 1,
        "nom": "CLIENT VIP",
        "couleur": "#4285f4"
      },
      {
        "id": 3,
        "nom": "PRIORITAIRE",
        "couleur": "#ff9900"
      }
    ],
    "created_at": "2026-05-10T14:30:00.000Z"
  }
}
```

#### Champs disponibles

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | integer | Oui | Identifiant unique du contact |
| `nom` | string | Non (création) | Nom de famille |
| `prenom` | string | Non (création) | Prénom complet |
| `titre` | string | Non | Titre (M., Mme, Dr., etc.) |
| `prenom_honneur_prefix` | string | Non | Préfixe honneur (ex: "Dr") |
| `prenom_honneur_suffix` | string | Non | Suffixe honneur (ex: "PhD") |
| `surnom` | string | Non | Abréviation du nom+prénom |
| `email` | string | Non | Adresse email |
| `telephone` | string | Non | Numéro de téléphone |
| `organisation` | string | Non | Entreprise/organisation |
| `adresse` | text | Non | Adresse complète |
| `code_postal` | string | Non | Code postal (5-6 chiffres) |
| `pays` | string | Non | Pays |
| `ville` | string | Non | Ville |
| `region` | string | Non | Région/État |
| `anniversaire` | date | Non | Date d'anniversaire (YYYY-MM-DD) |
| `conjoint` | string | Non | Nom de l'époux(se)/partenaire |
| `tags` | string | Non | Tags séparés par point-virgule (;) |
| `notes` | text | Non | Notes libres texte |
| `categories` | array | Non (auto-généré) | Liste des catégories associées |
| `created_at` | datetime | Oui | Timestamp de création |

---

### GET /api/contacts/search?q={term} - Recherche globale par terme

Effectue une recherche fuzzy sur tous les champs du contact.

**Méthode** : `GET`

**Route complète** : `/api/contacts/search?q={query_term}`

#### Paramètres query

| Paramètre | Type | Description |
|-----------|------|-------------|
| `q` | string | Terme de recherche (requis) |

#### Exemples de requêtes

```bash
# Recherche par prénom
curl "http://localhost:3000/api/contacts/search?q=jean"

# Recherche multi-motifs
curl "http://localhost:3000/api/contacts/search?q=dupont tech"

# Recherche dans les tags uniquement (avec % pour partial)
curl "http://localhost:3000/api/contacts/search?q=%VIP%"
```

#### Exemple de réponse

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nom": "Dupont",
      "prenom": "Jean",
      ...
    },
    {
      "id": 5,
      "nom": "Martin",
      "prenom": "Jean-Pierre",
      ...
    }
  ],
  "pagination": {
    "total_results": 12,
    "current_page": 1,
    "per_page": 10,
    "total_pages": 2
  }
}
```

---

### GET /api/contacts/filter/email?email={e} - Filtrer par email

Retourne tous les contacts dont l'adresse email contient la chaîne fournie.

**Méthode** : `GET`

**Route complète** : `/api/contacts/filter/email?email={substring}`

#### Exemples de requêtes

```bash
# Filtrer par adresse email complète
curl "http://localhost:3000/api/contacts/filter/email?email=jean.dupont"

# Filtrer par extension (.com)
curl "http://localhost:3000/api/contacts/filter/email?email=com"

# Filtrer par domaine (entreprise)
curl "http://localhost:3000/api/contacts/filter/email?email=example"
```

---

### GET /api/contacts/filter/phone?phone={p} - Filtrer par téléphone

Retourne tous les contacts dont le numéro de téléphone contient la chaîne fournie.

**Méthode** : `GET`

**Route complète** : `/api/contacts/filter/phone?phone={substring}`

#### Exemples de requêtes

```bash
# Filtrer par indicatif (+33)
curl "http://localhost:3000/api/contacts/filter/phone?phone=33"

# Filtrer par début de numéro (01)
curl "http://localhost:3000/api/contacts/filter/phone?phone=01"
```

---

### GET /api/contacts/filter/organisation?org={o} - Filtrer par organisation

Retourne tous les contacts dont l'organisation contient la chaîne fournie.

**Méthode** : `GET`

**Route complète** : `/api/contacts/filter/organisation?org={substring}`

#### Exemples de requêtes

```bash
# Filtrer par nom d'entreprise (Tech)
curl "http://localhost:3000/api/contacts/filter/organisation?org=Tech"

# Filtrer par domaine (SAS, SARL)
curl "http://localhost:3000/api/contacts/filter/organisation?org=SAS"
```

---

## ✏️ Gestion des Contacts (CRUD)

### POST /api/contacts - Créer un nouveau contact

Crée un nouveau contact avec les informations fournies. Les catégories sont créées automatiquement si elles n'existent pas encore dans la base.

**Méthode** : `POST`

**Route complète** : `/api/contacts`

#### Body JSON (champ par champ)

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `nom` | string | Oui | Nom de famille |
| `prenom` | string | Oui | Prénom complet |
| `titre` | string | Non | Titre (M., Mme, Dr.) |
| `surnom` | string | Non | Abréviation du nom+prénom |
| `email` | string | Non | Adresse email |
| `telephone` | string | Non | Numéro de téléphone |
| `organisation` | string | Non | Entreprise/organisation |
| `adresse` | text | Non | Adresse complète |
| `code_postal` | string | Non | Code postal |
| `pays` | string | Non | Pays |
| `ville` | string | Non | Ville |
| `region` | string | Non | Région/État |
| `anniversaire` | date | Non | Date d'anniversaire (YYYY-MM-DD) |
| `conjoint` | string | Non | Nom de l'époux(se)/partenaire |
| `tags` | string | Non | Tags séparés par point-virgule (;) |
| `notes` | text | Non | Notes libres texte |
| `categories[]` | array | Non (auto-généré) | Liste des catégories à associer `{ nom, couleur }` |

#### Exemple de requête

```bash
curl -X POST "http://localhost:3000/api/contacts" ^
  -H "Content-Type: application/json" ^
  -d '{
    "nom": "Durand",
    "prenom": "Sophie",
    "titre": "Mme",
    "email": "sophie.durand@exemple.com",
    "telephone": "+33 6 12 34 56 78",
    "organisation": "Marketing Solutions SAS",
    "adresse": "45 Rue de la République",
    "code_postal": "69002",
    "pays": "France",
    "ville": "Lyon",
    "anniversaire": "1990-07-22",
    "conjoint": "Thomas Durand",
    "tags": "Client;Nouveau",
    "notes": "Introduite par Jean Dupont"
  }'
```

#### Exemple de réponse

```json
{
  "success": true,
  "message": "Contact créé avec succès",
  "data": {
    "id": 3,
    "nom": "Durand",
    "prenom": "Sophie",
    "titre": "Mme",
    "surnom": null,
    "email": "sophie.durand@exemple.com",
    "telephone": "+33 6 12 34 56 78",
    "organisation": "Marketing Solutions SAS",
    "adresse": "45 Rue de la République",
    "code_postal": "69002",
    "pays": "France",
    "ville": "Lyon",
    "region": null,
    "anniversaire": "1990-07-22",
    "conjoint": "Thomas Durand",
    "tags": "Client;Nouveau",
    "notes": "Introduite par Jean Dupont",
    "categories": [
      {
        "id": 8,
        "nom": "CLIENT",
        "couleur": "#70ad47"
      },
      {
        "id": 9,
        "nom": "NOUVEAU",
        "couleur": "#ea4335"
      }
    ],
    "created_at": "2026-05-13T10:30:00.000Z"
  }
}
```

#### Note sur les catégories automatiques

Si le paramètre `categories` est omis, une catégorie générique sera créée automatiquement :

| Scénario | Catégorie auto-créée | Couleur |
|----------|---------------------|---------|
| Création contact standard | `CLIENT` | `#70ad47` (vert) |

---

### PUT /api/contacts/:id - Mettre à jour un contact

Met à jour toutes ou certaines informations d'un contact existant. Seuls les champs fournis sont mis à jour (les autres conservent leurs valeurs actuelles).

**Méthode** : `PUT`

**Route complète** : `/api/contacts/:id`

#### Exemple de requête

```bash
curl -X PUT "http://localhost:3000/api/contacts/3" ^
  -H "Content-Type: application/json" ^
  -d '{
    "email": "sophie.durand@nouveau-domaine.com",
    "telephone": "+33 6 98 76 54 32",
    "organisation": "Marketing Solutions SAS",
    "tags": "Client;Nouveau;VIP"
  }'
```

#### Exemple de réponse

```json
{
  "success": true,
  "message": "Contact mis à jour avec succès",
  "data": {
    "id": 3,
    "nom": "Durand",
    "prenom": "Sophie",
    "email": "sophie.durand@nouveau-domaine.com",
    "telephone": "+33 6 98 76 54 32",
    "organisation": "Marketing Solutions SAS",
    "tags": "Client;Nouveau;VIP",
    ...
    "categories": [
      { "id": 8, "nom": "CLIENT", "couleur": "#70ad47" },
      { "id": 9, "nom": "NOUVEAU", "couleur": "#ea4335" },
      { "id": 10, "nom": "VIP", "couleur": "#ff9900" }
    ],
    "updated_at": "2026-05-13T11:45:00.000Z"
  }
}
```

#### Synchronisation automatique des catégories

Lors de la mise à jour, si le contact possède des tags dans le champ `tags` qui ne correspondent plus aux catégories existantes, elles seront supprimées automatiquement. Inversement, les nouvelles catégories associées seront ajoutées.

---

### DELETE /api/contacts/:id - Supprimer un contact

Supprime définitivement un contact de la base de données. La suppression est cascade : les associations `contact_categories` sont également supprimées automatiquement.

**Méthode** : `DELETE`

**Route complète** : `/api/contacts/:id`

#### Exemple de requête

```bash
curl -X DELETE "http://localhost:3000/api/contacts/3"
```

#### Exemple de réponse

```json
{
  "success": true,
  "message": "Contact ID 3 supprimé avec succès",
  "total_contacts_remaining": 41
}
```

---

## 🔗 Fusion de Contacts

### POST /api/contacts/:id1/merge/:id2 - Fusionner deux contacts

Fusionne les informations de deux contacts en conservant toutes les données possibles. Le contact ID2 est conservé, avec ses champs mis à jour par ceux du contact ID1 (priorité sur les champs non-null).

**Méthode** : `POST`

**Route complète** : `/api/contacts/:id1/merge/:id2`

#### Exemple de requête

```bash
curl -X POST "http://localhost:3000/api/contacts/1/merge/2"
```

#### Exemple de réponse

```json
{
  "success": true,
  "message": "Contacts fusionnés avec succès",
  "data": {
    "id1_merged": 1,
    "id2_kept": 2,
    "merged_data": {
      "id": 2,
      "nom": "Bernard",
      "prenom": "Pierre",
      "email": "pierre.bernard@exemple.com",
      "telephone": "+33 6 11 22 33 44",
      "organisation": "Consulting Partners LLC",
      ...
      "tags": "Client;VIP;Nouveau",
      "categories": [
        { "id": 1, "nom": "CLIENT VIP", "couleur": "#4285f4" },
        { "id": 3, "nom": "PRIORITAIRE", "couleur": "#ff9900" }
      ]
    }
  }
}
```

#### Fonctionnement de la fusion

1. **Champs prioritaires** : Les champs de l'ID1 remplacent ceux de l'ID2 seulement s'ils ne sont pas `null`
2. **Catégories** : Fusion des catégories par nom normalisé (sans accent, en MAJUSCULES)
3. **Résultat** : Le contact ID2 conserve son identifiant et devient le contact fusionné

---

## 🏷️ Gestion des Catégories

### GET /api/categories - Liste toutes les catégories

Récupère le catalogue complet des catégories disponibles dans la base de données.

**Méthode** : `GET`

**Route complète** : `/api/categories`

#### Exemple de requête

```bash
curl "http://localhost:3000/api/categories"
```

#### Exemple de réponse

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
      "id": 2,
      "nom": "FAMILLE",
      "couleur": "#ea4335"
    },
    {
      "id": 3,
      "nom": "AMIS",
      "couleur": "#4caf50"
    },
    {
      "id": 4,
      "nom": "PRIORITAIRE",
      "couleur": "#ff9900"
    }
  ]
}
```

---

### POST /api/categories - Créer une nouvelle catégorie

Crée une nouvelle catégorie avec un nom et une couleur personnalisés.

**Méthode** : `POST`

**Route complète** : `/api/categories`

#### Body JSON

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `nom` | string | Oui | Nom de la catégorie (ex: "PARTENAIRES") |
| `couleur` | string | Non | Couleur hexadécimale (ex: "#3498db") |

#### Exemple de requête

```bash
curl -X POST "http://localhost:3000/api/categories" ^
  -H "Content-Type: application/json" ^
  -d '{
    "nom": "PARTENAIRES",
    "couleur": "#3498db"
  }'
```

#### Exemple de réponse

```json
{
  "success": true,
  "message": "Catégorie créée avec succès",
  "data": {
    "id": 6,
    "nom": "PARTENAIRES",
    "couleur": "#3498db"
  }
}
```

---

### PUT /api/categories/:id - Mettre à jour une catégorie

Met à jour le nom et/ou la couleur d'une catégorie existante.

**Méthode** : `PUT`

**Route complète** : `/api/categories/:id`

#### Exemple de requête

```bash
curl -X PUT "http://localhost:3000/api/categories/1" ^
  -H "Content-Type: application/json" ^
  -d '{
    "nom": "CLIENT PREMIUM",
    "couleur": "#9b59b6"
  }'
```

#### Exemple de réponse

```json
{
  "success": true,
  "message": "Catégorie mise à jour avec succès",
  "data": {
    "id": 1,
    "nom": "CLIENT PREMIUM",
    "couleur": "#9b59b6"
  }
}
```

---

### DELETE /api/categories/:id - Supprimer une catégorie

Supprime une catégorie de la base. Attention : cela ne supprime pas automatiquement les contacts utilisant cette catégorie (les liens `contact_categories` restent). Pour déassocier un contact d'une catégorie avant suppression, modifiez son champ `tags`.

**Méthode** : `DELETE`

**Route complète** : `/api/categories/:id`

#### Exemple de requête

```bash
curl -X DELETE "http://localhost:3000/api/categories/1"
```

#### Exemple de réponse

```json
{
  "success": true,
  "message": "Catégorie ID 1 supprimée avec succès",
  "total_categories_remaining": 4
}
```

---

## 📥 Import de Fichiers

### POST /api/import/csv - Importer depuis un fichier CSV

Importe des contacts à partir d'un fichier CSV uploadé. Le format attendu est une colonne par champ, séparées par des virgules.

**Méthode** : `POST`

**Route complète** : `/api/import/csv`

#### Format du fichier CSV

Le fichier doit avoir les colonnes suivantes (ordre non obligatoire, noms en anglais) :

| Colonnes attendues | Description |
|-------------------|-------------|
| `prenom` | Prénom complet |
| `nom` | Nom de famille |
| `email` | Adresse email (optionnel) |
| `telephone` | Numéro de téléphone (optionnel) |
| `organisation` | Entreprise/organisation (optionnel) |
| `tags` | Tags séparés par point-virgule (optionnel) |
| `notes` | Notes libres texte (optionnel) |

**Exemple de contenu CSV :**

```csv
prenom,nom,email,telephone,organisation,tags,notes
Jean,Dupont,jean.dupont@email.com,+33123456789,Tech SAS,Client;VIP,-
Sophie,Martin,sophie.martin@email.com,+33698765432,Marketing,Ami;Nouveau,-
```

#### Envoi du fichier (multipart/form-data)

```bash
curl -X POST "http://localhost:3000/api/import/csv" ^
  -F "file=@contacts.csv"
```

Ou avec la syntaxe curl bash standard :

```bash
curl -X POST http://localhost:3000/api/import/csv \
  -H "Content-Type: multipart/form-data" \
  -F 'file=/path/to/contacts.csv'
```

#### Exemple de réponse

```json
{
  "success": true,
  "message": "3 contacts importés avec succès",
  "created_contacts_count": 3,
  "created_categories_count": 0
}
```

#### Limitations de l'import CSV

| Limite | Valeur |
|--------|--------|
| Taille max fichier | 10 Mo |
| Gestion des guillemets CSV | Non (format simple) |
| Encoding attendu | UTF-8 |

Pour les fichiers CSV complexes avec guillemets et échappements, utilisez plutôt l'import Excel XLSX qui est plus robuste.

---

### POST /api/import/vcf - Importer depuis un fichier VCF (.vcf)

Importe des contacts à partir d'un fichier vCard (format standard utilisé par les téléphones mobiles et Outlook).

**Méthode** : `POST`

**Route complète** : `/api/import/vcf`

#### Format du fichier VCF

Le format VCF est géré via la bibliothèque `node-vcf`. Chaque bloc délimité par `BEGIN:VCARD`...`END:VCARD` représente un contact.

**Exemple de contenu VCF :**

```vcard
BEGIN:VCARD
VERSION:3.0
N;TZ;u;;Dupont;Jean;;;
FN;TZ;j=;u;;Jean Dupont;;
TEL;TYPE=CELL:+33123456789
EMAIL;INTERNET:jean.dupont@email.com
ORG;WORK;department:MyCompany Inc.
NOTE:Né en 1985, client depuis 2020
END:VCARD

BEGIN:VCARD
VERSION:3.0
N;TZ;u;;Martin;Sophie;;;
FN;TZ;s=;u;;Sophie Martin;;
TEL;TYPE=CELL:+33698765432
EMAIL;INTERNET:sophie.martin@email.com
ORG;WORK;department:Marketing Solutions
NOTE:Amie depuis l'université
END:VCARD
```

#### Envoi du fichier

```bash
curl -X POST "http://localhost:3000/api/import/vcf" ^
  -F "file=@contacts.vcf"
```

#### Exemple de réponse

```json
{
  "success": true,
  "message": "2 contacts importés avec succès",
  "created_contacts_count": 2,
  "created_categories_count": 0
}
```

#### Mapping des champs vCard vers l'application

| Champ vCard | Destination dans application |
|-------------|------------------------------|
| `N;first=last` (nom complet) | Décomposé en `prenom` et `nom` |
| `FN` (full name) | Alternative pour le nom complet |
| `TEL;TYPE=CELL` ou `TEL;TYPE=WORK` | `telephone` |
| `EMAIL;INTERNET` | `email` |
| `ORG` / `ORG;WORK` | `organisation` |
| `TITLE` | `titre` (M., Mme, Dr.) |
| `NOTE` | `notes` |

---

## 📤 Export de Fichiers

### POST /api/export/csv - Exporter vers CSV

Exporte les contacts spécifiés sous format CSV. Omettre `ids=`, exporter tous les contacts.

**Méthode** : `POST`

**Route complète** : `/api/export/csv`

#### Paramètres query

| Paramètre | Type | Description |
|-----------|------|-------------|
| `ids` | string (optionnel) | Comma-separated list of contact IDs à exporter |

#### Exemples de requêtes

```bash
# Exporter TOUS les contacts
curl -X POST "http://localhost:3000/api/export/csv?ids="

# Exporter des contacts spécifiques
curl -X POST "http://localhost:3000/api/export/csv?ids=1,2,5,7"
```

#### Exemple de réponse (téléchargement automatique du fichier CSV)

Le navigateur téléchargera automatiquement un fichier `export.csv` contenant :

| Prénom | Nom | Email | Téléphone | Organisation | Tags | Notes |
|--------|-----|-------|-----------|--------------|------|-------|
| Jean | Dupont | jean.dupont@email.com | +33123456789 | Tech SAS | Client;VIP | - |

---

### POST /api/export/vcf - Exporter vers VCF (.vcf)

Exporte les contacts sous format vCard multi-contact, utilisable directement dans un téléphone mobile ou Outlook.

**Méthode** : `POST`

**Route complète** : `/api/export/vcf`

#### Paramètres query (même structure que l'export CSV)

| Paramètre | Type | Description |
|-----------|------|-------------|
| `ids` | string (optionnel) | Comma-separated list of contact IDs à exporter |

#### Exemples de requêtes

```bash
# Exporter TOUS les contacts en VCF
curl -X POST "http://localhost:3000/api/export/vcf?ids="

# Exporter des contacts spécifiques
curl -X POST "http://localhost:3000/api/export/vcf?ids=1,3,5"
```

#### Exemple de réponse (fichier VCF à télécharger)

Le navigateur téléchargera un fichier `export.vcf` contenant tous les contacts au format vCard standard.

---

### POST /api/export/xlsx - Exporter vers Excel XLSX

Exporte les contacts sous format Excel moderne (.xlsx), parfaitement compatible avec Excel, Google Sheets, etc.

**Méthode** : `POST`

**Route complète** : `/api/export/xlsx`

#### Paramètres query (même structure que l'export CSV)

| Paramètre | Type | Description |
|-----------|------|-------------|
| `ids` | string (optionnel) | Comma-separated list of contact IDs à exporter |

#### Exemples de requêtes

```bash
# Exporter TOUS les contacts en Excel
curl -X POST "http://localhost:3000/api/export/xlsx?ids="

# Exporter des contacts spécifiques
curl -X POST "http://localhost:3000/api/export/xlsx?ids=1,2,5,7"
```

#### Exemple de réponse (fichier Excel à télécharger)

Le navigateur téléchargera un fichier `export.xlsx` avec les données structurées en colonnes claires.

---

## 🔧 Configuration du Site

### GET /api/config - Obtenir toutes les configurations

Récupère l'ensemble des paramètres de configuration sauvegardés dans la session.

**Méthode** : `GET`

**Route complète** : `/api/config`

#### Exemple de requête

```bash
curl "http://localhost:3000/api/config"
```

#### Exemple de réponse

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

#### Paramètres configurables

| Clé | Type | Valeur par défaut | Description |
|-----|------|-------------------|-------------|
| `site_name` | string | "Mes Contacts" | Nom affiché dans l'entête |
| `footer_text` | string | "" | Texte du pied de page (vide) |
| `show_email` | boolean | true | Afficher l'email dans la liste |
| `show_telephone` | boolean | true | Afficher le téléphone dans la liste |
| `show_organisation` | boolean | true | Afficher l'organisation dans la liste |
| `max_contacts_per_page` | integer | 10 | Nombre max par page dans la liste |
| `default_category_color` | string | "#4285f4" | Couleur par défaut des catégories auto-créées |

---

### PUT /api/config/:key - Mettre à jour une configuration

Mise à jour d'un paramètre de configuration spécifique. La clé est l'URL slug de la configuration.

**Méthode** : `PUT`

**Route complète** : `/api/config/:key`

#### Exemples de requêtes

```bash
# Désactiver l'affichage des emails
curl -X PUT "http://localhost:3000/api/config/show_email" ^
  -H "Content-Type: application/json" ^
  -d '"false"'
```

```bash
# Modifier le nom du site
curl -X PUT "http://localhost:3000/api/config/site_name" ^
  -H "Content-Type: application/json" ^
  -d '"Mon Application de Contacts"'
```

#### Exemple de réponse

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

---

## 📊 Statistiques

### GET /api/stats - Obtenir les statistiques globales

Récupère le nombre total de contacts, catégories, et le dernier contact créé.

**Méthode** : `GET`

**Route complète** : `/api/stats`

#### Exemple de requête

```bash
curl "http://localhost:3000/api/stats"
```

#### Exemple de réponse

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

## 📡 Headers HTTP requis et options

### En-têtes standards pour toutes les requêtes

| En-tête | Valeur recommandée | Description |
|---------|-------------------|-------------|
| `Accept` | `application/json` | Indiquer que vous attendez une réponse JSON |
| `Content-Type` | `application/json` (POST/PUT) ou `multipart/form-data` (uploads) | Format de la requête |

### Exemples complets

#### Requête GET standard

```bash
curl -v "http://localhost:3000/api/contacts" \
  -H "Accept: application/json"
```

#### Requête POST avec body JSON

```bash
curl -X POST "http://localhost:3000/api/contacts" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@email.com"
  }'
```

#### Requête POST avec upload de fichier

```bash
curl -X POST "http://localhost:3000/api/import/csv" \
  -H "Content-Type: multipart/form-data" \
  -F 'file=@/chemin/vers/contacts.csv'
```

---

## ⚠️ Gestion des erreurs

### Codes de statut HTTP retournés

| Code | Quand est retourné | Description |
|------|-------------------|-------------|
| `200 OK` | Succès opérationnel | Opération terminée avec succès |
| `201 Created` | Ressource créée | Contact/catégorie créé avec succès |
| `400 Bad Request` | Données invalides | Champs manquants ou mal formés |
| `404 Not Found` | Ressource introuvable | ID inexistant (contacts/categories) |
| `500 Internal Server Error` | Erreur serveur | Exception non gérée dans le backend |

### Format d'erreur retourné

```json
{
  "success": false,
  "error": "Message descriptif de l'erreur"
}
```

#### Exemples d'erreurs courantes

**Champs manquants obligatoires :**

```json
{
  "success": false,
  "error": "Champs 'nom' et 'prenom' sont obligatoires"
}
```

**ID inexistant :**

```json
{
  "success": false,
  "error": "Contact non trouvé avec l'ID fourni"
}
```

---

## 🧪 Tests rapides via curl

### Créer un contact

```bash
curl -X POST http://localhost:3000/api/contacts ^
  -H "Content-Type: application/json" ^
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@example.com"
  }'
```

### Lister tous les contacts

```bash
curl http://localhost:3000/api/contacts?page=1&limit=10
```

### Rechercher un contact

```bash
curl "http://localhost:3000/api/contacts/search?q=dupont"
```

### Créer une catégorie

```bash
curl -X POST http://localhost:3000/api/categories ^
  -H "Content-Type: application/json" ^
  -d '{"nom": "CLIENT FIDÈLE", "couleur": "#28a745"}'
```

### Supprimer un contact

```bash
curl -X DELETE http://localhost:3000/api/contacts/1
```

### Import CSV (via POST + fichier)

```bash
curl -X POST http://localhost:3000/api/import/csv ^
  -F "file=@contacts.csv"
```

### Export Excel

```bash
curl -X POST "http://localhost:3000/api/export/xlsx?ids="
```

---

<div align="center">

## 📚 Voir aussi

- [`DOCUMENTATION.md`](./DOCUMENTATION.md) - Documentation générale complète
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - Vue technique de l'architecture
- [`DATABASE.md`](./DATABASE.md) - Schéma détaillé des tables SQL
- [`GUIDE_DEPLOYMENT.md`](./GUIDE_DEPLOYMENT.md) - Guide de déploiement en production
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) - Résolution de problèmes

<div align="center">

**Développé avec ❤️ par l'équipe Contacts</div>

</center>
