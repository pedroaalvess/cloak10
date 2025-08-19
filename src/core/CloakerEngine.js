const crypto = require('crypto');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const Logger = require('../utils/Logger');
const DatabaseManager = require('../database/DatabaseManager');
const SecurityManager = require('../security/SecurityManager');

class CloakerEngine {
    constructor(dbManager, logger, securityManager, proxyManager, botDetector) {
        this.dbManager = dbManager || new DatabaseManager();
        this.logger = logger || new Logger();
        this.securityManager = securityManager || new SecurityManager();
        this.proxyManager = proxyManager;
        this.botDetector = botDetector;
        this.blacklistedIPs = new Set();
        this.whitelistedIPs = new Set();
        this.campaignCache = new Map();
    }

    async initialize() {
        await this.loadBlacklistedIPs();
        await this.loadWhitelistedIPs();
        await this.loadCampaigns();
    }

    async processRequest(req, campaignId) {
        const startTime = Date.now();
        const requestData = this.extractRequestData(req);
        
        try {
            // Verificar se é um bot
            if (req.isBot) {
                return this.handleBotRequest(requestData, campaignId);
            }

            // Verificar IP
            const ipCheck = await this.checkIP(requestData.ip);
            if (!ipCheck.safe) {
                return this.handleUnsafeIP(requestData, ipCheck.reason);
            }

            // Verificar User Agent
            const uaCheck = await this.checkUserAgent(requestData.userAgent);
            if (!uaCheck.safe) {
                return this.handleUnsafeUA(requestData, uaCheck.reason);
            }

            // Verificar localização
            const geoCheck = await this.checkGeolocation(requestData.ip);
            if (!geoCheck.safe) {
                return this.handleUnsafeLocation(requestData, geoCheck.reason);
            }

            // Verificar referrer
            const referrerCheck = await this.checkReferrer(requestData.referrer);
            if (!referrerCheck.safe) {
                return this.handleUnsafeReferrer(requestData, referrerCheck.reason);
            }

            // Verificar padrões suspeitos
            const patternCheck = await this.checkSuspiciousPatterns(requestData);
            if (!patternCheck.safe) {
                return this.handleSuspiciousPattern(requestData, patternCheck.reason);
            }

            // Processar campanha
            const campaign = await this.getCampaign(campaignId);
            if (!campaign) {
                return this.handleInvalidCampaign(requestData, campaignId);
            }

            // Gerar URL de destino
            const targetUrl = await this.generateTargetUrl(campaign, requestData);

            // Log da requisição bem-sucedida
            await this.logSuccessfulRequest(requestData, campaign, targetUrl, Date.now() - startTime);

            return {
                success: true,
                redirectUrl: targetUrl,
                campaign: campaign.id
            };

        } catch (error) {
            this.logger.error('Erro no processamento do cloaker:', error);
            await this.logFailedRequest(requestData, error.message, Date.now() - startTime);
            
            return {
                success: false,
                redirectUrl: process.env.SAFE_PAGE || '/safe',
                error: error.message
            };
        }
    }

    extractRequestData(req) {
        const ip = this.getClientIP(req);
        const userAgent = req.get('User-Agent') || '';
        const referrer = req.get('Referer') || '';
        const acceptLanguage = req.get('Accept-Language') || '';
        const acceptEncoding = req.get('Accept-Encoding') || '';
        const connection = req.get('Connection') || '';
        const cacheControl = req.get('Cache-Control') || '';

        return {
            ip,
            userAgent,
            referrer,
            acceptLanguage,
            acceptEncoding,
            connection,
            cacheControl,
            timestamp: new Date().toISOString(),
            headers: req.headers,
            query: req.query,
            params: req.params
        };
    }

    getClientIP(req) {
        return req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               req.headers['x-client-ip'] ||
               'unknown';
    }

