/**
 * Contrôleur pour la configuration du site
 */
const { db } = require('../db/database');

/**
 * Obtenir toutes les configurations
 */
exports.getAllConfig = (req, res) => {
    try {
        const config = db.prepare('SELECT key, value, updated_at FROM config ORDER BY key ASC').all();
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Erreur getAllConfig:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Obtenir une configuration par clé
 */
exports.getConfigByKey = (req, res) => {
    try {
        const { key } = req.params;
        const config = db.prepare('SELECT key, value, updated_at FROM config WHERE key = ?').get(key);

        if (!config) {
            return res.status(404).json({ success: false, message: 'Configuration non trouvée' });
        }

        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Erreur getConfigByKey:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Mettre à jour une configuration
 */
exports.updateConfig = (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (!key || !value) {
            return res.status(400).json({
                success: false,
                message: 'La clé et la valeur sont obligatoires'
            });
        }

        db.prepare('UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
            .run(value, key);

        const updatedConfig = db.prepare('SELECT key, value FROM config WHERE key = ?').get(key);

        res.json({ success: true, data: updatedConfig, message: 'Configuration mise à jour avec succès' });
    } catch (error) {
        console.error('Erreur updateConfig:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};

/**
 * Obtenir les statistiques
 */
exports.getStats = (req, res) => {
    try {
        const totalContacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
        const totalCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get();

        // Dernier contact créé
        const lastContact = db.prepare('SELECT nom, prenom, created_at FROM contacts ORDER BY created_at DESC LIMIT 1').get();

        res.json({ success: true, data: {
            totalContacts: totalContacts.count,
            totalCategories: totalCategories.count,
            lastContact
        }});
    } catch (error) {
        console.error('Erreur getStats:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur : ' + error.message
        });
    }
};
