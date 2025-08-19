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

// Obter logs com paginação
router.get('/', authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, campaign_id, status, date_from, date_to } = req.query;
        
        const logs = await dbManager.getLogs({
            page: parseInt(page),
            limit: parseInt(limit),
            campaign_id,
            status,
            date_from,
            date_to
        });
        
        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        logger.error('Erro ao obter logs:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Obter estatísticas dos logs
router.get('/stats', authenticateAdmin, async (req, res) => {
    try {
        const { date_from, date_to } = req.query;
        
        const stats = await dbManager.getLogStats({
            date_from,
            date_to
        });
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Erro ao obter estatísticas dos logs:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Exportar logs
router.get('/export', authenticateAdmin, async (req, res) => {
    try {
        const { format = 'json', campaign_id, date_from, date_to } = req.query;
        
        const logs = await dbManager.exportLogs({
            format,
            campaign_id,
            date_from,
            date_to
        });
        
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=logs.csv');
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=logs.json');
        }
        
        res.send(logs);
    } catch (error) {
        logger.error('Erro ao exportar logs:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Limpar logs antigos
router.delete('/cleanup', authenticateAdmin, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const deletedCount = await dbManager.cleanOldLogs(parseInt(days));
        
        res.json({
            success: true,
            message: `${deletedCount} logs removidos`,
            data: { deletedCount }
        });
    } catch (error) {
        logger.error('Erro ao limpar logs:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Obter log específico
router.get('/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const log = await dbManager.getLogById(id);
        
        if (!log) {
            return res.status(404).json({
                error: 'Log não encontrado',
                code: 'LOG_NOT_FOUND'
            });
        }
        
        res.json({
            success: true,
            data: log
        });
    } catch (error) {
        logger.error('Erro ao obter log:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

module.exports = router;
