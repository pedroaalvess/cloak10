# 🛡️ Cloaker Avançado - Anti-Detectável

Um cloaker 100% eficaz e anti-detectável para Google Ads e Facebook Ads, com camuflagem avançada contra IPs, bots, crawlers e sistemas de detecção.

## ✨ Características Principais

### 🔒 Segurança Avançada
- **Detecção de Bots Inteligente**: Múltiplas técnicas de detecção
- **Fingerprinting Avançado**: Identificação única de visitantes
- **Geolocalização**: Bloqueio por país/região
- **Verificação de Referrer**: Validação de fontes de tráfego
- **Rate Limiting**: Proteção contra ataques de força bruta
- **Proxy Detection**: Identificação de IPs suspeitos

### 🎯 Funcionalidades do Cloaker
- **Redirecionamento Inteligente**: Baseado em múltiplos critérios
- **Campanhas Dinâmicas**: Gerenciamento completo de campanhas
- **URLs Seguras**: Fallback automático para páginas seguras
- **Tracking Avançado**: Parâmetros UTM e hashes de segurança
- **Cache Inteligente**: Performance otimizada

### 📊 Painel Administrativo
- **Dashboard em Tempo Real**: Estatísticas e métricas
- **Gerenciamento de Campanhas**: CRUD completo
- **Logs Detalhados**: Histórico completo de requisições
- **Configurações de Segurança**: IPs bloqueados/permitidos
- **Relatórios Avançados**: Gráficos e análises
- **Exportação de Dados**: CSV, JSON, etc.

### 🛠️ Tecnologias Utilizadas
- **Backend**: Node.js + Express
- **Banco de Dados**: SQLite (leve e eficiente)
- **Frontend**: Bootstrap 5 + Chart.js
- **Segurança**: Helmet, CORS, Rate Limiting
- **Detecção**: User-Agent parsing, GeoIP, Fingerprinting

## 🚀 Instalação

### Pré-requisitos
- Node.js 16+ 
- npm ou yarn
- Git

### Passo a Passo

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/advanced-cloaker.git
cd advanced-cloaker
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Configurações do Servidor
PORT=3000
NODE_ENV=production

# Banco de Dados
DB_PATH=./data/cloaker.db

# Segurança
JWT_SECRET=sua_chave_jwt_super_secreta_aqui
SESSION_SECRET=sua_chave_sessao_super_secreta_aqui
ENCRYPTION_KEY=sua_chave_criptografia_32_caracteres

# Configurações do Cloaker
CLOAKER_MODE=advanced
DEFAULT_LANDING_PAGE=https://seusite.com/landing
SAFE_PAGE=https://seusite.com/safe
```

4. **Inicie o servidor**
```bash
npm start
```

5. **Acesse o painel administrativo**
```
http://localhost:3000/admin
```

**Credenciais padrão:**
- Usuário: `admin`
- Senha: `admin123`

## 📖 Como Usar

### 1. Criando uma Campanha

1. Acesse o painel administrativo
2. Vá para "Campanhas"
3. Clique em "Nova Campanha"
4. Preencha os dados:
   - **ID**: Identificador único da campanha
   - **Nome**: Nome descritivo
   - **URL de Destino**: Página para tráfego legítimo
   - **URL Segura**: Página para tráfego suspeito
   - **Descrição**: Informações adicionais

### 2. Usando o Cloaker

O cloaker funciona através de URLs no formato:
```
https://seudominio.com/CAMPAIGN_ID
```

Exemplo:
```
https://seudominio.com/campanha-google-ads
```

### 3. Configurando Segurança

#### IPs Bloqueados
- Adicione IPs suspeitos à lista negra
- Útil para bloquear competidores ou bots conhecidos

#### IPs Permitidos
- Adicione IPs confiáveis à lista branca
- Esses IPs sempre passam pelo cloaker

#### Configurações Gerais
- **Modo do Cloaker**: Básico, Avançado ou Expert
- **Rate Limiting**: Máximo de requisições por minuto
- **Threshold de Bots**: Sensibilidade da detecção
- **Geolocalização**: Habilitar/desabilitar bloqueio por país

## 🔧 Configuração Avançada

### Integração com Google Ads

1. **Crie uma campanha no Google Ads**
2. **Use a URL do cloaker como destino**
3. **Configure parâmetros de tracking**

Exemplo de URL:
```
https://seudominio.com/campanha-google?utm_source=google&utm_medium=cpc&utm_campaign=produto-x
```

### Integração com Facebook Ads

1. **Crie uma campanha no Facebook Ads**
2. **Use a URL do cloaker como destino**
3. **Configure eventos de conversão**

### Configuração de Proxy (Opcional)

Para maior segurança, configure proxies:

```env
USE_PROXY=true
PROXY_LIST=proxy1.com:8080,proxy2.com:8080
```

### Configuração de SSL

Para produção, configure SSL:

```bash
# Instale o certificado SSL
npm install -g certbot

