const express = require('express');
const router = express.Router();
const DatabaseManager = require('../database/DatabaseManager');
const SecurityManager = require('../security/SecurityManager');
const Logger = require('../utils/Logger');

const dbManager = new DatabaseManager();
const securityManager = new SecurityManager();
const logger = new Logger();

// Middleware de autenticação
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                error: 'Token de autenticação necessário',
                code: 'AUTH_TOKEN_REQUIRED'
            });
        }

        const decoded = securityManager.verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token inválido',
                code: 'INVALID_TOKEN'
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        logger.error('Erro na autenticação:', error);
        res.status(401).json({
            error: 'Falha na autenticação',
            code: 'AUTH_FAILED'
        });
    }
};

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                error: 'Usuário e senha são obrigatórios',
                code: 'MISSING_CREDENTIALS'
            });
        }

        const user = await dbManager.verifyAdminUser(username, password);
        
        if (!user) {
            return res.status(401).json({
                error: 'Credenciais inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const token = securityManager.generateToken({
            id: user.id,
            username: user.username,
            role: 'admin'
        });

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: 'admin'
                }
            }
        });
    } catch (error) {
        logger.error('Erro no login:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Dashboard
router.get('/dashboard', authenticateAdmin, async (req, res) => {
    try {
        const stats = await dbManager.getDashboardStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Erro ao obter dashboard:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Campanhas
router.get('/campaigns', authenticateAdmin, async (req, res) => {
    try {
        const campaigns = await dbManager.getAllCampaigns();
        res.json({
            success: true,
            data: campaigns
        });
    } catch (error) {
        logger.error('Erro ao obter campanhas:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

router.post('/campaigns', authenticateAdmin, async (req, res) => {
    try {
        const campaignData = req.body;
        const campaign = await dbManager.createCampaign(campaignData);
        
        res.json({
            success: true,
            data: campaign
        });
    } catch (error) {
        logger.error('Erro ao criar campanha:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

router.put('/campaigns/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const campaignData = req.body;
        
        const campaign = await dbManager.updateCampaign(id, campaignData);
        
        if (!campaign) {
            return res.status(404).json({
                error: 'Campanha não encontrada',
                code: 'CAMPAIGN_NOT_FOUND'
            });
        }

        res.json({
            success: true,
            data: campaign
        });
    } catch (error) {
        logger.error('Erro ao atualizar campanha:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

router.delete('/campaigns/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const success = await dbManager.deleteCampaign(id);
        
        if (!success) {
            return res.status(404).json({
                error: 'Campanha não encontrada',
                code: 'CAMPAIGN_NOT_FOUND'
            });
        }

        res.json({
            success: true,
            message: 'Campanha removida com sucesso'
        });
    } catch (error) {
        logger.error('Erro ao remover campanha:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Configurações
router.get('/settings', authenticateAdmin, async (req, res) => {
    try {
        const settings = await dbManager.getAllSettings();
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        logger.error('Erro ao obter configurações:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

router.put('/settings', authenticateAdmin, async (req, res) => {
    try {
        const settings = req.body;
        await dbManager.updateSettings(settings);
        
        res.json({
            success: true,
            message: 'Configurações atualizadas com sucesso'
        });
    } catch (error) {
        logger.error('Erro ao atualizar configurações:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

module.exports = router;
