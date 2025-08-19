const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const Logger = require('../utils/Logger');

class DatabaseManager {
    constructor() {
        this.logger = new Logger();
        this.db = null;
        this.dbPath = process.env.DB_PATH || './data/cloaker.db';
    }

    async initialize() {
        try {
            // Criar diretório se não existir
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            this.db = new sqlite3.Database(this.dbPath);
            
            await this.createTables();
            await this.insertDefaultData();
            
            this.logger.info('Banco de dados inicializado com sucesso');
        } catch (error) {
            this.logger.error('Erro ao inicializar banco de dados:', error);
            throw error;
        }
    }

    async createTables() {
        const tables = [
            // Tabela de campanhas
            `CREATE TABLE IF NOT EXISTS campaigns (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                target_url TEXT NOT NULL,
                safe_url TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                settings TEXT,
                description TEXT
            )`,

            // Tabela de logs de requisições
            `CREATE TABLE IF NOT EXISTS request_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id TEXT,
                ip TEXT NOT NULL,
                user_agent TEXT,
                referrer TEXT,
                target_url TEXT,
                safe_url TEXT,
                status TEXT NOT NULL,
                processing_time INTEGER,
                error TEXT,
                headers TEXT,
                query_params TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                country TEXT,
                city TEXT,
                isp TEXT,
                fingerprint TEXT,
                FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
            )`,

            // Tabela de IPs em branco
            `CREATE TABLE IF NOT EXISTS blacklisted_ips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip TEXT UNIQUE NOT NULL,
                reason TEXT,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                added_by TEXT DEFAULT 'system'
            )`,

            // Tabela de IPs em branco
            `CREATE TABLE IF NOT EXISTS whitelisted_ips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip TEXT UNIQUE NOT NULL,
                reason TEXT,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                added_by TEXT DEFAULT 'system'
            )`,

            // Tabela de configurações
            `CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT,
                description TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabela de usuários admin
            `CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT,
                role TEXT DEFAULT 'admin',
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )`,

            // Tabela de estatísticas
            `CREATE TABLE IF NOT EXISTS statistics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id TEXT,
                date DATE NOT NULL,
                total_requests INTEGER DEFAULT 0,
                successful_requests INTEGER DEFAULT 0,
                blocked_requests INTEGER DEFAULT 0,
                bot_requests INTEGER DEFAULT 0,
                unique_ips INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES campaigns (id),
                UNIQUE(campaign_id, date)
            )`,

            // Tabela de fingerprints
            `CREATE TABLE IF NOT EXISTS fingerprints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fingerprint TEXT UNIQUE NOT NULL,
                ip TEXT NOT NULL,
                user_agent TEXT,
                first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                request_count INTEGER DEFAULT 1,
                is_suspicious BOOLEAN DEFAULT 0
            )`,

            // Tabela de proxies
            `CREATE TABLE IF NOT EXISTS proxies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip TEXT NOT NULL,
                port INTEGER NOT NULL,
                username TEXT,
                password TEXT,
                type TEXT DEFAULT 'http',
                is_active BOOLEAN DEFAULT 1,
                last_check DATETIME,
                success_rate REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(ip, port)
            )`,

            // Tabela de domínios confiáveis
            `CREATE TABLE IF NOT EXISTS trusted_domains (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                added_by TEXT DEFAULT 'system'
            )`,

            // Tabela de países bloqueados
            `CREATE TABLE IF NOT EXISTS blocked_countries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                country_code TEXT UNIQUE NOT NULL,
                country_name TEXT,
                reason TEXT,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                added_by TEXT DEFAULT 'system'
            )`
        ];

        for (const table of tables) {
            await this.run(table);
        }

        // Criar índices para melhor performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_request_logs_campaign_id ON request_logs(campaign_id)',
            'CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON request_logs(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_request_logs_ip ON request_logs(ip)',
            'CREATE INDEX IF NOT EXISTS idx_request_logs_status ON request_logs(status)',
            'CREATE INDEX IF NOT EXISTS idx_statistics_campaign_date ON statistics(campaign_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_fingerprints_fingerprint ON fingerprints(fingerprint)',
            'CREATE INDEX IF NOT EXISTS idx_fingerprints_ip ON fingerprints(ip)',
            'CREATE INDEX IF NOT EXISTS idx_proxies_ip_port ON proxies(ip, port)',
            'CREATE INDEX IF NOT EXISTS idx_blacklisted_ips_ip ON blacklisted_ips(ip)',
            'CREATE INDEX IF NOT EXISTS idx_whitelisted_ips_ip ON whitelisted_ips(ip)'
        ];

        for (const index of indexes) {
            await this.run(index);
        }
    }

    async insertDefaultData() {
        // Inserir configurações padrão
        const defaultSettings = [
            ['cloaker_mode', 'advanced', 'Modo de operação do cloaker'],
            ['default_safe_page', '/safe', 'Página padrão para requisições bloqueadas'],
            ['max_requests_per_minute', '100', 'Máximo de requisições por minuto por IP'],
            ['bot_detection_threshold', '3', 'Threshold para detecção de bots'],
            ['enable_proxy_rotation', 'false', 'Habilitar rotação de proxies'],
            ['enable_geo_blocking', 'true', 'Habilitar bloqueio por geolocalização'],
            ['enable_referrer_check', 'true', 'Habilitar verificação de referrer'],
            ['enable_fingerprinting', 'true', 'Habilitar fingerprinting'],
            ['log_level', 'info', 'Nível de log'],
            ['retention_days', '30', 'Dias para manter logs']
        ];

        for (const [key, value, description] of defaultSettings) {
            await this.run(
                'INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)',
                [key, value, description]
            );
        }

        // Inserir domínios confiáveis padrão
        const trustedDomains = [
            'google.com',
            'facebook.com',
            'bing.com',
            'yahoo.com',
            'youtube.com',
            'twitter.com',
            'instagram.com',
            'linkedin.com',
            'pinterest.com',
            'reddit.com'
        ];

        for (const domain of trustedDomains) {
            await this.run(
                'INSERT OR IGNORE INTO trusted_domains (domain) VALUES (?)',
                [domain]
            );
        }

        // Inserir países bloqueados padrão
        const blockedCountries = [
            ['CN', 'China', 'País com alto índice de bots'],
            ['RU', 'Russia', 'País com alto índice de ataques'],
            ['KP', 'North Korea', 'País com alto índice de ataques'],
            ['IR', 'Iran', 'País com alto índice de ataques']
        ];

        for (const [code, name, reason] of blockedCountries) {
            await this.run(
                'INSERT OR IGNORE INTO blocked_countries (country_code, country_name, reason) VALUES (?, ?, ?)',
                [code, name, reason]
            );
        }

        // Inserir usuário admin padrão
        const bcrypt = require('bcryptjs');
        const defaultPassword = 'admin123';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        await this.run(
            'INSERT OR IGNORE INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
            ['admin', passwordHash, 'admin@cloaker.com', 'admin']
        );
    }

    // Métodos para campanhas
    async createCampaign(campaignData) {
        const { id, name, targetUrl, safeUrl, settings, description } = campaignData;
        
        return await this.run(
            'INSERT INTO campaigns (id, name, target_url, safe_url, settings, description) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, targetUrl, safeUrl, JSON.stringify(settings), description]
        );
    }

    async getCampaign(campaignId) {
        return await this.get(
            'SELECT * FROM campaigns WHERE id = ? AND is_active = 1',
            [campaignId]
        );
    }

    async getAllCampaigns() {
        return await this.all('SELECT * FROM campaigns WHERE is_active = 1 ORDER BY created_at DESC');
    }

    async updateCampaign(campaignId, updateData) {
        const { name, targetUrl, safeUrl, settings, description, isActive } = updateData;
        
        return await this.run(
            'UPDATE campaigns SET name = ?, target_url = ?, safe_url = ?, settings = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, targetUrl, safeUrl, JSON.stringify(settings), description, isActive, campaignId]
        );
    }

    async deleteCampaign(campaignId) {
        return await this.run('DELETE FROM campaigns WHERE id = ?', [campaignId]);
    }

    // Métodos para logs
    async logRequest(logData) {
        const {
            campaignId, ip, userAgent, referrer, targetUrl, safeUrl,
            status, processingTime, error, headers, query, country,
            city, isp, fingerprint
        } = logData;

        return await this.run(
            `INSERT INTO request_logs (
                campaign_id, ip, user_agent, referrer, target_url, safe_url,
                status, processing_time, error, headers, query_params,
                country, city, isp, fingerprint
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                campaignId, ip, userAgent, referrer, targetUrl, safeUrl,
                status, processingTime, error, JSON.stringify(headers),
                JSON.stringify(query), country, city, isp, fingerprint
            ]
        );
    }

    async getRequestLogs(filters = {}, limit = 100, offset = 0) {
        let query = 'SELECT * FROM request_logs WHERE 1=1';
        const params = [];

        if (filters.campaignId) {
            query += ' AND campaign_id = ?';
            params.push(filters.campaignId);
        }

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        if (filters.ip) {
            query += ' AND ip = ?';
            params.push(filters.ip);
        }

        if (filters.startDate) {
            query += ' AND timestamp >= ?';
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ' AND timestamp <= ?';
            params.push(filters.endDate);
        }

        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return await this.all(query, params);
    }

    // Métodos para IPs
    async getBlacklistedIPs() {
        const result = await this.all('SELECT ip FROM blacklisted_ips');
        return result.map(row => row.ip);
    }

    async getWhitelistedIPs() {
        const result = await this.all('SELECT ip FROM whitelisted_ips');
        return result.map(row => row.ip);
    }

    async addBlacklistedIP(ip, reason = '', addedBy = 'system') {
        return await this.run(
            'INSERT OR IGNORE INTO blacklisted_ips (ip, reason, added_by) VALUES (?, ?, ?)',
            [ip, reason, addedBy]
        );
    }

    async addWhitelistedIP(ip, reason = '', addedBy = 'system') {
        return await this.run(
            'INSERT OR IGNORE INTO whitelisted_ips (ip, reason, added_by) VALUES (?, ?, ?)',
            [ip, reason, addedBy]
        );
    }

    async removeBlacklistedIP(ip) {
        return await this.run('DELETE FROM blacklisted_ips WHERE ip = ?', [ip]);
    }

    async removeWhitelistedIP(ip) {
        return await this.run('DELETE FROM whitelisted_ips WHERE ip = ?', [ip]);
    }

    // Métodos para estatísticas
    async updateStatistics(campaignId, date, stats) {
        const { totalRequests, successfulRequests, blockedRequests, botRequests, uniqueIPs } = stats;
        
        return await this.run(
            `INSERT OR REPLACE INTO statistics 
            (campaign_id, date, total_requests, successful_requests, blocked_requests, bot_requests, unique_ips)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [campaignId, date, totalRequests, successfulRequests, blockedRequests, botRequests, uniqueIPs]
        );
    }

    async getStatistics(campaignId, startDate, endDate) {
        return await this.all(
            'SELECT * FROM statistics WHERE campaign_id = ? AND date BETWEEN ? AND ? ORDER BY date',
            [campaignId, startDate, endDate]
        );
    }

    // Métodos para configurações
    async getSetting(key) {
        const result = await this.get('SELECT value FROM settings WHERE key = ?', [key]);
        return result ? result.value : null;
    }

    async setSetting(key, value) {
        return await this.run(
            'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            [key, value]
        );
    }

    async getAllSettings() {
        return await this.all('SELECT * FROM settings ORDER BY key');
    }

    // Métodos para usuários admin
    async createAdminUser(userData) {
        const { username, password, email, role } = userData;
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(password, 10);

        return await this.run(
            'INSERT INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
            [username, passwordHash, email, role]
        );
    }

    async verifyAdminUser(username, password) {
        const user = await this.get(
            'SELECT * FROM admin_users WHERE username = ? AND is_active = 1',
            [username]
        );

        if (!user) return null;

        const bcrypt = require('bcryptjs');
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (isValid) {
            await this.run(
                'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
            );
            return user;
        }

        return null;
    }

    // Métodos auxiliares
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    this.logger.error('Erro na execução SQL:', err);
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    this.logger.error('Erro na consulta SQL:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    this.logger.error('Erro na consulta SQL:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        this.logger.error('Erro ao fechar banco de dados:', err);
                    }
                    resolve();
                });
            });
        }
    }
}

module.exports = DatabaseManager;
