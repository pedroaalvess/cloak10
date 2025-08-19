const axios = require('axios');
const Logger = require('../utils/Logger');

class ProxyManager {
    constructor() {
        this.proxies = [];
        this.currentIndex = 0;
        this.logger = new Logger();
        this.isEnabled = process.env.USE_PROXY === 'true';
        this.loadProxies();
    }

    loadProxies() {
        try {
            const proxyList = process.env.PROXY_LIST;
            if (proxyList) {
                this.proxies = proxyList.split(',').map(proxy => {
                    const [host, port, username, password] = proxy.trim().split(':');
                    return {
                        host,
                        port: parseInt(port),
                        auth: username && password ? { username, password } : undefined
                    };
                });
            }
            this.logger.info(`Carregados ${this.proxies.length} proxies`);
        } catch (error) {
            this.logger.error('Erro ao carregar proxies:', error);
        }
    }

    getNextProxy() {
        if (!this.isEnabled || this.proxies.length === 0) {
            return null;
        }

        const proxy = this.proxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        return proxy;
    }

    async testProxy(proxy) {
        try {
            const startTime = Date.now();
            const response = await axios.get('http://httpbin.org/ip', {
                proxy,
                timeout: 10000
            });
            const responseTime = Date.now() - startTime;

            return {
                working: true,
                responseTime,
                ip: response.data.origin
            };
        } catch (error) {
            return {
                working: false,
                error: error.message
            };
        }
    }

    async testAllProxies() {
        const results = [];
        for (const proxy of this.proxies) {
            const result = await this.testProxy(proxy);
            results.push({ proxy, ...result });
        }
        return results;
    }

    getProxyStats() {
        return {
            total: this.proxies.length,
            enabled: this.isEnabled,
            currentIndex: this.currentIndex
        };
    }

    addProxy(proxyString) {
        try {
            const [host, port, username, password] = proxyString.split(':');
            const proxy = {
                host,
                port: parseInt(port),
                auth: username && password ? { username, password } : undefined
            };
            this.proxies.push(proxy);
            this.logger.info(`Proxy adicionado: ${host}:${port}`);
            return true;
        } catch (error) {
            this.logger.error('Erro ao adicionar proxy:', error);
            return false;
        }
    }

    removeProxy(index) {
        if (index >= 0 && index < this.proxies.length) {
            const removed = this.proxies.splice(index, 1)[0];
            this.logger.info(`Proxy removido: ${removed.host}:${removed.port}`);
            return true;
        }
        return false;
    }

    clearProxies() {
        this.proxies = [];
        this.currentIndex = 0;
        this.logger.info('Todos os proxies foram removidos');
    }
}

module.exports = ProxyManager;
