# DOCUMENTATION DEPLOIEMENT - MES CONTACTS

## 🚀 Guide de Déploiement en Production

Ce guide détaille les étapes pour mettre votre application "Mes Contacts" en production.

---

## 📋 Prérequis Système

### Environnements supportés

| Environnement | Version minimale | Recommandé |
|---------------|------------------|-------------|
| **OS Windows** | Windows 10/11 (64-bit) | Windows 11 Pro |
| **OS Linux** | Ubuntu 20.04+ / Debian 11+ | Ubuntu 24.04 LTS |
| **OS macOS** | macOS 12+ | macOS 14+ |
| **RAM** | 512 Mo | 2 Go+ |
| **Stockage disque** | 50 Mo (fichier SQLite) | SSD 20 Go+ |
| **Node.js** | 18 LTS | 20 LTS LTS |

---

## 📦 Déploiement en Production - Étapes Complètes

### Étape 1 : Configuration de l'environnement production

```bash
# Installation Node.js 20 LTS (si non installé)
# Windows : via winget
winget install OpenJS.NodeJS.LTS

# ou via Chocolatey
choco install nodejs-lts

# Ubuntu/Debian
sudo apt update && sudo apt install -y nodejs npm

# macOS (Homebrew)
brew install node@20

# Vérification installation
node --version    # Attend 20.x.x LTS
npm --version     # Attend 10.x.x+

# Initialisation dossier production
mkdir -p /var/www/mes-contacts/data
chmod 755 /var/www/mes-contacts
```

### Étape 2 : Clonage du dépôt Git

```bash
cd /var/www/mes-contacts
git clone https://github.com/votre-utilisateur/mes-contacts.git .
npm install          # Installation dépendances npm
# ou avec cache npm optimisé pour production :
npm ci               # Utilise package-lock.json exact
```

### Étape 3 : Configuration variables d'environnement (ENV)

**Fichier obligatoire :** `.env` (non versionné Git)

Créez `/.env` dans le dossier projet :

```bash
# Fichier .env - Production configuration strictes
NODE_ENV=production
PORT=3000

SESSION_SECRET=CHANGE-MOCE-SECRET-AVEC-VOTRE-CLES-CRYPTAGE-SECURE
SESSION_EXPIRE=86400000

NODE_ENV=production
```

**Variables d'environnement détaillées :**

| Variable | Valeur par défaut | Recommandation production |
|----------|-------------------|---------------------------|
| `NODE_ENV` | development | `production` |
| `PORT` | 3000 | 3000-8080 (selon firewall) |
| `SESSION_SECRET` | `dev-secret-change-me` | **CHANGEZ ! Gène aléatoire 32+ caractères** |
| `SESSION_EXPIRE` | 86400000ms (24h) | 86400000-172800000 (1-2 jours) |

Génération clé SESSION_SECRET cryptographique forte :

```bash
# Windows PowerShell
$env:SESSION_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### Étape 4 : Configuration base de données SQLite production

```bash
# Création dossier data avec permissions sécurisées
mkdir -p /var/www/mes-contacts/data
chmod 755 /var/www/mes-contacts/data

# Lancement initialisation base (auto-crée schema)
node src/server.js &

# Vérification création fichier contacts.db
ls -la data/contacts.db

# Permissions sécurisées fichier database (.rw pour owner seulement)
chmod 640 /var/www/mes-contacts/data/contacts.db
chown $USER:group /var/www/mes-contacts/data/contacts.db
```

### Étape 5 : Configuration firewall Windows (Port 3000)

**Pour Windows 10/11 :**

```powershell
# Autorisation accès réseau incoming pour Node.js
New-NetFirewallRule -DisplayName "Mes Contacts API" `
    -Direction Inbound `
    -LocalPort 3000 `
    -Protocol TCP `
    -Action Allow
```

**Pour Ubuntu/Debian (UFW) :**

```bash
sudo ufw allow 3000/tcp
sudo ufw reload
# ou permettre tout le web si seul service HTTP
sudo ufw allow 'Nginx Full'
```

### Étape 6 : Déploiement système service (Windows Service)

**Option A : NPM global + Windows Task Scheduler**

Créer fichier `.win-start-script.cmd` dans dossier projet :

```batch
@echo off
REM Script d'autostart production Node.js Mes Contacts

