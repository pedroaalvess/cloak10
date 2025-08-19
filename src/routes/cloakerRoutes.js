const express = require('express');
const router = express.Router();
const CloakerEngine = require('../core/CloakerEngine');
const DatabaseManager = require('../database/DatabaseManager');
const Logger = require('../utils/Logger');

const dbManager = new DatabaseManager();
const logger = new Logger();

// Rota para processar requisições do cloaker
router.post('/process', async (req, res) => {
    try {
        const { campaignId, requestData } = req.body;
        
        if (!campaignId) {
            return res.status(400).json({
                error: 'ID da campanha é obrigatório',
                code: 'MISSING_CAMPAIGN_ID'
            });
        }

        // Simular requisição
        const mockReq = {
            ip: requestData?.ip || req.ip,
            headers: requestData?.headers || req.headers,
            query: requestData?.query || req.query,
            body: requestData?.body || req.body,
            url: requestData?.url || req.url,
            method: requestData?.method || req.method,
            isBot: requestData?.isBot || false
        };

        const result = await CloakerEngine.processRequest(mockReq, campaignId);
        
        res.json(result);
    } catch (error) {
        logger.error('Erro ao processar requisição do cloaker:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Rota para obter estatísticas de uma campanha
router.get('/stats/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;
        const stats = await dbManager.getCampaignStats(campaignId);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Erro ao obter estatísticas:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Rota para verificar status de uma campanha
router.get('/status/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;
        const campaign = await dbManager.getCampaign(campaignId);
        
        if (!campaign) {
            return res.status(404).json({
                error: 'Campanha não encontrada',
                code: 'CAMPAIGN_NOT_FOUND'
            });
        }

        res.json({
            success: true,
            data: {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                active: campaign.active === 1,
                created_at: campaign.created_at
            }
        });
    } catch (error) {
        logger.error('Erro ao verificar status da campanha:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

module.exports = router;
