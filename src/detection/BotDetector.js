const UserAgents = require('user-agents');
const crypto = require('crypto');
const Logger = require('../utils/Logger');

class BotDetector {
    constructor() {
        this.logger = new Logger();
        this.botPatterns = new Set();
        this.knownBots = new Set();
        this.suspiciousHeaders = new Set();
        this.behaviorPatterns = new Map();
        this.fingerprintCache = new Map();
        
        this.initializeBotPatterns();
        this.initializeKnownBots();
        this.initializeSuspiciousHeaders();
    }

    async initialize() {
        this.logger.info('BotDetector inicializado');
    }

    async detectBot(req) {
        const detectionResults = {
            userAgent: await this.checkUserAgent(req),
            headers: await this.checkHeaders(req),
            behavior: await this.checkBehavior(req),
            fingerprint: await this.checkFingerprint(req),
            javascript: await this.checkJavaScript(req),
            timing: await this.checkTiming(req),
            patterns: await this.checkPatterns(req)
        };

        const totalScore = Object.values(detectionResults).reduce((sum, score) => sum + score, 0);
        const isBot = totalScore >= 3; // Threshold para considerar como bot

        if (isBot) {
            this.logger.warn('Bot detectado:', {
                ip: this.getClientIP(req),
                userAgent: req.get('User-Agent'),
                score: totalScore,
                details: detectionResults
            });
        }

        return isBot;
    }

    async checkUserAgent(req) {
        const userAgent = req.get('User-Agent') || '';
        
        if (!userAgent) {
            return 2; // Pontuação alta para User Agent vazio
        }

        // Verificar padrões de bot conhecidos
        const botPatterns = [
            /bot/i,
            /crawler/i,
            /spider/i,
            /scraper/i,
            /monitor/i,
            /checker/i,
            /validator/i,
            /analyzer/i,
            /indexer/i,
            /harvester/i,
            /collector/i,
            /extractor/i,
            /fetcher/i,
            /grabber/i,
            /scanner/i,
            /searcher/i,
            /snooper/i,
            /stalker/i,
            /tracker/i,
            /watcher/i
        ];

        for (const pattern of botPatterns) {
            if (pattern.test(userAgent)) {
                return 3; // Pontuação máxima para padrão de bot
            }
        }

        // Verificar User Agents suspeitos
        const suspiciousPatterns = [
            /^[A-Za-z0-9]{10,}$/, // Apenas caracteres alfanuméricos
            /^[A-Z]{10,}$/, // Apenas maiúsculas
            /^[a-z]{10,}$/, // Apenas minúsculas
            /^[0-9]{10,}$/, // Apenas números
            /curl/i,
            /wget/i,
            /python/i,
            /java/i,
            /perl/i,
            /ruby/i,
            /php/i,
            /go-http-client/i,
            /okhttp/i,
            /apache-httpclient/i,
            /requests/i,
            /urllib/i,
            /mechanize/i,
            /selenium/i,
            /puppeteer/i,
            /playwright/i,
            /headless/i
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(userAgent)) {
                return 2; // Pontuação alta para padrão suspeito
            }
        }

        // Verificar se é um User Agent válido
        const validUserAgent = new UserAgents({ deviceCategory: 'desktop' });
        const isValid = this.isValidUserAgent(userAgent);

        if (!isValid) {
            return 1; // Pontuação baixa para User Agent inválido
        }