    async checkIP(ip) {
        // Verificar IPs em branco
        if (this.blacklistedIPs.has(ip)) {
            return { safe: false, reason: 'IP_BLACKLISTED' };
        }

        // Verificar IPs em branco
        if (this.whitelistedIPs.has(ip)) {
            return { safe: true, reason: 'IP_WHITELISTED' };
        }

        // Verificar se é IP privado
        if (this.isPrivateIP(ip)) {
            return { safe: false, reason: 'PRIVATE_IP' };
        }

        // Verificar se é IP de proxy/VPN
        if (await this.isProxyIP(ip)) {
            return { safe: false, reason: 'PROXY_IP' };
        }

        return { safe: true, reason: 'IP_SAFE' };
    }

    async checkUserAgent(userAgent) {
        if (!userAgent || userAgent.length < 10) {
            return { safe: false, reason: 'INVALID_USER_AGENT' };
        }

        const parser = new UAParser(userAgent);
        const result = parser.getResult();

        // Verificar se é um bot conhecido
        if (result.bot.name) {
            return { safe: false, reason: 'KNOWN_BOT' };
        }

        // Verificar se tem navegador válido
        if (!result.browser.name) {
            return { safe: false, reason: 'NO_BROWSER_DETECTED' };
        }

        // Verificar se tem sistema operacional válido
        if (!result.os.name) {
            return { safe: false, reason: 'NO_OS_DETECTED' };
        }

        return { safe: true, reason: 'USER_AGENT_SAFE' };
    }

    async checkGeolocation(ip) {
        try {
            const geo = geoip.lookup(ip);
            if (!geo) {
                return { safe: false, reason: 'GEO_UNKNOWN' };
            }

            // Verificar países bloqueados
            const blockedCountries = ['CN', 'RU', 'KP', 'IR'];
            if (blockedCountries.includes(geo.country)) {
                return { safe: false, reason: 'BLOCKED_COUNTRY' };
            }

            return { safe: true, reason: 'GEO_SAFE', country: geo.country };
        } catch (error) {
            return { safe: false, reason: 'GEO_ERROR' };
        }
    }

    async checkReferrer(referrer) {
        if (!referrer) {
            return { safe: true, reason: 'NO_REFERRER' };
        }

        // Verificar se é de fonte confiável
        const trustedDomains = [
            'google.com',
            'facebook.com',
            'bing.com',
            'yahoo.com',
            'youtube.com'
        ];

        const isTrusted = trustedDomains.some(domain => 
            referrer.includes(domain)
        );

        if (!isTrusted) {
            return { safe: false, reason: 'UNTRUSTED_REFERRER' };
        }

        return { safe: true, reason: 'REFERRER_SAFE' };
    }