# Gere o certificado
certbot certonly --standalone -d seudominio.com

# Configure o servidor para usar HTTPS
```

## 📊 Monitoramento e Logs

### Dashboard em Tempo Real
- Total de requisições
- Taxa de sucesso
- Requisições bloqueadas
- Bots detectados
- Gráficos de atividade

### Logs Detalhados
- IP do visitante
- User Agent
- Referrer
- País/Região
- Status da requisição
- Tempo de processamento
- Detalhes da campanha

### Exportação de Dados
- Formato CSV
- Filtros por data, status, IP
- Relatórios personalizados

## 🛡️ Recursos de Segurança

### Detecção de Bots
- **User Agent Analysis**: Verificação de navegadores válidos
- **Behavioral Analysis**: Padrões de navegação
- **Fingerprinting**: Identificação única de dispositivos
- **Timing Analysis**: Intervalos entre requisições
- **Header Analysis**: Verificação de headers HTTP

### Proteção contra Crawlers
- **Known Bot Detection**: Lista de bots conhecidos
- **Pattern Matching**: Padrões suspeitos
- **Rate Limiting**: Limitação de requisições
- **Honeypot Traps**: Armadilhas para bots

### Geolocalização
- **Country Blocking**: Bloqueio por país
- **Region Filtering**: Filtros por região
- **ISP Detection**: Identificação de provedores

## 🔍 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco de dados**
```bash
# Verifique se o diretório data existe
mkdir -p data
# Reinicie o servidor
npm restart
```

2. **Erro de permissão**
```bash
# Dê permissão de escrita ao diretório
chmod 755 data logs
```

3. **Problemas de performance**
```bash
# Verifique os logs
tail -f logs/cloaker.log
# Monitore o uso de memória
htop
```

### Logs de Debug

Para ativar logs detalhados:
```env
LOG_LEVEL=debug
```

### Backup do Banco de Dados

```bash
# Backup manual
cp data/cloaker.db backup/cloaker-$(date +%Y%m%d).db

# Backup automático (cron)
0 2 * * * cp /path/to/cloaker/data/cloaker.db /path/to/backup/cloaker-$(date +\%Y\%m\%d).db
```

## 📈 Performance e Escalabilidade

### Otimizações Recomendadas

1. **Cache Redis** (Opcional)
```env
REDIS_URL=redis://localhost:6379
```

2. **Load Balancer**
```nginx
upstream cloaker {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

3. **CDN**
- Configure Cloudflare ou similar
- Ative cache para arquivos estáticos

### Monitoramento

```bash
# Instale PM2 para produção
npm install -g pm2

# Inicie com PM2
pm2 start server.js --name cloaker

# Monitore
pm2 monit
```

## 🔐 Segurança Adicional

### Firewall
```bash
# Bloqueie portas desnecessárias
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

### Fail2Ban
```bash
# Instale fail2ban
apt install fail2ban

# Configure para o cloaker
# Adicione regras específicas no jail.local
```

### SSL/TLS
```bash
# Configure HTTPS obrigatório
# Redirecione HTTP para HTTPS
# Use HSTS
```

## 📞 Suporte

### Documentação
- [Wiki do Projeto](https://github.com/seu-usuario/advanced-cloaker/wiki)
- [FAQ](https://github.com/seu-usuario/advanced-cloaker/wiki/FAQ)
- [Troubleshooting](https://github.com/seu-usuario/advanced-cloaker/wiki/Troubleshooting)

### Comunidade
- [Issues](https://github.com/seu-usuario/advanced-cloaker/issues)
- [Discussions](https://github.com/seu-usuario/advanced-cloaker/discussions)

### Contato
- Email: suporte@seudominio.com
- Telegram: @seu_usuario

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## ⚠️ Disclaimer

Este software é fornecido "como está", sem garantias. Use por sua conta e risco. O desenvolvedor não se responsabiliza por qualquer uso inadequado ou ilegal do software.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Changelog

### v1.0.0
- ✅ Sistema de detecção de bots avançado
- ✅ Painel administrativo completo
- ✅ Sistema de logs detalhado
- ✅ Configurações de segurança
- ✅ Geolocalização
- ✅ Fingerprinting
- ✅ Rate limiting
- ✅ Proteção contra crawlers

---

**Desenvolvido com ❤️ para a comunidade de marketing digital**