        return 0; // Sem pontuação para User Agent normal
    }

    async checkHeaders(req) {
        let score = 0;
        const headers = req.headers;

        // Verificar headers ausentes importantes
        const importantHeaders = ['accept', 'accept-language', 'accept-encoding'];
        for (const header of importantHeaders) {
            if (!headers[header]) {
                score += 0.5;
            }
        }

        // Verificar headers suspeitos
        const suspiciousHeaders = [
            'x-forwarded-for',
            'x-real-ip',
            'x-client-ip',
            'x-forwarded-host',
            'x-forwarded-proto',
            'x-requested-with',
            'x-http-method-override'
        ];

        for (const header of suspiciousHeaders) {
            if (headers[header]) {
                score += 0.3;
            }
        }

        // Verificar valores suspeitos em headers
        if (headers['accept'] && !headers['accept'].includes('text/html')) {
            score += 1;
        }

        if (headers['user-agent'] && headers['user-agent'].length < 20) {
            score += 1;
        }

        // Verificar headers de proxy
        if (headers['via'] || headers['x-forwarded-for'] || headers['x-real-ip']) {
            score += 0.5;
        }

        return Math.min(score, 3);
    }

    async checkBehavior(req) {
        let score = 0;
        const ip = this.getClientIP(req);

        // Verificar padrões de comportamento
        const behaviorKey = `${ip}-${req.get('User-Agent')}`;
        const currentTime = Date.now();

        if (!this.behaviorPatterns.has(behaviorKey)) {
            this.behaviorPatterns.set(behaviorKey, {
                requests: [],
                lastRequest: currentTime
            });
        }

        const behavior = this.behaviorPatterns.get(behaviorKey);
        behavior.requests.push(currentTime);

        // Manter apenas as últimas 100 requisições
        if (behavior.requests.length > 100) {
            behavior.requests = behavior.requests.slice(-100);
        }

        // Verificar frequência de requisições
        const recentRequests = behavior.requests.filter(time => 
            currentTime - time < 60000 // Último minuto
        );

        if (recentRequests.length > 10) {
            score += 2; // Muitas requisições em pouco tempo
        }

        // Verificar padrão de requisições
        if (behavior.requests.length > 1) {
            const intervals = [];
            for (let i = 1; i < behavior.requests.length; i++) {
                intervals.push(behavior.requests[i] - behavior.requests[i - 1]);
            }

            // Verificar se os intervalos são muito regulares (bot)
            const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
            const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);

            if (stdDev < 100) { // Intervalos muito regulares
                score += 1;
            }
        }

        behavior.lastRequest = currentTime;

        return Math.min(score, 3);
    }

    async checkFingerprint(req) {
        const fingerprint = this.generateFingerprint(req);
        
        if (this.fingerprintCache.has(fingerprint)) {
            const cached = this.fingerprintCache.get(fingerprint);
            const timeDiff = Date.now() - cached.timestamp;
            
            if (timeDiff < 5000) { // Mesmo fingerprint em menos de 5 segundos
                return 2;
            }
        }

        this.fingerprintCache.set(fingerprint, {
            timestamp: Date.now(),
            ip: this.getClientIP(req)
        });

        // Limpar cache antigo
        const now = Date.now();
        for (const [key, value] of this.fingerprintCache.entries()) {
            if (now - value.timestamp > 300000) { // 5 minutos
                this.fingerprintCache.delete(key);
            }
        }

        return 0;
    }

    async checkJavaScript(req) {
        // Verificar se o cliente suporta JavaScript
        const headers = req.headers;
        
        // Headers que indicam suporte a JavaScript
        const jsHeaders = [
            'accept',
            'accept-language',
            'accept-encoding',
            'cache-control',
            'pragma'
        ];

        let jsSupport = 0;
        for (const header of jsHeaders) {
            if (headers[header]) {
                jsSupport++;
            }
        }

        if (jsSupport < 2) {
            return 1; // Baixo suporte a JavaScript
        }

        return 0;
    }

    async checkTiming(req) {
        // Verificar timing da requisição
        const now = Date.now();
        const hour = new Date().getHours();
        
        // Bots tendem a fazer requisições em horários específicos
        if (hour >= 2 && hour <= 6) {
            return 0.5; // Horário de baixa atividade
        }

        return 0;
    }

    async checkPatterns(req) {
        let score = 0;
        const url = req.url;
        const query = req.query;

        // Verificar padrões suspeitos na URL
        const suspiciousUrlPatterns = [
            /admin/i,
            /wp-admin/i,
            /phpmyadmin/i,
            /cpanel/i,
            /webmail/i,
            /ftp/i,
            /ssh/i,
            /telnet/i,
            /smtp/i,
            /pop3/i,
            /imap/i,
            /mysql/i,
            /postgresql/i,
            /oracle/i,
            /sqlserver/i,
            /mongodb/i,
            /redis/i,
            /memcached/i,
            /elasticsearch/i,
            /solr/i
        ];

        for (const pattern of suspiciousUrlPatterns) {
            if (pattern.test(url)) {
                score += 1;
            }
        }

        // Verificar parâmetros suspeitos
        const suspiciousParams = [
            'id',
            'page',
            'article',
            'post',
            'news',
            'blog',
            'forum',
            'thread',
            'topic',
            'category',
            'tag',
            'search',
            'query',
            'q',
            's',
            'keyword',
            'term'
        ];

        for (const param of suspiciousParams) {
            if (query[param]) {
                score += 0.3;
            }
        }

        return Math.min(score, 2);
    }

    generateFingerprint(req) {
        const data = {
            ip: this.getClientIP(req),
            userAgent: req.get('User-Agent') || '',
            accept: req.get('Accept') || '',
            acceptLanguage: req.get('Accept-Language') || '',
            acceptEncoding: req.get('Accept-Encoding') || '',
            connection: req.get('Connection') || '',
            cacheControl: req.get('Cache-Control') || ''
        };

        return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
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

    isValidUserAgent(userAgent) {
        if (!userAgent || userAgent.length < 20) {
            return false;
        }

        // Verificar se contém elementos típicos de navegadores
        const browserPatterns = [
            /mozilla/i,
            /chrome/i,
            /safari/i,
            /firefox/i,
            /edge/i,
            /opera/i,
            /ie/i,
            /webkit/i,
            /gecko/i,
            /trident/i
        ];

        return browserPatterns.some(pattern => pattern.test(userAgent));
    }

    initializeBotPatterns() {
        const patterns = [
            'bot', 'crawler', 'spider', 'scraper', 'monitor', 'checker',
            'validator', 'analyzer', 'indexer', 'harvester', 'collector',
            'extractor', 'fetcher', 'grabber', 'scanner', 'searcher',
            'snooper', 'stalker', 'tracker', 'watcher', 'robot'
        ];

        patterns.forEach(pattern => this.botPatterns.add(pattern));
    }

    initializeKnownBots() {
        const knownBots = [
            'Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider',
            'YandexBot', 'facebookexternalhit', 'Twitterbot', 'LinkedInBot',
            'WhatsApp', 'TelegramBot', 'Discordbot', 'Slackbot', 'SkypeUriPreview',
            'Pinterest', 'Instagram', 'Snapchat', 'TikTok', 'Redditbot',
            'Medium', 'Tumblr', 'WordPress', 'Joomla', 'Drupal',
            'W3C_Validator', 'W3C_CSS_Validator', 'W3C_Link_Checker',
            'Feedfetcher', 'Feedburner', 'FeedValidator', 'RSS_Reader',
            'Applebot', 'Sogou', '360Spider', 'AhrefsBot', 'MJ12bot',
            'DotBot', 'SemrushBot', 'Mozbot', 'Majestic', 'Blekkobot',
            'Ezooms', 'Rogerbot', 'Exabot', 'Gigabot', 'ia_archiver',
            'archive.org_bot', 'Wayback_Machine', 'InternetArchive',
            'Nutch', 'Heritrix', 'HTTrack', 'Wget', 'curl',
            'python-requests', 'urllib', 'mechanize', 'scrapy',
            'selenium', 'puppeteer', 'playwright', 'phantomjs',
            'headless', 'automation', 'testing', 'monitoring'
        ];

        knownBots.forEach(bot => this.knownBots.add(bot.toLowerCase()));
    }

    initializeSuspiciousHeaders() {
        const headers = [
            'x-forwarded-for', 'x-real-ip', 'x-client-ip', 'x-forwarded-host',
            'x-forwarded-proto', 'x-requested-with', 'x-http-method-override',
            'x-original-url', 'x-rewrite-url', 'x-custom-header',
            'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor',
            'x-cloudflare-ip', 'x-cloudflare-country', 'x-cloudflare-ray',
            'x-akamai-transformed', 'x-akamai-origin-hop', 'x-akamai-ssl',
            'x-fastly-ssl', 'x-fastly-client-ip', 'x-fastly-client-ssl',
            'x-vercel-forwarded-for', 'x-vercel-ip-country', 'x-vercel-ip-city',
            'x-netlify-via', 'x-netlify-ip', 'x-netlify-country',
            'x-heroku-dynos', 'x-heroku-queue-depth', 'x-heroku-queue-wait-time'
        ];

        headers.forEach(header => this.suspiciousHeaders.add(header.toLowerCase()));
    }
}

module.exports = BotDetector;
