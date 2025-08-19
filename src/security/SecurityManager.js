const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Logger = require('../utils/Logger');

class SecurityManager {
    constructor() {
        this.logger = new Logger();
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars';
        this.jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret';
        this.sessionSecret = process.env.SESSION_SECRET || 'default-session-secret';
    }

    async initialize() {
        this.logger.info('SecurityManager inicializado');
    }

    // Criptografia
    encrypt(text) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            this.logger.error('Erro na criptografia:', error);
            return null;
        }
    }

    decrypt(encryptedText) {
        try {
            const parts = encryptedText.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            this.logger.error('Erro na descriptografia:', error);
            return null;
        }
    }

    // Hash de senhas
    async hashPassword(password) {
        try {
            const saltRounds = 12;
            return await bcrypt.hash(password, saltRounds);
        } catch (error) {
            this.logger.error('Erro ao fazer hash da senha:', error);
            return null;
        }
    }

    async verifyPassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            this.logger.error('Erro ao verificar senha:', error);
            return false;
        }
    }

    // JWT
    generateToken(payload, expiresIn = '24h') {
        try {
            return jwt.sign(payload, this.jwtSecret, { expiresIn });
        } catch (error) {
            this.logger.error('Erro ao gerar token JWT:', error);
            return null;
        }
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            this.logger.error('Erro ao verificar token JWT:', error);
            return null;
        }
    }

    // Validações de segurança
    validateIP(ip) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }

    validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .trim();
    }

    // Geração de tokens seguros
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    generateFingerprint(data) {
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify(data));
        return hash.digest('hex');
    }

    // Verificação de força de senha
    validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const score = [
            password.length >= minLength,
            hasUpperCase,
            hasLowerCase,
            hasNumbers,
            hasSpecialChar
        ].filter(Boolean).length;

        return {
            score,
            isValid: score >= 4,
            feedback: this.getPasswordFeedback(score)
        };
    }

    getPasswordFeedback(score) {
        switch (score) {
            case 0:
            case 1:
                return 'Muito fraca';
            case 2:
                return 'Fraca';
            case 3:
                return 'Média';
            case 4:
                return 'Forte';
            case 5:
                return 'Muito forte';
            default:
                return 'Desconhecida';
        }
    }

    // Rate limiting
    createRateLimiter(windowMs = 15 * 60 * 1000, max = 100) {
        const requests = new Map();

        return (identifier) => {
            const now = Date.now();
            const windowStart = now - windowMs;

            if (!requests.has(identifier)) {
                requests.set(identifier, []);
            }

            const userRequests = requests.get(identifier);
            
            // Remover requisições antigas
            const recentRequests = userRequests.filter(time => time > windowStart);
            requests.set(identifier, recentRequests);

            if (recentRequests.length >= max) {
                return false; // Limite excedido
            }

            recentRequests.push(now);
            return true; // Permitido
        };
    }

    // Detecção de ataques
    detectAttackPattern(requestData) {
        const patterns = {
            sqlInjection: /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
            xss: /(<script|javascript:|on\w+\s*=|<iframe|<object)/i,
            pathTraversal: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i,
            commandInjection: /(\b(cmd|exec|system|eval|shell)\b)/i
        };

        const combinedData = JSON.stringify(requestData).toLowerCase();
        const detectedAttacks = [];

        for (const [attackType, pattern] of Object.entries(patterns)) {
            if (pattern.test(combinedData)) {
                detectedAttacks.push(attackType);
            }
        }

        return {
            isAttack: detectedAttacks.length > 0,
            attackTypes: detectedAttacks,
            riskLevel: this.calculateRiskLevel(detectedAttacks.length)
        };
    }

    calculateRiskLevel(attackCount) {
        if (attackCount === 0) return 'LOW';
        if (attackCount <= 2) return 'MEDIUM';
        if (attackCount <= 5) return 'HIGH';
        return 'CRITICAL';
    }

    // Logs de segurança
    logSecurityEvent(event, details, severity = 'INFO') {
        const securityLog = {
            timestamp: new Date().toISOString(),
            event,
            details,
            severity,
            ip: details.ip || 'unknown',
            userAgent: details.userAgent || 'unknown'
        };

        this.logger.logSecurityEvent(event, details);
        
        // Log adicional para eventos críticos
        if (severity === 'CRITICAL' || severity === 'HIGH') {
            this.logger.error('Evento de segurança crítico:', securityLog);
        }
    }

    // Verificação de integridade
    verifyDataIntegrity(data, signature) {
        try {
            const expectedSignature = this.generateFingerprint(data);
            return signature === expectedSignature;
        } catch (error) {
            this.logger.error('Erro na verificação de integridade:', error);
            return false;
        }
    }

    // Limpeza de dados sensíveis
    sanitizeSensitiveData(data) {
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
        const sanitized = { ...data };

        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    // Validação de headers de segurança
    validateSecurityHeaders(headers) {
        const requiredHeaders = [
            'user-agent',
            'accept',
            'accept-language'
        ];

        const missingHeaders = requiredHeaders.filter(header => 
            !headers[header] || headers[header].trim() === ''
        );

        return {
            isValid: missingHeaders.length === 0,
            missingHeaders,
            score: (requiredHeaders.length - missingHeaders.length) / requiredHeaders.length
        };
    }

    // Geração de nonce para CSP
    generateNonce() {
        return crypto.randomBytes(16).toString('base64');
    }

    // Verificação de origem
    validateOrigin(origin, allowedOrigins) {
        if (!origin) return false;
        
        return allowedOrigins.some(allowed => {
            if (allowed === '*') return true;
            if (allowed.startsWith('*.')) {
                const domain = allowed.slice(2);
                return origin.endsWith(domain);
            }
            return origin === allowed;
        });
    }

    // Limpeza de cache de segurança
    clearSecurityCache() {
        // Implementar limpeza de cache se necessário
        this.logger.info('Cache de segurança limpo');
    }
}

module.exports = SecurityManager;
