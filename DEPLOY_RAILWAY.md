# 🚀 Deploy no Railway

## Pré-requisitos

1. Conta no [Railway](https://railway.app)
2. Git configurado
3. Node.js instalado localmente

## Passos para Deploy

### 1. Preparar o Projeto

```bash
# Clone o repositório
git clone <seu-repositorio>
cd cloak

# Instale as dependências
npm install

# Gere chaves seguras
node generate-keys.js
```

### 2. Configurar Variáveis de Ambiente

1. Acesse o [Railway Dashboard](https://railway.app/dashboard)
2. Crie um novo projeto
3. Conecte seu repositório Git
4. Vá em "Variables" e configure as seguintes variáveis:

```env
# Configurações do Servidor
PORT=3000
NODE_ENV=production

# Banco de Dados
DB_PATH=./data/cloaker.db

# Chaves de Segurança (USE AS CHAVES GERADAS!)
JWT_SECRET=sua_chave_jwt_gerada
SESSION_SECRET=sua_chave_sessao_gerada
ENCRYPTION_KEY=sua_chave_criptografia_gerada

# Configurações do Cloaker
CLOAKER_MODE=production
DEFAULT_LANDING_PAGE=https://seusite.com
SAFE_PAGE=https://seusite.com/safe

# APIs Externas (opcional)
IP_API_KEY=sua_chave_api_ip
USER_AGENT_API_URL=https://api.useragentapi.com

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/cloaker.log

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Proxies (opcional)
USE_PROXY=false
PROXY_LIST=

# Recursos Avançados
CAPTCHA_ENABLED=false
HONEYPOT_ENABLED=true
```

### 3. Deploy Automático

1. O Railway detectará automaticamente que é um projeto Node.js
2. O build será executado automaticamente
3. O servidor será iniciado com `npm start`

### 4. Verificar Deploy

1. Acesse a URL fornecida pelo Railway
2. Teste o health check: `https://seu-app.railway.app/health`
3. Acesse o painel admin: `https://seu-app.railway.app/admin`

### 5. Configurar Domínio Personalizado (Opcional)

1. Vá em "Settings" > "Domains"
2. Adicione seu domínio personalizado
3. Configure os registros DNS conforme instruído

## Credenciais Padrão

- **Usuário**: `admin`
- **Senha**: `admin123`

⚠️ **IMPORTANTE**: Altere essas credenciais após o primeiro login!

## Monitoramento

- **Logs**: Acesse "Deployments" > "View Logs"
- **Métricas**: Vá em "Metrics" para ver uso de recursos
- **Health Check**: `/health` endpoint para monitoramento

## Troubleshooting

### Erro de Build
```bash
# Verifique os logs no Railway
# Certifique-se de que todas as dependências estão no package.json
```

### Erro de Conexão
```bash
# Verifique se a porta está configurada corretamente
# Confirme se as variáveis de ambiente estão definidas
```

### Erro de Banco de Dados
```bash
# O SQLite será criado automaticamente
# Verifique se o diretório ./data tem permissões de escrita
```

## Segurança

1. **Altere as credenciais padrão**
2. **Use chaves seguras geradas**
3. **Configure HTTPS** (Railway faz automaticamente)
4. **Monitore os logs** regularmente
5. **Atualize as dependências** periodicamente

## Suporte

- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Issues do Projeto](https://github.com/seu-usuario/cloak/issues)
