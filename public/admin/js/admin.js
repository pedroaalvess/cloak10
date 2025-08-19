// Configuração global
const API_BASE = '/api';
let currentSection = 'dashboard';
let charts = {};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Verificar autenticação
        if (!await checkAuth()) {
            window.location.href = '/admin/login';
            return;
        }

        // Configurar navegação
        setupNavigation();
        
        // Carregar dashboard inicial
        await loadDashboard();
        
        // Configurar eventos
        setupEventListeners();
        
        // Atualizar dados em tempo real
        startRealTimeUpdates();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showToast('Erro ao inicializar aplicação', 'error');
    }
}

// Autenticação
async function checkAuth() {
    try {
        const token = localStorage.getItem('admin_token');
        if (!token) return false;
        
        const response = await axios.get(`${API_BASE}/admin/verify`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        return response.data.valid;
    } catch (error) {
        return false;
    }
}

// Navegação
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const section = this.getAttribute('data-section');
            if (section) {
                switchSection(section);
            }
        });
    });
}

async function switchSection(section) {
    try {
        // Atualizar navegação
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        
        // Ocultar todas as seções
        document.querySelectorAll('.content-section').forEach(div => {
            div.style.display = 'none';
        });
        
        // Mostrar seção selecionada
        document.getElementById(`${section}-section`).style.display = 'block';
        
        // Atualizar título
        const titles = {
            dashboard: 'Dashboard',
            campaigns: 'Campanhas',
            logs: 'Logs',
            security: 'Segurança',
            settings: 'Configurações',
            statistics: 'Estatísticas'
        };
        document.getElementById('page-title').textContent = titles[section];
        
        // Carregar dados da seção
        await loadSectionData(section);
        
        currentSection = section;
        
    } catch (error) {
        console.error('Erro ao trocar seção:', error);
        showToast('Erro ao carregar seção', 'error');
    }
}

async function loadSectionData(section) {
    switch (section) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'campaigns':
            await loadCampaigns();
            break;
        case 'logs':
            await loadLogs();
            break;
        case 'security':
            await loadSecurity();
            break;
        case 'settings':
            await loadSettings();
            break;
        case 'statistics':
            await loadStatistics();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        showLoading(true);
        
        const [stats, recentRequests, activityData, countriesData] = await Promise.all([
            getDashboardStats(),
            getRecentRequests(),
            getActivityData(),
            getCountriesData()
        ]);
        
        updateDashboardStats(stats);
        updateRecentRequests(recentRequests);
        createActivityChart(activityData);
        createCountriesChart(countriesData);
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showToast('Erro ao carregar dashboard', 'error');
    } finally {
        showLoading(false);
    }
}

async function getDashboardStats() {
    const response = await axios.get(`${API_BASE}/admin/stats/dashboard`);
    return response.data;
}

async function getRecentRequests() {
    const response = await axios.get(`${API_BASE}/admin/logs/recent`);
    return response.data;
}

async function getActivityData() {
    const response = await axios.get(`${API_BASE}/admin/stats/activity`);
    return response.data;
}

async function getCountriesData() {
    const response = await axios.get(`${API_BASE}/admin/stats/countries`);
    return response.data;
}

function updateDashboardStats(stats) {
    document.getElementById('total-requests').textContent = stats.totalRequests || 0;
    document.getElementById('successful-requests').textContent = stats.successfulRequests || 0;
    document.getElementById('blocked-requests').textContent = stats.blockedRequests || 0;
    document.getElementById('bots-detected').textContent = stats.botsDetected || 0;
}

