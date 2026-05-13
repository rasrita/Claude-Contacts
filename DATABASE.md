# DOCUMENTATION BASE DE DONNEES - MES CONTACTS

## 🗄️ Vue d'ensemble de la Base de Données

L'application utilise **SQLite3**, une base de données relationnelle légère et embarquée, stockée dans un fichier unique sur le disque système.

### Localisation du fichier de base de données

```
G:\Claude-Contacts\data\contacts.db
```

Le fichier est **auto-généré** automatiquement lors du premier lancement de l'application. Le dossier `data/` doit exister avec les permissions d'écriture appropriées.

---

## 📐 Schéma SQL Complet Détaillé

### Création des tables (dans l'ordre pour respecter les dépendances)

Le fichier `src/db/database.js` contient la définition complète du schéma. Voici chaque table détaillée :

---

### 1. Table `contacts` - Stockage des informations personnes

| Colonne | Type | Obligatoire | Auto-incrém | Primaire | Clé étrangère | Description |
|---------|------|-------------|-------------|----------|---------------|--------------|
| `id` | INTEGER | Non | Oui | Oui | - | Identifiant unique auto-généré |
| `nom` | VARCHAR(100) | Non | Non | Non | - | Nom de famille du contact |
| `prenom` | VARCHAR(100) | Non | Non | Non | - | Prénom complet du contact |
| `titre` | VARCHAR(10) | Non | Non | Non | - | Titre : M., Mme, Dr., etc. |
| `prenom_honneur_prefix` | VARCHAR(20) | Non | Non | Non | - | Préfixe honneur (ex: "Dr") |
| `prenom_honneur_suffix` | VARCHAR(20) | Non | Non | Non | - | Suffixe honneur (ex: "PhD") |
| `surnom` | VARCHAR(50) | Non | Non | Non | - | Abréviation du nom/prénom |
| `email` | VARCHAR(100) | Non | Non | Non | - | Adresse email unique du contact |
| `telephone` | VARCHAR(30) | Non | Non | Non | - | Numéro de téléphone avec indicatif |
| `organisation` | VARCHAR(100) | Non | Non | Non | - | Entreprise ou organisation |
| `adresse` | TEXT | Non | Non | Non | - | Adresse complète (rue, appartement) |
| `code_postal` | VARCHAR(20) | Non | Non | Non | - | Code postal 5-6 chiffres |
| `pays` | VARCHAR(50) | Non | Non | Non | - | Pays (nom ou code ISO) |
| `ville` | VARCHAR(100) | Non | Non | Non | - | Ville de résidence |
| `region` | VARCHAR(100) | Non | Non | Non | - | Région/état/province |
| `anniversaire` | DATE | Non | Non | Non | - | Date d'anniversaire (YYYY-MM-DD) |
| `conjoint` | VARCHAR(100) | Non | Non | Non | - | Nom de l'époux(se)/partenaire |
| `tags` | TEXT | Non | Non | Non | - | Tags séparés par point-virgule (;) |
| `notes` | TEXT | Non | Non | Non | - | Notes libres, observations diverses |
| `created_at` | TIMESTAMP | Oui | Non | Non | - | Timestamp de création automatique |

#### Exemple d'insertion manuelle dans la table contacts

```sql
INSERT INTO contacts (nom, prenom, email, telephone, organisation)
VALUES ('Dupont', 'Jean', 'jean.dupont@email.com', '+33 1 23 45 67 89', 'Tech Solutions SAS');
```

---

### 2. Table `categories` - Catalogue des catégories personnalisables

| Colonne | Type | Obligatoire | Auto-incrém | Primaire | Clé étrangère | Description |
|---------|------|-------------|-------------|----------|---------------|--------------|
| `id` | INTEGER | Non | Oui | Oui | - | Identifiant unique auto-généré |
| `nom` | VARCHAR(50) | Oui | Non | Non | - | Nom de la catégorie (ex: "CLIENT VIP", "FAMILLE") |
| `couleur` | VARCHAR(8) | Oui | Non | Non | - | Code couleur hexadécimale (ex: "#4285f4") |

#### Catégories par défaut créées automatiquement au premier démarrage

| Nom | Couleur | Utilité typique |
|-----|---------|-----------------|
| `CLIENT` | `#70ad47` (vert) | Contacts professionnels, clients commerciaux |
| `FAMILLE` | `#ea4335` (rouge) | Famille élargie, parents/siblings/cousins |
| `AMIS` | `#4caf50` (vert) | Amitiés, relations personnelles |
| `PRIORITAIRE` | `#ff9900` (orange) | Contacts à traiter avec urgence/priorité |

