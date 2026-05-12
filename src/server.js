/**
 * Application de Gestion de Contacts - Serveur Principal
 * Stack : Node.js + Express + SQLite
 */

require('dotenv').config();

// Importations
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

// Importations des routes
const indexRoutes = require('./routes/index');
const apiRoutes = require('./routes/api');

// Initialisation de l'application
const app = express();
const PORT = process.env.PORT || 3000;

// Corps JSON (middleware pour parser le body JSON)
app.use(express.json());

// Headers CORS - autoriser les requêtes depuis localhost:8055 et localhost:3000
app.use((req, res, next) => {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:8055'];
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
        // Origins connues - permettre avec credentials
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    } else {
        // Autres origins - permettre sans credentials
        res.header('Access-Control-Allow-Origin', '*');
    }

    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');

    // Prévenir les préflights OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
});

// Parseur de cookies (pour les sessions, etc.)
app.use(cookieParser());

// Static files (CSS, JS, images uploadés)
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../data/uploads')));

// Routes de l'API REST - DOIVENT VENIR AVANT la route wildcard !
app.use('/api', apiRoutes);

// Routes principales du frontend (fallback pour les routes non-API)
app.use('/', indexRoutes);

/**
 * Point d'entrée pour les routes non-API (SPA fallback)
 */
app.get('*', (req, res) => {
    // Tenter de charger index.html
    const indexPath = path.join(__dirname, '../public/index.html');
    res.sendFile(indexPath);
});

/**
 * Gérer les erreurs
 */
app.use((err, req, res, next) => {
    console.error('Erreur serveur :', err.message);

    // Erreur de validation multer (fichier uploadé)
    if (err.message.includes('upload')) {
        return res.status(400).json({
            success: false,
            message: `Erreur d'upload : ${err.message}`
        });
    }

    // Afficher l'erreur en production ou développement
    if (process.env.NODE_ENV === 'production') {
        console.error(err.stack);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur inconnue. Veuillez contacter le support.'
        });
    } else {
        console.error('Détails de l\'erreur :', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Erreur serveur interne'
        });
    }
});

/**
 * Démarrer le serveur
 */
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('  APPLICATION DE GESTION DE CONTACTS');
    console.log('='.repeat(60));
    console.log(`  Serveur démarré sur : http://localhost:${PORT}`);
    console.log(`  API disponible au path /api`);
    console.log('='.repeat(60));
    /*
    console.log('\n  Routes principales :');
    console.log('    - GET  /        -> Page d\'accueil (Tableau de bord)');
    console.log('    - GET  /api/contacts        -> Liste tous les contacts');
    console.log('    - GET  /api/contacts/:id    -> Obtenir un contact par ID');
    console.log('    - POST /api/contacts        -> Créer un nouveau contact');
    console.log('    - PUT  /api/contacts/:id    -> Mettre à jour un contact');
    console.log('    - DELETE /api/contacts/:id  -> Supprimer un contact');
    console.log('\n  Routes des catégories :');
    console.log('    - GET    /api/categories        -> Liste des catégories');
    console.log('    - POST   /api/categories        -> Créer une catégorie');
    console.log('    - PUT    /api/categories/:id    -> Mettre à jour une catégorie');
    console.log('    - DELETE /api/categories/:id    -> Supprimer une catégorie');
    console.log('\n  Routes d\'import/export :');
    console.log('    - POST /api/import/csv           -> Importer depuis CSV');
    console.log('    - POST /api/import/vcf           -> Importer depuis VCF');
    console.log('    - POST /api/export/csv           -> Exporter vers CSV');
    console.log('    - POST /api/export/vcf           -> Exporter vers VCF');
    console.log('    - POST /api/export/xlsx          -> Exporter vers Excel');
    console.log('\n  Routes de configuration :');
    console.log('    - GET    /api/config        -> Obtenir la config du site');
    console.log('    - PUT    /api/config/:key   -> Mettre à jour la config');
    console.log('\n  Paramètres d\'environnement disponibles :');
    console.log('    - PORT        : Port d\'écoute (défaut : ' + PORT + ')');
    
    console.log('Ras Rita @ 2026');
    
    console.log('='.repeat(60) + '\n');
    */
});

module.exports = app;
