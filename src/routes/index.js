/**
 * Routes principales du frontend
 */
const express = require('express');
const router = express.Router();
const path = require('path');

// Afficher le dossier public (serveur de fichiers statique)
router.use(express.static(path.join(__dirname, '../../public')));

/**
 * Point d'entrée principal - serve l'index.html pour les routes non traitées
 */
router.get('*', (req, res) => {
    // Tenter de charger index.html
    const indexPath = path.join(__dirname, '../../public/index.html');
    res.sendFile(indexPath);
});

module.exports = router;