**Remarque** : Les noms de catégories sont **normalisés automatiquement** sans accents et en MAJUSCULES pour éviter les duplicatas (ex: "client VIP" devient "CLIENT VIP", "Client VIp" devient aussi "CLIENT VIP").

---

### 3. Table `contact_categories` - Liens associatifs entre contacts et catégories

Table de jointure permettant à chaque contact d'avoir **plusieurs catégories** simultanément. Utilise un modèle *man-to-many* (N:1) avec les tables parentes.

| Colonne | Type | Obligatoire | Auto-incrém | Primaire | Clé étrangère | Description |
|---------|------|-------------|-------------|----------|---------------|--------------|
| `id` | INTEGER | Non | Oui | Oui | - | Identifiant unique auto-généré |
| `contact_id` | INTEGER | Oui | Non | Non | → `contacts(id)` | Référencement du contact parent |
| `category_id` | INTEGER | Oui | Non | Non | → `categories(id)` | Référencement de la catégorie parente |

#### Exemple de données dans cette table

Un même contact peut apparaître plusieurs fois ici avec des catégories différentes :

```sql
-- Un client qui est aussi VIP et Prioritaire
SELECT * FROM contact_categories WHERE contact_id = 1;
-- Résultats possibles :
-- id=5, contact_id=1, category_id=1 (CLIENT)
-- id=6, contact_id=1, category_id=2 (VIP)
-- id=7, contact_id=1, category_id=4 (PRIORITAIRE)
```

#### Règles de gestion des clés étrangères (CASCADE)

Les deux colonnes `contact_id` et `category_id` ont les contraintes :

- **On delete cascade** : Si le contact est supprimé, ses associations `contact_categories` sont automatiquement effacées. Si la catégorie est supprimée, les associations l'étaient également.
- **On update cascade** : Si une catégorie change d'ID (rare mais possible), les associations sont mises à jour automatiquement.

Cela garantit la cohérence de l'intégrité référentielle sans intervention manuelle nécessaire.

---

## 🔄 Diagramme ER Simplifié

```
┌──────────────┐        ┌─────────────────┐        ┌─────────────────┐
│              │ 1 ─────│                   │  N       1          N │
│              │        │                   │            │                  │
│    contacts  │<──────►│ contact_categories│<───────   │     categories  │
│              │        │                   │           │                  │
└──────────────┘        └─────────────────┘        ┌─────────────────┐
                                                   │                │
                                                     │                │
                                                         │            │
                                                           1 N      │
                                                             │      │
                                                    ┌─────────┴──────┼─────────┐
                                                    │               │         │
                                                    │               │         │
                                                    ▼               ▼         ▼
                                              ┌──────────┐     ┌────────────┐  ┌─────────┐
                                              │    nom   │     │    couleur │  │  Autres │
                                              │  (varchar)│     │ (hex #RRGG) │ │ données  │
                                              └──────────┘     └────────────┘  └─────────┘

```

---

## 🛠️ Script de migration de la base de données

### Nettoyer et réinitialiser complètement la base (attention : **destructif**)

Si vous voulez vider complètement la base pour commencer avec un état propre :

#### Méthode 1 : Via endpoint API (sûr)

```bash
# Supprimer tous les contacts et leurs associations, puis categories
curl -X POST "http://localhost:3000/api/clear-db" ^
  -H "Content-Type: application/json" ^
  -d '{"confirm": true}'
```

Cela supprime :
1. Toutes les lignes `contact_categories` (associations)
2. Toutes les lignes `categories` (catégories restantes)
3. Toutes les lignes `contacts` (contacts eux-mêmes)

#### Méthode 2 : Via SQL direct (plus rapide mais plus risqué)

```bash
sqlite3 data/contacts.db <<EOF
-- Vider toutes les tables dans l'ordre inverse (respecter la dépendance des clés étrangères)
DELETE FROM contact_categories;
DELETE FROM contacts;
DELETE FROM categories;
EOF
```

Après ces commandes, les tables restent créées mais sont vides. Le fichier de base SQLite réexistantera avec son schéma initial.

---

## 📊 Requêtes SQL personnalisées disponibles

### Compter le nombre total de contacts