    async checkSuspiciousPatterns(requestData) {
        // Verificar padrões de requisição suspeitos
        const suspiciousPatterns = [
            /bot/i,
            /crawler/i,
            /spider/i,
            /scraper/i,
            /monitor/i
        ];

        const combinedText = JSON.stringify(requestData).toLowerCase();
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(combinedText)) {
                return { safe: false, reason: 'SUSPICIOUS_PATTERN' };
            }
        }

        return { safe: true, reason: 'PATTERNS_SAFE' };
    }

    async getCampaign(campaignId) {
        // Verificar cache primeiro
        if (this.campaignCache.has(campaignId)) {
            return this.campaignCache.get(campaignId);
        }

        // Buscar no banco de dados
        const campaign = await this.dbManager.getCampaign(campaignId);
        if (campaign) {
            this.campaignCache.set(campaignId, campaign);
        }

        return campaign;
    }

    async generateTargetUrl(campaign, requestData) {
        let targetUrl = campaign.targetUrl;

        // Adicionar parâmetros de tracking
        const trackingParams = new URLSearchParams();
        trackingParams.append('utm_source', 'cloaker');
        trackingParams.append('utm_medium', 'cpc');
        trackingParams.append('utm_campaign', campaign.id);
        trackingParams.append('utm_content', requestData.ip);
        trackingParams.append('utm_term', this.generateFingerprint(requestData));

        // Adicionar timestamp
        trackingParams.append('_t', Date.now());

        // Adicionar hash de segurança
        const securityHash = this.generateSecurityHash(requestData, campaign);
        trackingParams.append('_h', securityHash);

        const separator = targetUrl.includes('?') ? '&' : '?';
        return `${targetUrl}${separator}${trackingParams.toString()}`;
    }

    generateFingerprint(requestData) {
        const fingerprint = `${requestData.ip}-${requestData.userAgent}-${requestData.acceptLanguage}`;
        return crypto.createHash('md5').update(fingerprint).digest('hex').substring(0, 8);
    }

    generateSecurityHash(requestData, campaign) {
        const data = `${requestData.ip}-${campaign.id}-${process.env.ENCRYPTION_KEY}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    isPrivateIP(ip) {
        const privateRanges = [
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /^192\.168\./,
            /^127\./,
            /^169\.254\./,
            /^::1$/,
            /^fc00:/,
            /^fe80:/
        ];

        return privateRanges.some(range => range.test(ip));
    }

    async isProxyIP(ip) {
        // Implementar verificação de proxy
        // Por enquanto, retorna false
        return false;
    }

    async loadBlacklistedIPs() {
        try {
            const ips = await this.dbManager.getBlacklistedIPs();
            ips.forEach(ip => this.blacklistedIPs.add(ip));
        } catch (error) {
            this.logger.error('Erro ao carregar IPs em branco:', error);
        }
    }

    async loadWhitelistedIPs() {
        try {
            const ips = await this.dbManager.getWhitelistedIPs();
            ips.forEach(ip => this.whitelistedIPs.add(ip));
        } catch (error) {
            this.logger.error('Erro ao carregar IPs em branco:', error);
        }
    }

    async loadCampaigns() {
        try {
            const campaigns = await this.dbManager.getAllCampaigns();
            campaigns.forEach(campaign => {
                this.campaignCache.set(campaign.id, campaign);
            });
        } catch (error) {
            this.logger.error('Erro ao carregar campanhas:', error);
        }
    }

    async logSuccessfulRequest(requestData, campaign, targetUrl, processingTime) {
        try {
            await this.dbManager.logRequest({
                ...requestData,
                campaignId: campaign.id,
                targetUrl,
                processingTime,
                status: 'SUCCESS',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error('Erro ao logar requisição bem-sucedida:', error);
        }
    }

    async logFailedRequest(requestData, error, processingTime) {
        try {
            await this.dbManager.logRequest({
                ...requestData,
                processingTime,
                status: 'FAILED',
                error,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error('Erro ao logar requisição falhada:', error);
        }
    }

    handleBotRequest(requestData, campaignId) {
        return {
            success: false,
            redirectUrl: process.env.SAFE_PAGE || '/safe',
            reason: 'BOT_DETECTED'
        };
    }

    handleUnsafeIP(requestData, reason) {
        return {
            success: false,
            redirectUrl: process.env.SAFE_PAGE || '/safe',
            reason
        };
    }

    handleUnsafeUA(requestData, reason) {
        return {
            success: false,
            redirectUrl: process.env.SAFE_PAGE || '/safe',
            reason
        };
    }

    handleUnsafeLocation(requestData, reason) {
        return {
            success: false,
            redirectUrl: process.env.SAFE_PAGE || '/safe',
            reason
        };
    }

    handleUnsafeReferrer(requestData, reason) {
        return {
            success: false,
            redirectUrl: process.env.SAFE_PAGE || '/safe',
            reason
        };
    }

    handleSuspiciousPattern(requestData, reason) {
        return {
            success: false,
            redirectUrl: process.env.SAFE_PAGE || '/safe',
            reason
        };
    }

    handleInvalidCampaign(requestData, campaignId) {
        return {
            success: false,
            redirectUrl: process.env.SAFE_PAGE || '/safe',
            reason: 'INVALID_CAMPAIGN'
        };
    }
}

module.exports = CloakerEngine;
