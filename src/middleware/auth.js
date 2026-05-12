/**
 * Middleware d'authentification simple
 */

// Session utilisateur par défaut (pas de système d'authentification réel)
const defaultUser = {
    id: 1,
    nom: 'Admin',
    email: 'admin@contacts.local'
};

/**
 * Vérifie que l'utilisateur est authentifié
 * Pour un vrai cas d'usage, implémenter une authentification JWT ou session complète
 */
function isAuthenticated(req, res, next) {
    // Pour la démo, toujours considéré comme authentifié
    req.user = defaultUser;
    next();
}

/**
 * Middleware pour gérer les erreurs multer (gestion des fichiers uploadés)
 */
function errorHandler(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: `Erreur d'upload : ${err.message}`
        });
    }
    next(err);
}

module.exports = {
    isAuthenticated,
    errorHandler
};