```sql
SELECT COUNT(*) as total_contacts FROM contacts;
-- Retourne : 42 (par exemple)
```

### Lister les catégories les plus populaires (plusieurs occurrences par contact)

```sql
SELECT 
    c.nom AS category_name,
    ca.couleur AS color,
    COUNT(cc.id) AS contact_count,
    GROUP_CONCAT(
        (SELECT nom FROM contacts WHERE id = cc.contact_id) || ', ' ||
        (SELECT prenom FROM contacts WHERE id = cc.contact_id), 
        ' '
    ) AS sample_contacts
FROM categories c
JOIN contact_categories cc ON c.id = cc.category_id
GROUP BY c.nom, ca.couleur
ORDER BY contact_count DESC;
```

#### Exemple de résultat attendu :

| category_name | color | contact_count | sample_contacts |
|---------------|-------|---------------|-----------------|
| CLIENT VIP    | #4285f4 | 15            | Jean Dupont, Sophie Martin, Pierre Bernard, ... |
| FAMILLE       | #ea4335 | 10            | Marie Dubois, Lucas Durand, ... |

---

### Trouver les contacts qui n'ont aucune catégorie

```sql
SELECT c.* 
FROM contacts c
WHERE NOT EXISTS (
    SELECT 1 FROM contact_categories cc WHERE cc.contact_id = c.id
);
```

Ces contacts existent mais ne sont rattachés à **aucune** catégorie. Utile pour les identifier et leur assigner des catégories.

---

### Requête complète pour afficher un contact avec toutes ses catégories

Equivalent au SELECT utilisé dans la réponse API GET /api/contacts/:id :

```sql
SELECT 
    c.*,
    GROUP_CONCAT(cc.nom || ' (' || ca.couleur || ')', ';') AS categories_json
FROM contacts c
LEFT JOIN contact_categories cc ON c.id = cc.contact_id
LEFT JOIN categories ca ON cc.category_id = ca.id
WHERE c.id = ? -- remplacer par l'ID du contact
ORDER BY LENGTH(ca.nom) DESC, cc.id ASC;
```

La fonction `GROUP_CONCAT` regroupe les catégories dans un string séparé par des points-virgules.

---

### Trouver les contacts dont le nom contient une chaîne donnée (recherche fuzzy)

```sql
SELECT 
    c.*,
    GROUP_CONCAT(cc.nom || ' (' || ca.couleur || ')', ';') AS categories_json
FROM contacts c
LEFT JOIN contact_categories cc ON c.id = cc.contact_id
LEFT JOIN categories ca ON cc.category_id = ca.id
WHERE LOWER(c.nom) LIKE '%dupont%' 
   OR LOWER(c.prenom) LIKE '%jean%'
   OR LOWER(c.email) LIKE '%example.com%'
ORDER BY c.id DESC;
```

---

### Supprimer tous les contacts ayant une email vide (nettoyage de la base)

```sql
DELETE FROM contacts WHERE email = '';
```

---

## 🔍 Indexes et performances

Pour améliorer les performances des requêtes, SQLite crée automatiquement un index sur l'ID principal. Pour les tables plus grandes (>10 000 entrées), il peut être utile d'ajouter des indexes manuels :

### Ajouter un index manuel sur la table contacts pour accélérer les recherches par email

```sql
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
-- Accélère les filtres /api/contacts/filter/email?email=xxx
```

### Index sur le nom de contact (recherche globale)

```sql
CREATE INDEX IF NOT EXISTS idx_contacts_nom_prenom 
    ON contacts(nom, prenom);
-- Utile pour recherches par nom/prénom combinés
```

### Analyse des performances avec EXPLAIN QUERY PLAN

```sql
EXPLAIN QUERY PLAN
SELECT * FROM contacts WHERE email = 'jean.dupont@example.com';
```

Si l'index est utilisé, vous verrez `(using index)` dans le résultat. Sinon, la table sera entièrement scannée (`SCAN TABLE contacts`).

---

## 🧹 Maintenance de la base SQLite

### Vider la cache interne de SQLite (libérer de la mémoire)

```sql
PRAGMA cache_size = -64; -- 64 mégaoctets de fichier page à utiliser comme cache
-- Augmenter pour plus de performances : PRAGMA cache_size = -1024;
```

### Vérifier l'intégrité de la base (utile après interruptions brutales)