function updateRecentRequests(requests) {
    const tbody = document.getElementById('recent-requests');
    tbody.innerHTML = '';
    
    requests.forEach(request => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${request.ip}</td>
            <td>${request.campaignId || 'N/A'}</td>
            <td>
                <span class="badge badge-custom ${getStatusBadgeClass(request.status)}">
                    ${request.status}
                </span>
            </td>
            <td>${request.country || 'N/A'}</td>
            <td>${formatTimestamp(request.timestamp)}</td>
        `;
        tbody.appendChild(row);
    });
}

function createActivityChart(data) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    if (charts.activityChart) {
        charts.activityChart.destroy();
    }
    
    charts.activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Requisições',
                data: data.values,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createCountriesChart(data) {
    const ctx = document.getElementById('countriesChart').getContext('2d');
    
    if (charts.countriesChart) {
        charts.countriesChart.destroy();
    }
    
    charts.countriesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    '#3498db',
                    '#e74c3c',
                    '#2ecc71',
                    '#f39c12',
                    '#9b59b6',
                    '#1abc9c',
                    '#34495e',
                    '#e67e22'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Campanhas
async function loadCampaigns() {
    try {
        showLoading(true);
        
        const campaigns = await getCampaigns();
        updateCampaignsList(campaigns);
        
    } catch (error) {
        console.error('Erro ao carregar campanhas:', error);
        showToast('Erro ao carregar campanhas', 'error');
    } finally {
        showLoading(false);
    }
}

async function getCampaigns() {
    const response = await axios.get(`${API_BASE}/admin/campaigns`);
    return response.data;
}

function updateCampaignsList(campaigns) {
    const container = document.getElementById('campaigns-list');
    container.innerHTML = '';
    
    campaigns.forEach(campaign => {
        const card = document.createElement('div');
        card.className = 'campaign-card';
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h5>${campaign.name}</h5>
                    <p class="mb-2">ID: ${campaign.id}</p>
                    <p class="mb-2">Destino: ${campaign.targetUrl}</p>
                    <p class="mb-0">Segura: ${campaign.safeUrl}</p>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-light" onclick="editCampaign('${campaign.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCampaign('${campaign.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="campaign-stats">
                <div class="campaign-stat">
                    <div class="number">${campaign.stats?.totalRequests || 0}</div>
                    <div class="label">Total</div>
                </div>
                <div class="campaign-stat">
                    <div class="number">${campaign.stats?.successfulRequests || 0}</div>
                    <div class="label">Sucessos</div>
                </div>
                <div class="campaign-stat">
                    <div class="number">${campaign.stats?.blockedRequests || 0}</div>
                    <div class="label">Bloqueados</div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function showCreateCampaignModal() {
    const modal = new bootstrap.Modal(document.getElementById('createCampaignModal'));
    modal.show();
}

async function createCampaign() {
    try {
        const formData = {
            id: document.getElementById('campaign-id').value,
            name: document.getElementById('campaign-name').value,
            targetUrl: document.getElementById('campaign-target-url').value,
            safeUrl: document.getElementById('campaign-safe-url').value,
            description: document.getElementById('campaign-description').value
        };
        
        await axios.post(`${API_BASE}/admin/campaigns`, formData);
        
        bootstrap.Modal.getInstance(document.getElementById('createCampaignModal')).hide();
        showToast('Campanha criada com sucesso', 'success');
        
        // Limpar formulário
        document.getElementById('campaign-form').reset();
        
        // Recarregar campanhas
        await loadCampaigns();
        
    } catch (error) {
        console.error('Erro ao criar campanha:', error);
        showToast('Erro ao criar campanha', 'error');
    }
}

async function deleteCampaign(campaignId) {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) {
        return;
    }
    
    try {
        await axios.delete(`${API_BASE}/admin/campaigns/${campaignId}`);
        showToast('Campanha excluída com sucesso', 'success');
        await loadCampaigns();
    } catch (error) {
        console.error('Erro ao excluir campanha:', error);
        showToast('Erro ao excluir campanha', 'error');
    }
}

// Logs
async function loadLogs(page = 1) {
    try {
        showLoading(true);
        
        const filters = getLogFilters();
        const logs = await getLogs(filters, page);
        
        updateLogsTable(logs.data);
        updateLogsPagination(logs.pagination);
        
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
        showToast('Erro ao carregar logs', 'error');
    } finally {
        showLoading(false);
    }
}

function getLogFilters() {
    return {
        status: document.getElementById('log-status-filter').value,
        ip: document.getElementById('log-ip-filter').value,
        date: document.getElementById('log-date-filter').value
    };
}

async function getLogs(filters, page) {
    const params = new URLSearchParams({ page, ...filters });
    const response = await axios.get(`${API_BASE}/admin/logs?${params}`);
    return response.data;
}

function updateLogsTable(logs) {
    const tbody = document.getElementById('logs-table');
    tbody.innerHTML = '';
    
    logs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatTimestamp(log.timestamp)}</td>
            <td>${log.ip}</td>
            <td>${log.campaignId || 'N/A'}</td>
            <td>
                <span class="badge badge-custom ${getStatusBadgeClass(log.status)}">
                    ${log.status}
                </span>
            </td>
            <td>${log.country || 'N/A'}</td>
            <td>${log.processingTime || 0}ms</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewLogDetails(${log.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateLogsPagination(pagination) {
    const container = document.getElementById('logs-pagination');
    container.innerHTML = '';
    
    // Página anterior
    if (pagination.currentPage > 1) {
        const prevLi = document.createElement('li');
        prevLi.className = 'page-item';
        prevLi.innerHTML = `<a class="page-link" href="#" onclick="loadLogs(${pagination.currentPage - 1})">Anterior</a>`;
        container.appendChild(prevLi);
    }
    
    // Páginas
    for (let i = 1; i <= pagination.totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === pagination.currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="loadLogs(${i})">${i}</a>`;
        container.appendChild(li);
    }
    
    // Próxima página
    if (pagination.currentPage < pagination.totalPages) {
        const nextLi = document.createElement('li');
        nextLi.className = 'page-item';
        nextLi.innerHTML = `<a class="page-link" href="#" onclick="loadLogs(${pagination.currentPage + 1})">Próxima</a>`;
        container.appendChild(nextLi);
    }
}

