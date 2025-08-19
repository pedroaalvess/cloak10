const fs = require('fs');
const path = require('path');
const moment = require('moment');

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logFile = process.env.LOG_FILE || './logs/cloaker.log';
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.maxFiles = 5;
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };

        this.initializeLogDirectory();
    }

    initializeLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }

    formatMessage(level, message, data = null) {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
        const levelUpper = level.toUpperCase().padEnd(5);
        
        let formattedMessage = `[${timestamp}] ${levelUpper} - ${message}`;
        
        if (data) {
            if (typeof data === 'object') {
                formattedMessage += ` - ${JSON.stringify(data, null, 2)}`;
            } else {
                formattedMessage += ` - ${data}`;
            }
        }
        
        return formattedMessage;
    }

    writeToFile(message) {
        try {
            // Verificar se o arquivo existe e seu tamanho
            if (fs.existsSync(this.logFile)) {
                const stats = fs.statSync(this.logFile);
                if (stats.size > this.maxFileSize) {
                    this.rotateLogFiles();
                }
            }

            fs.appendFileSync(this.logFile, message + '\n');
        } catch (error) {
            console.error('Erro ao escrever no arquivo de log:', error);
        }
    }

    rotateLogFiles() {
        try {
            // Remover arquivo mais antigo se exceder o limite
            const oldestFile = `${this.logFile}.${this.maxFiles}`;
            if (fs.existsSync(oldestFile)) {
                fs.unlinkSync(oldestFile);
            }

            // Rotacionar arquivos existentes
            for (let i = this.maxFiles - 1; i >= 1; i--) {
                const currentFile = `${this.logFile}.${i}`;
                const nextFile = `${this.logFile}.${i + 1}`;
                
                if (fs.existsSync(currentFile)) {
                    fs.renameSync(currentFile, nextFile);
                }
            }

            // Renomear arquivo atual
            fs.renameSync(this.logFile, `${this.logFile}.1`);
        } catch (error) {
            console.error('Erro ao rotacionar arquivos de log:', error);
        }
    }

    log(level, message, data = null) {
        if (!this.shouldLog(level)) {
            return;
        }

        const formattedMessage = this.formatMessage(level, message, data);
        
        // Log para console
        const consoleMessage = this.formatConsoleMessage(level, message, data);
        console.log(consoleMessage);
        
        // Log para arquivo
        this.writeToFile(formattedMessage);
    }

    formatConsoleMessage(level, message, data = null) {
        const colors = {
            error: '\x1b[31m', // Vermelho
            warn: '\x1b[33m',  // Amarelo
            info: '\x1b[36m',  // Ciano
            debug: '\x1b[35m'  // Magenta
        };
        
        const reset = '\x1b[0m';
        const color = colors[level] || '';
        
        let consoleMessage = `${color}[${level.toUpperCase()}]${reset} ${message}`;
        
        if (data) {
            if (typeof data === 'object') {
                consoleMessage += `\n${color}${JSON.stringify(data, null, 2)}${reset}`;
            } else {
                consoleMessage += ` ${color}${data}${reset}`;
            }
        }
        
        return consoleMessage;
    }

    error(message, data = null) {
        this.log('error', message, data);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    debug(message, data = null) {
        this.log('debug', message, data);
    }

    // Métodos específicos para o cloaker
    logRequest(req, result) {
        const requestData = {
            method: req.method,
            url: req.url,
            ip: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            referrer: req.get('Referer'),
            timestamp: new Date().toISOString()
        };

        if (result.success) {
            this.info('Requisição processada com sucesso', {
                ...requestData,
                campaignId: result.campaign,
                targetUrl: result.redirectUrl
            });
        } else {
            this.warn('Requisição bloqueada', {
                ...requestData,
                reason: result.reason || result.error
            });
        }
    }

    logBotDetection(req, detectionResults) {
        this.warn('Bot detectado', {
            ip: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            detectionResults
        });
    }

    logSecurityEvent(event, details) {
        this.error('Evento de segurança', {
            event,
            details,
            timestamp: new Date().toISOString()
        });
    }

    logPerformance(operation, duration, details = null) {
        this.debug('Métrica de performance', {
            operation,
            duration: `${duration}ms`,
            details
        });
    }

    logDatabaseOperation(operation, table, details = null) {
        this.debug('Operação de banco de dados', {
            operation,
            table,
            details
        });
    }

    logConfigurationChange(key, oldValue, newValue, user = 'system') {
        this.info('Configuração alterada', {
            key,
            oldValue,
            newValue,
            user,
            timestamp: new Date().toISOString()
        });
    }

    logAdminAction(action, user, details = null) {
        this.info('Ação administrativa', {
            action,
            user,
            details,
            timestamp: new Date().toISOString()
        });
    }

    logError(error, context = null) {
        this.error('Erro capturado', {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });
    }

    // Métodos para estatísticas
    logStatistics(stats) {
        this.info('Estatísticas atualizadas', stats);
    }

    // Métodos para monitoramento
    logSystemHealth(health) {
        this.info('Status do sistema', health);
    }

    logResourceUsage(usage) {
        this.debug('Uso de recursos', usage);
    }

    // Métodos auxiliares
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

    // Método para limpar logs antigos
    async cleanOldLogs(daysToKeep = 30) {
        try {
            const logDir = path.dirname(this.logFile);
            const files = fs.readdirSync(logDir);
            const cutoffDate = moment().subtract(daysToKeep, 'days');

            for (const file of files) {
                const filePath = path.join(logDir, file);
                const stats = fs.statSync(filePath);
                
                if (moment(stats.mtime).isBefore(cutoffDate)) {
                    fs.unlinkSync(filePath);
                    this.info(`Log antigo removido: ${file}`);
                }
            }
        } catch (error) {
            this.error('Erro ao limpar logs antigos', error);
        }
    }

    // Método para obter estatísticas de logs
    getLogStats() {
        try {
            if (!fs.existsSync(this.logFile)) {
                return { error: 0, warn: 0, info: 0, debug: 0, total: 0 };
            }

            const content = fs.readFileSync(this.logFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            const stats = { error: 0, warn: 0, info: 0, debug: 0, total: lines.length };
            
            lines.forEach(line => {
                if (line.includes('ERROR')) stats.error++;
                else if (line.includes('WARN')) stats.warn++;
                else if (line.includes('INFO')) stats.info++;
                else if (line.includes('DEBUG')) stats.debug++;
            });

            return stats;
        } catch (error) {
            this.error('Erro ao obter estatísticas de logs', error);
            return { error: 0, warn: 0, info: 0, debug: 0, total: 0 };
        }
    }

    // Método para exportar logs
    exportLogs(startDate, endDate, format = 'json') {
        try {
            if (!fs.existsSync(this.logFile)) {
                return null;
            }

            const content = fs.readFileSync(this.logFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            const filteredLines = lines.filter(line => {
                const timestamp = line.match(/\[(.*?)\]/)?.[1];
                if (!timestamp) return false;
                
                const logDate = moment(timestamp, 'YYYY-MM-DD HH:mm:ss.SSS');
                return logDate.isBetween(startDate, endDate, 'day', '[]');
            });

            if (format === 'json') {
                return filteredLines.map(line => {
                    const match = line.match(/\[(.*?)\] (\w+) - (.*)/);
                    if (match) {
                        return {
                            timestamp: match[1],
                            level: match[2],
                            message: match[3]
                        };
                    }
                    return { raw: line };
                });
            } else {
                return filteredLines.join('\n');
            }
        } catch (error) {
            this.error('Erro ao exportar logs', error);
            return null;
        }
    }
}

module.exports = Logger;