cd /d "%~dp0"  # Changer dossier projet absolu

:: Démarrage serveur production
node src/server.js start
```

Créer tâche scheduler Windows :

```powershell
$action = New-ScheduledTaskAction -Execute "cmd.exe" `
    -Argument "/c C:\Chemin\Absolu\Claude-Contacts\.win-start-script.cmd"

$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBattery

Register-ScheduledTask -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -TaskName "MesContactsAPI" `
    -User $env:USERNAME
```

**Option B : PM2 (process manager Node.js)**

Installation PM2 global :

```bash
npm install -g pm2
```

Configuration PM2 dans `ecosystem.config.js` :

```javascript
module.exports = {
  apps: [{
    name: 'mes-contacts',
    script: './src/server.js',
    instances: 1,                      // Mode single-core pour SQLite (pas de cluster)
    exec_mode: 'cluster',              // Pour scale CPU (optionnel, sinon 'fork' plus simple)
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      SESSION_SECRET: 'CHANGE-MOCE-SECRET-AVEC-VOTRE-CLES-CRYPTAGE-SECURE',
    },
    error_file: './logs/err.log',
    output_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

Démarrage avec PM2 :

```bash
# Lancement service Node.js production
pm2 start ecosystem.config.js

# Sauvegarde config pour autostart redémarrages système
pm2 startup
pm2 save
```

### Étape 7 : Configuration HTTPS (SSL/TLS) - Let's Encrypt

**Recommandé pour accès Internet public :**

Installation certbot Apache2 (Ubuntu/Debian) :

```bash
sudo apt install certbot python3-certbot-nginx
```

Ou installation certbot Windows Chocolatey :

```bash
choco install certbot
```

Certification Let's Encrypt gratuite (valable 90 jours auto-renouvellement) :

```bash
# Obtention certificat SSL (domaine.com = domaine2.com pour wildcard optional)
certbot --apache -d yourdomain.com -d www.yourdomain.com

# Validation DNS-01 si hosting Cloud (AWS/Azure/GCP) sans sous-domaine public
certbot certonly --manual -d yourdomain.com
```

Renouvellement automatique tous les 6 mois :

```bash
# Planification auto-renouvellement cron Ubuntu/Debian
sudo crontab -e # Ajouter ligne : 0 0 * * * /usr/bin/certbot renew --quiet

# Windows Task Scheduler (certbot renew)
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-Command certbot renew"
Register-ScheduledTask -Action $action -Trigger -Daily -Reboot | Out-Null
```

Configuration Nginx reverse proxy SSL :

```nginx
# /etc/nginx/sites-available/yourdomain.com
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirection HTTPS par défaut
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # Certificats SSL Let's Encrypt (auto-renewement)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdayname.com/privkey.pem;
    
    # Optional : HTTP/2 + HSTS security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Root dossier projet (SPA frontend)
    root /var/www/mes-contacts/public;
    index index.html;
    
    # Serveur SPA Express via proxy Node.js local (si Nginx + Node)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static assets (CSS/JS) passthrough Express déjà géré
    location /public/ {
        try_files $uri @app;
    }
}
```

Activation site Nginx :

```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t           # Validation config
sudo systemctl restart nginx
```

---

### Étape 8 : Mise à jour système (redémarrage service)

**Pour redémarrer le service Node.js :**

| Système | Commande redémarrage |
|---------|---------------------|
| PM2 | `pm2 restart mes-contacts` |
| Windows Service | `net stop MesContactsAPI` puis `net start MesContactsAPI` |
| Nginx+Node | `sudo systemctl restart nodejs` + `sudo systemctl restart nginx` |

---

## 🔐 Sécurité Production Checklist

**Configuration recommandée avant mise en ligne :**

- [ ] CHANGEZ `SESSION_SECRET` (clé cryptographique unique non versionnée Git)
- [ ] Permissions fichier `data/contacts.db` : 640 rw-r----- seulement
- [ ] Firewall autorisé seul port HTTPS (443) + SSH admin (22 si besoin)
- [ ] Certificat SSL Let's Encrypt actif + auto-renouvellement configuré
- [ ] HSTS HTTP header mis en place pour HTTPS uniquement
- [ ] Headers sécurité X-Frame-Options/X-Content-Type-Options ajoutés
- [ ] Pas d'URLs internes (http://localhost) accessibles depuis Internet
- [ ] .env fichier ignoré par Git (.gitignore)

---

## 📊 Suivi et Monitoring Production

### Logs serveur Node.js production

**Définition fichiers logs PM2 :**

```javascript
// ecosystem.config.js
{
  // ...
  error_file: './logs/err.log',      // Erreurs serveur backend
  output_file: './logs/out.log',      // Logs info standard output
  log_date_format: 'YYYY-MM-DD HH:mm:ss'
}
```

**Rotation fichiers logs automatique :**

```bash
# Installation logrotate (Ubuntu/Debian)
sudo apt install logrotate

# Configuration rotation logs Node.js Mes Contacts
sudo nano /etc/logrotate.d/mes-contacts

# Contenu fichier logrotate :
/var/www/mes-contacts/logs/*.log {
    daily
    rotate 14              # Garder 2 semaines de logs
    compress               # Compression gzip ancien logs
    missingok              # Ne pas erreur si fichier inexistant
    notifempty             # Ne pas tourner s'logs vides
    create 640 www-data   # Permissions fichiers nouveaux
}
```

**Surveillance uptime/mémoire PM2 :**

```bash
# Vérification service Node.js en cours d'exécution
pm2 status           # Affiche tous les services avec statut

# Commande redémarrage automatique si crash (watch mode)
pm2 start ecosystem.config.js --watch     # Watch mode auto-restart après erreurs

# Métriques performance système PM2 (mémoire CPU usage temps réel)
pm2 monit            # Dashboard métriques temps réel Node.js services

# Sauvegarde snapshots pour analyse post-mortem crash investigation
pm2 save             # Sauvegarde snapshot processus à l'arrêt forcé
```

---

### Logs base SQLite database health monitoring

**Check queries SQL pour santé base (cron job quotidien) :**

```bash
#!/bin/bash
# /etc/cron.d/check-database-health
# Exécution quotidienne 6h du matin : vérification intégrité base SQLite

DB_FILE="/var/www/mes-contacts/data/contacts.db"
LOG_FILE="/var/log/mes-contacts/database-health.log"

if [ -f "$DB_FILE" ]; then
    # Comptage total contacts + catégories
    CONTACTS_COUNT=$(sqlite3 $DB_FILE "SELECT COUNT(*) FROM contacts;")
    CATEGORIES_COUNT=$(sqlite3 $DB_FILE "SELECT COUNT(DISTINCT nom) FROM categories;")
    
    echo "$(date): Contacts=$CONTACTS_COUNT Catégories=$CATEGORIES_COUNT" >> "$LOG_FILE"
else
    echo "$(date): ERREUR - Fichier database inexistant !" >> "$LOG_FILE"
fi

# Backup automatique journalier (complet SQLite fichier dump + compression)
sqlite3 $DB_FILE ".backup /var/backups/contacts.db.$(date +%Y%m%d)" 2>/dev/null
```

### Dashboard métriques API REST (`/api/stats`)

**Exemple visualisation métriques dans application elle-même :**

API endpoint `/api/stats` retourne :

```json
{
  "success": true,
  "data": {
    "total_contacts": 15234,              // Nombre total contacts en base
    "total_categories": 892,              // Nombre catégories distinctes
    "last_created_contact": {             // Dernier contact créé (timestamp)
      "nom": "Dupont",
      "prenom": "Jean",
      "created_at": "2026-05-13T09:15:32.451Z"
    }
  }
}
```

**Utilisation dashboard visualisation temps réel (Grafana/Prometheus) :**

Prometheus Node Exporter + node_exporter scraping endpoint `/api/stats` :

```yaml
# /etc/prometheus/prometheus.yml - Scrapeing métriques API Mes Contacts
scrape_configs:
  - job_name: 'mes-contacts-api'
    static_configs:
      - targets: ['192.168.1.100:3000']  # IP serveur production Node.js
        metrics_path: '/api/stats'         # Endpoint statistiques API Mes Contacts
```

---

## 🔄 Sauvegarde Automatique Données (Database Backup Strategy)

**Option A : Script backup quotidien automatique SQLite + compression**

Création script `backup-database.sh` Linux/Unix :

```bash
#!/bin/bash
# Fichier : /usr/local/bin/backup-database.sh
# Usage : ./backup-database.sh [dest_dir]

DB_PATH="/var/www/mes-contacts/data/contacts.db"
BACKUP_DIR="/var/backups/mes-contacts"

# Création dossier de backup s'il n'existe pas
mkdir -p "$BACKUP_DIR"
chmod 750 "$BACKUP_DIR"

# Dump complet base SQLite + compression gzip automatique (fichier ~5x plus petit)
DATE=$(date +%Y%m%d-%H%M%S)
sqlite3 $DB_PATH ".backup $BACKUP_DIR/contacts.$(basename $DB_PATH).$DATE.sqlite3" 2>/dev/null

GZIP_COMPRESSED_FILE="$BACKUP_DIR/contacts.$(basename $DB_PATH).$DATE.sqlite3.gz"
gzip -f "$BACKUP_DIR/contacts.$(basename $DB_PATH).$DATE.sqlite3"

echo "$(date) : Backup complet base contacts.db créé (compressé .gz)"
```

Planification backup quotidien cron job :

```bash
# Édition cron pour tâches de maintenance automatique
sudo crontab -e

# Ajout ligne suivante pour backup quotidien à 2h du matin :
0 2 * * * /usr/local/bin/backup-database.sh >> /var/log/mes-contacts/backup.log 2>&1
```

**Option B : Backup manuel via CLI SQLite :**

```bash
# Dump complet base SQLite (avec header pour restauration ultérieure)
sqlite3 data/contacts.db ".dump > backup_contacts_$(date +%Y%m%d).sql"

# Compression fichier archive .tar.gz multi-jours
tar -czf archive_contacts_$(date +%Y%m%d).tar.gz \
    data/contacts.db \
    logs/*.log

# Vérification intégrité base SQLite (PRAGMA integrity_check)
sqlite3 data/contacts.db "PRAGMA integrity_check;"  # Retourne OK si healthy
```

---

## 🐛 Débogage Production - Outils et Commandes utiles

### Logs système et journalisation serveur

**Windows Event Viewer logs Node.js PM2 :**

```powershell
# Vérification service Node.js Mes Contacts en cours d'exécution
Get-Service | Where-Object {$_.Name -like "*MesContacts*"}

# Affichage logs dernier démarrages service Windows
Get-WinEvent -FilterHashtable @{LogName='Application'; Id=4104} -MaxEvents 10

# Logs PM2 stderr console (via stdout capture)
pm2 log                 # Affiche logs standard + erreurs dernière période
```

**Linux/Ubuntu journal logs Node.js PM2 ou system :**

```bash
journalctl -u mes-contacts -f      # Logs systemd service Mes Contacts en temps réel
tail -f /var/log/syslog | grep node  # Filtre logs système Node.js
```

### Debug mode activé temporairement (pour diagnostic)

Ajout ligne `.env` pour debug enabled :

```bash
NODE_ENV=development           # Force debug mode (nodemon hot-reload)
DEBUG=true                     # Active logging détaillé serveur
```

Désactivation après diagnostic complet :

```bash
NODE_ENV=production            # Retour production (performance optimisée)
DEBUG=false                    # Logs minimaux uniquement erreurs critiques
```

---

## 📈 Scalabilité Multi-serveur (Horizontal Scaling avec Redis Cluster si >10 000 contacts)

**Architecture recommandée pour >50k contacts / multi-utilisateurs :**

```
┌─────────────────────────────────────────────────────┐
│              Cloud Load Balancer (ALB/Nginx)         │
│                    Entrance Point HTTP               │
└─────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                  ▼                 ▼
┌───────────┐      ┌───────────┐    ┌───────────┐
│ Node 1    │      │ Node 2    │    │ Node 3    │
│ Server    │      │ Server    │    │ Server    │
│ (API)     │──────▶(Redis     │◀────│ (API)     │
│           │       Cluster)   │     │           │
└───────────┘      └───────────┘    └───────────┘
        │                  │                 │
        ▼                  ▼                 ▼
              Shared Storage (EBS/S3)

Note : SQLite file-based ne supporte pas multi-writer natif !
Pour multi-serveur, utiliser PostgreSQL + ORM ou Redis pour cache sessions.
```

**Migration base SQLite → PostgreSQL :**

Si vous dépassez 100k contacts et besoin scaling horizontal :

```sql
-- Script migration SQLite → PostgreSQL (duplicata données)

-- Fichier : migrate-to-postgres.sql
BEGIN;

CREATE TABLE contacts_pg (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    titre VARCHAR(10),
    -- ... autres colonnes mêmes que SQLite ...
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COPY contacts_pg FROM STDIN WITH (FORMAT binary, ENCODING 'UTF8');
COMMIT;
```

Voir migration guide détaillé `MIGRATION_DATABASE.md` pour stratégie progressive sans downtime.

---

## 🎯 Déploiement sur Cloud Providers populaires

### AWS EC2 + RDS PostgreSQL (recommandé production)

```bash
# Lancement instance Ubuntu 24.04 t3.medium (2 vCPU + 4 Go RAM)
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.medium \
    --key-name mes-contacts-key \
    --security-group-ids sg-xxxxxxxxxx \
    --subnet-id subnet-xxxxxxx

# Configuration SSH access EC2 (AWS IAM Role user pour app, pas credentials .env direct)
ssh -i mes-contacts.pem ubuntu@ec2-192-168-1-10.compute-1.amazonaws.com
```

### Azure App Service + Azure Database PostgreSQL Flexible

Déploiement via CLI Azure :

```bash
az webapp create \
    --resource-group MesContactsRG \
    --plan MesContactsPlan \
    --name mes-contacts-webapp \
    --deployment-source-path /var/www/mes-contacts \
    --runtime "NODE:20-lts"

# Configuration environnement variables App Service
az webapp config appsettings set \
    --name mes-contacts-webapp \
    --settings SESSION_SECRET="SECURE_KEY" NODE_ENV="production" PORT=80
```

### Google Cloud Run + Cloud SQL PostgreSQL

Déploiement containerisé :

```bash
# Création Dockerfile (si containerisation nécessaire)
cat > Dockerfile <<'EOF'
FROM node:20-alpine3.19 as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine3.19
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src
ENV NODE_ENV production
CMD ["node", "src/server.js"]
EOF

# Build image Docker + deployment Cloud Run container registry gcr.io/votre-projet/mes-contacts:latest
docker build -t gcr.io/votre-projet/mes-contacts:latest .
gcloud containers images push gcr.io/votre-projet/mes-contacts:latest

# Déploiement Cloud Run Google Container Registry avec auto-scale (CPU 80% threshold)
gcloud run deploy mes-contacts \
    --image gcr.io/votre-projet/mes-contacts:latest \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars="NODE_ENV=production,PORT=3000"
```

---

## ✅ Checklist Finale - Pré-lancement Production

**À vérifier avant mise en ligne publique :**

- [ ] `.env` fichier supprimé/doublon sécurisé (KEYS cryptographiques uniques)
- [ ] `package-lock.json` validé + test npm install propre sans warnings
- [ ] Permissions fichier database SQLite 640 (rw-r-----) ou PostgreSQL config appropriée
- [ ] Certificat SSL Let's Encrypt vérifié (openssl s_client -connect IP:443 -starttls http)
- [ ] Firewall autorisé seulement HTTPS (port 443) + SSH admin (22)
- [ ] Backup automatique configuré + journalisation logs active
- [ ] Test CRUD complet contacts via API REST curl :

```bash
# Test création contact API production curl test
curl -X POST https://yourdomain.com/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"nom":"Dupont","prenom":"Jean","email":"jean.dupont@email.com"}'

# Test lecture liste contacts paginée
curl "https://yourdomain.com/api/contacts?page=1&limit=20"

# Test statistiques API
curl "https://yourdomain.com/api/stats"

# Test export CSV multipart download navigateur curl simulation
curl -X POST https://yourdomain.com/api/export/csv \
  -H "Content-Type: application/json" \
  --data '{"ids":"1,2,3"}'