function filterLogs() {
    loadLogs(1);
}

async function exportLogs() {
    try {
        const filters = getLogFilters();
        const response = await axios.get(`${API_BASE}/admin/logs/export`, {
            params: filters,
            responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `logs-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        showToast('Logs exportados com sucesso', 'success');
    } catch (error) {
        console.error('Erro ao exportar logs:', error);
        showToast('Erro ao exportar logs', 'error');
    }
}

async function clearLogs() {
    if (!confirm('Tem certeza que deseja limpar todos os logs? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        await axios.delete(`${API_BASE}/admin/logs`);
        showToast('Logs limpos com sucesso', 'success');
        await loadLogs();
    } catch (error) {
        console.error('Erro ao limpar logs:', error);
        showToast('Erro ao limpar logs', 'error');
    }
}

// Segurança
async function loadSecurity() {
    try {
        showLoading(true);
        
        const [blacklistedIPs, whitelistedIPs] = await Promise.all([
            getBlacklistedIPs(),
            getWhitelistedIPs()
        ]);
        
        updateBlacklistedIPs(blacklistedIPs);
        updateWhitelistedIPs(whitelistedIPs);
        
    } catch (error) {
        console.error('Erro ao carregar configurações de segurança:', error);
        showToast('Erro ao carregar configurações de segurança', 'error');
    } finally {
        showLoading(false);
    }
}

async function getBlacklistedIPs() {
    const response = await axios.get(`${API_BASE}/admin/security/blacklist`);
    return response.data;
}

async function getWhitelistedIPs() {
    const response = await axios.get(`${API_BASE}/admin/security/whitelist`);
    return response.data;
}

function updateBlacklistedIPs(ips) {
    const container = document.getElementById('blacklisted-ips-list');
    container.innerHTML = '';
    
    ips.forEach(ip => {
        const div = document.createElement('div');
        div.className = 'd-flex justify-content-between align-items-center p-2 border-bottom';
        div.innerHTML = `
            <span>${ip.ip}</span>
            <button class="btn btn-sm btn-outline-danger" onclick="removeBlacklistedIP('${ip.ip}')">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

function updateWhitelistedIPs(ips) {
    const container = document.getElementById('whitelisted-ips-list');
    container.innerHTML = '';
    
    ips.forEach(ip => {
        const div = document.createElement('div');
        div.className = 'd-flex justify-content-between align-items-center p-2 border-bottom';
        div.innerHTML = `
            <span>${ip.ip}</span>
            <button class="btn btn-sm btn-outline-danger" onclick="removeWhitelistedIP('${ip.ip}')">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

async function addBlacklistedIP() {
    const ip = document.getElementById('blacklist-ip').value.trim();
    if (!ip) return;
    
    try {
        await axios.post(`${API_BASE}/admin/security/blacklist`, { ip });
        document.getElementById('blacklist-ip').value = '';
        showToast('IP adicionado à lista negra', 'success');
        await loadSecurity();
    } catch (error) {
        console.error('Erro ao adicionar IP à lista negra:', error);
        showToast('Erro ao adicionar IP à lista negra', 'error');
    }
}

async function addWhitelistedIP() {
    const ip = document.getElementById('whitelist-ip').value.trim();
    if (!ip) return;
    
    try {
        await axios.post(`${API_BASE}/admin/security/whitelist`, { ip });
        document.getElementById('whitelist-ip').value = '';
        showToast('IP adicionado à lista branca', 'success');
        await loadSecurity();
    } catch (error) {
        console.error('Erro ao adicionar IP à lista branca:', error);
        showToast('Erro ao adicionar IP à lista branca', 'error');
    }
}

async function removeBlacklistedIP(ip) {
    try {
        await axios.delete(`${API_BASE}/admin/security/blacklist/${ip}`);
        showToast('IP removido da lista negra', 'success');
        await loadSecurity();
    } catch (error) {
        console.error('Erro ao remover IP da lista negra:', error);
        showToast('Erro ao remover IP da lista negra', 'error');
    }
}

async function removeWhitelistedIP(ip) {
    try {
        await axios.delete(`${API_BASE}/admin/security/whitelist/${ip}`);
        showToast('IP removido da lista branca', 'success');
        await loadSecurity();
    } catch (error) {
        console.error('Erro ao remover IP da lista branca:', error);
        showToast('Erro ao remover IP da lista branca', 'error');
    }
}

// Configurações
async function loadSettings() {
    try {
        showLoading(true);
        
        const settings = await getSettings();
        updateSettingsForm(settings);
        
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        showToast('Erro ao carregar configurações', 'error');
    } finally {
        showLoading(false);
    }
}

async function getSettings() {
    const response = await axios.get(`${API_BASE}/admin/settings`);
    return response.data;
}

function updateSettingsForm(settings) {
    document.getElementById('cloaker-mode').value = settings.cloaker_mode || 'advanced';
    document.getElementById('safe-page').value = settings.default_safe_page || '/safe';
    document.getElementById('max-requests').value = settings.max_requests_per_minute || 100;
    document.getElementById('bot-threshold').value = settings.bot_detection_threshold || 3;
    document.getElementById('enable-geo-blocking').checked = settings.enable_geo_blocking === 'true';
    document.getElementById('enable-referrer-check').checked = settings.enable_referrer_check === 'true';
    document.getElementById('enable-fingerprinting').checked = settings.enable_fingerprinting === 'true';
    document.getElementById('enable-proxy-rotation').checked = settings.enable_proxy_rotation === 'true';
}

function setupEventListeners() {
    // Formulário de configurações
    document.getElementById('settings-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveSettings();
    });
}

async function saveSettings() {
    try {
        const settings = {
            cloaker_mode: document.getElementById('cloaker-mode').value,
            default_safe_page: document.getElementById('safe-page').value,
            max_requests_per_minute: document.getElementById('max-requests').value,
            bot_detection_threshold: document.getElementById('bot-threshold').value,
            enable_geo_blocking: document.getElementById('enable-geo-blocking').checked.toString(),
            enable_referrer_check: document.getElementById('enable-referrer-check').checked.toString(),
            enable_fingerprinting: document.getElementById('enable-fingerprinting').checked.toString(),
            enable_proxy_rotation: document.getElementById('enable-proxy-rotation').checked.toString()
        };
        
        await axios.post(`${API_BASE}/admin/settings`, settings);
        showToast('Configurações salvas com sucesso', 'success');
        
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        showToast('Erro ao salvar configurações', 'error');
    }
}

// Estatísticas
async function loadStatistics() {
    try {
        showLoading(true);
        
        const [statusData, hourlyData] = await Promise.all([
            getStatusStatistics(),
            getHourlyStatistics()
        ]);
        
        createStatusChart(statusData);
        createHourlyChart(hourlyData);
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        showToast('Erro ao carregar estatísticas', 'error');
    } finally {
        showLoading(false);
    }
}

async function getStatusStatistics() {
    const response = await axios.get(`${API_BASE}/admin/stats/status`);
    return response.data;
}

async function getHourlyStatistics() {
    const response = await axios.get(`${API_BASE}/admin/stats/hourly`);
    return response.data;
}

function createStatusChart(data) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    if (charts.statusChart) {
        charts.statusChart.destroy();
    }
    
    charts.statusChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    '#27ae60',
                    '#e74c3c',
                    '#f39c12',
                    '#3498db'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createHourlyChart(data) {
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    
    if (charts.hourlyChart) {
        charts.hourlyChart.destroy();
    }
    
    charts.hourlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Requisições',
                data: data.values,
                backgroundColor: '#3498db'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Utilitários
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const title = document.getElementById('toast-title');
    const body = document.getElementById('toast-message');
    
    title.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    body.textContent = message;
    
    toast.className = `toast ${type === 'error' ? 'bg-danger text-white' : type === 'success' ? 'bg-success text-white' : ''}`;
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('pt-BR');
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'SUCCESS':
            return 'bg-success';
        case 'FAILED':
            return 'bg-danger';
        case 'BLOCKED':
            return 'bg-warning';
        default:
            return 'bg-secondary';
    }
}

function startRealTimeUpdates() {
    // Atualizar dashboard a cada 30 segundos
    setInterval(async () => {
        if (currentSection === 'dashboard') {
            await loadDashboard();
        }
    }, 30000);
}

function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login';
}

// Configurar interceptors do Axios
axios.interceptors.request.use(function (config) {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, function (error) {
    return Promise.reject(error);
});

axios.interceptors.response.use(function (response) {
    return response;
}, function (error) {
    if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/login';
    }
    return Promise.reject(error);
});