```sql
PRAGMA integrity_check;
-- Retourne "ok" si la base est saine
-- "error: corrupt main categories_table" si détecte un problème
```

### Analyser et optimiser la base (défragmenter les index)

```bash
# Via terminal PowerShell / bash
sqlite3 data/contacts.db <<EOF
ANALYZE;
PRAGMA automatic_vacuum = 1;
EOF
```

**Important** : `VACUUM` réécrit l'intégralité du fichier de base (coûteux mais libère l'espace disque). À faire uniquement après une grosse import (>5 000 contacts ajoutés d'un coup).

---

### Taille recommandée du fichier de page

Pour une utilisation normale (<1 million de contacts), le défaut (`PRAGMA page_size = 4096`) est suffisant.

```sql
-- Vérifier la taille actuelle de la page (en octets)
SELECT 'Page size: ' || page_size FROM pragma_page_size;

-- Changer vers un format optimisé pour plus d'entrées (recommandé >10 000 contacts)
PRAGMA page_size = 8192;
VACUUM;
```

---

## 📦 Import massif direct via SQL (batch import)

### Charger une base vide depuis un fichier JSON

Pour préparer la base avec des données initiales massives, créez un fichier `init_data.json` :

```json
[
  {
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@exemple.com",
    "telephone": "+33 1 23 45 67 89",
    "organisation": "Tech Solutions SAS",
    "tags": "Client;VIP"
  },
  {
    "nom": "Martin",
    "prenom": "Sophie",
    "email": "sophie.martin@exemple.com",
    "telephone": "+33 6 98 76 54 32",
    "organisation": "Marketing Inc.",
    "tags": "Client;Ami"
  }
]
```

Script SQL pour l'import via `.import` :

```sql
-- Créer un fichier CSV temporaire (.csv extension requise par sqlite3 .import)
-- Exemple: G:\Claude-Contacts\data\init_data.csv (copier depuis .json en .csv)

.mode csv
.separator ;
.import data/init_data.csv contacts_temp

INSERT INTO contacts (nom, prenom, email, telephone, organisation, tags)
SELECT 
    -- Le parser CSV de sqlite3 peut avoir du mal avec les séparateurs complexes
    -- Préférable d'utiliser INSERT ... SELECT FROM json_each() si disponible
    'JSON' as nom,
    'Import batch' as prenom
;

-- Plus simple pour débutants : utiliser l'endpoint API POST /api/contacts
-- qui gère nativement les imports CSV via Multer
```

**Note importante** : L'import massif est mieux géré via les endpoints API (`/api/import/csv`) car le parser CSV de SQLite a des limites avec les guillemets complexes. Pour >10 000 contacts, préférez l'export Excel XLSX → batch insert SQL optimisé.

---

## 🎨 Personnalisation du schéma (ajout de nouvelles colonnes)

### Ajouter une nouvelle colonne à la table `contacts`

**Attention** : Dans SQLite, ajouter une colonne vide n'affecte pas les données existantes, mais vous devez définir un type et/ou `NULL` par défaut.

```sql
-- Ajouter une colonne "date_contact_dernier" de type DATE avec valeur NULL par défaut
ALTER TABLE contacts ADD COLUMN date_contact_dernier DATE DEFAULT NULL;

-- Vérifier la nouvelle structure de la table
PRAGMA table_info(contacts);
-- Retourne :
-- [0] {'name': 'id', 'type': 'INTEGER', ...}
-- [1] {'name': 'nom', 'type': 'VARCHAR(100)', ...}
-- [2] {'name': 'prenom_honneur_prefix', 'type': 'VARCHAR(20)', ...}
-- [3] {'name': 'date_contact_dernier', 'type': 'DATE', ...}  ← NOUVELLE COLONNE
```

### Ajouter un index sur la nouvelle colonne pour performances

```sql
CREATE INDEX IF NOT EXISTS idx_contacts_date_contact_dernier 
    ON contacts(date_contact_dernier);
```

---

## 📊 Migration vers une version ultérieure du schéma

Si vous upgradez l'application d'une ancienne version qui avait un champ `tags` nommé différemment (ex: `tag` au lieu de `tags`), voici la migration :

### Migration automatique via SQL script

```sql
-- 1. Renommer le vieux champ "tag" vers "tags" si besoin
ALTER TABLE contacts RENAME COLUMN tag TO tags;

-- 2. Mettre à jour la colonne pour accepter plusieurs valeurs séparées par ;
UPDATE contacts SET tags = NULL WHERE tags IS '' OR tags = '';
```

---

## 🔐 Permissions et sécurité du fichier de base

### Fichiers système Windows :

Pour autoriser l'écriture de SQLite dans `data/contacts.db` :

```powershell
# Vérifier les permissions du dossier data/
Get-Acl "G:\Claude-Contacts\data" | Format-List

# Donner en lecture-écriture à tout le monde (développement uniquement !)
$acl = Get-Acl "G:\Claude-Contacts\data"
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule("Everyone","FullControl","Allow")
$acl.AddAccessRule($rule)
$acl.SetAccess("G:\Claude-Contacts\data", $true, True)

# Sauvegarder et appliquer
$acl.Persist(1) # 1 = base de registre du Windows seulement
```

**Important** : Pour une utilisation en production multi-utilisateurs ou sur serveur web partagé, utilisez des permissions spécifiques :

```powershell
icacls "G:\Claude-Contacts\data" /grant Users:RXI (ou Administrateurs:R pour seul lecture si écriture externe)
```

---

## 🔍 Outils recommandés pour inspection visuelle de la base SQLite

### 1. DB Browser for SQLite (interface graphique gratuite)

**Téléchargement** : https://sqlitebrowser.org/

**Fonctionnalités** :
- Visualisation des tables et relations ER
- Editeur SQL interactif
- Export vers CSV/JSON/XML
- Historique de modification des fichiers

### 2. SQLite Expert Lite (Windows, gratuit)

https://www.sqliteexpert.net/

### 3. DBeaver Universal Database Tool (multi-format, open source)

https://dbeaver.io/

**Utilisation recommandée** :

1. Otez le point de la base dans VS Code si vous utilisez l'extension SQLite
2. Ouvrez DB Browser for SQLite
3. Fichier → Ouvrir la base de données → Sélectionnez `data/contacts.db`
4. Vous pouvez maintenant explorer les tables, exécuter des requêtes, export/import manuels

---

## 📝 Schéma complet en un seul fichier SQL

Voici le script SQL qui recrée intégralement la base telle que définie dans l'application :

```sql
-- Recréation complète de la base (à exécuter sur une nouvelle instance SQLite)

-- Table des contacts principaux
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    titre VARCHAR(10),
    prenom_honneur_prefix VARCHAR(20),
    prenom_honneur_suffix VARCHAR(20),
    surnom VARCHAR(50),
    email VARCHAR(100),
    telephone VARCHAR(30),
    organisation VARCHAR(100),
    adresse TEXT,
    code_postal VARCHAR(20),
    pays VARCHAR(50),
    ville VARCHAR(100),
    region VARCHAR(100),
    anniversaire DATE,
    conjoint VARCHAR(100),
    tags TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des catégories personnalisables
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom VARCHAR(50) NOT NULL,
    couleur VARCHAR(8) NOT NULL
);

-- Table de jointure N:1 pour catégories multiples par contact
CREATE TABLE IF NOT EXISTS contact_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(contact_id, category_id)
);

-- Insérer les catégories par défaut (si la table est vide)
INSERT OR IGNORE INTO categories (nom, couleur) VALUES ('CLIENT', '#70ad47');
INSERT OR IGNORE INTO categories (nom, couleur) VALUES ('FAMILLE', '#ea4335');
INSERT OR IGNORE INTO categories (nom, couleur) VALUES ('AMIS', '#4caf50');
INSERT OR IGNORE INTO categories (nom, couleur) VALUES ('PRIORITAIRE', '#ff9900');

-- Créer un index sur les emails pour recherche optimisée
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Afficher le contenu de toutes les tables (résumé)
SELECT 'Total contacts:' as info, COUNT(*) as count FROM contacts;
SELECT 'Total catégories:' as info, COUNT(*) as count FROM categories;
SELECT 'Associations contact-catégories:' as info, COUNT(*) as count FROM contact_categories;
```

---

<div align="center">

## 📚 Documentation complémentaire

- [`API.md`](./API.md) - Toutes les endpoints REST disponibles pour manipuler la base via HTTP
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - Architecture technique et flux de données
- [`GUIDE_DEPLOYMENT.md`](./GUIDE_DEPLOYMENT.md) - Guide de déploiement en production
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) - Résolution des problèmes communs

<div align="center">

**Développé avec ❤️ par l'équipe Contacts</div>

</center>
