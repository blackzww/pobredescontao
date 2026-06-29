// ====== GERENCIADOR DE FAVORITOS (LOCALSTORAGE) ======
const FavoritesManager = {
    get() {
        return JSON.parse(localStorage.getItem('pobre_descontao_favs')) || [];
    },
    toggle(gameId) {
        let favs = this.get();
        if (favs.includes(gameId)) {
            favs = favs.filter(id => id !== gameId);
        } else {
            favs.push(gameId);
            this.requestNotificationPermission();
        }
        localStorage.setItem('pobre_descontao_favs', JSON.stringify(favs));
        return favs;
    },
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
};

// ====== ESTADO GLOBAL DA APLICAÇÃO ======
let allGames = []; // Vai guardar os jogos vindos da API
let currentPlatform = 'all';
let currentSort = 'discount';
let searchQuery = '';

// ====== BUSCA DE DADOS REAL (API CHEAPSHARK) ======
async function fetchGameDeals() {
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = '<div class="loading">Carregando promoções em tempo real...</div>';
    
    try {
        // Busca as 60 melhores ofertas ativas na Steam usando a API do CheapShark
        // ID 1 no CheapShark representa a loja da Steam
        const response = await fetch('https://www.cheapshark.com/api/1.0/deals?storeID=1&pageSize=60');
        const data = await response.json();
        
        // Mapeia e padroniza os dados para o formato do PobreDescontão
        allGames = data.map(item => ({
            id: item.gameID,
            title: item.title,
            platform: 'steam', // Inicialmente mapeado como Steam
            priceOld: parseFloat(item.normalPrice),
            priceCurrent: parseFloat(item.salePrice),
            discount: Math.round(parseFloat(item.savings)),
            thumb: item.thumb
        }));
        
        applyFiltersAndRender();
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        grid.innerHTML = '<div class="error">Erro ao carregar dados. Verifique sua conexão.</div>';
    }
}

// ====== RENDERIZAÇÃO DOS CARDS NA TELA ======
function renderGames(gamesList) {
    const grid = document.getElementById('gamesGrid');
    const favs = FavoritesManager.get();
    
    if (gamesList.length === 0) {
        grid.innerHTML = '<div class="no-results">Nenhum jogo encontrado com os filtros aplicados.</div>';
        return;
    }
    
    grid.innerHTML = gamesList.map(game => {
        const isFav = favs.includes(game.id);
        // Ajuste de exibição da plataforma para o usuário
        const platformLabel = game.platform.toUpperCase();
        
        return `
            <div class="game-card" data-platform="${game.platform}">
                <div class="discount-badge">-${game.discount}%</div>
                <img src="${game.thumb}" alt="${game.title}" class="game-thumb" onerror="this.src='https://via.placeholder.com/300x170?text=Sem+Foto'">
                <div class="game-info">
                    <h3 class="game-title">${game.title}</h3>
                    <div class="platform-indicator" style="font-size:0.75rem; color:var(--texto-escuro); margin-bottom:5px;">${platformLabel}</div>
                    <div class="price-row">
                        <span class="price-old">R$ ${game.priceOld.toFixed(2)}</span>
                        <span class="price-current">R$ ${game.priceCurrent.toFixed(2)}</span>
                    </div>
                    <button class="track-btn ${isFav ? 'active' : ''}" data-id="${game.id}" data-title="${game.title}">
                        ${isFav ? 'Acompanhando' : 'Acompanhar'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Reativa os cliques dos botões "Acompanhar" recém-criados
    initTrackButtons();
}

// ====== LÓGICA DE FILTRO E ORDENAÇÃO ======
function applyFiltersAndRender() {
    let filtered = [...allGames];
    
    // 1. Filtrar por texto digitado na pesquisa
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(game => 
            game.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 2. Filtrar por plataforma selecionada nos botões
    if (currentPlatform !== 'all') {
        filtered = filtered.filter(game => game.platform === currentPlatform);
    }
    
    // 3. Aplicar ordenação do Select
    if (currentSort === 'discount') {
        filtered.sort((a, b) => b.discount - a.discount); // Maior desconto primeiro
    } else if (currentSort === 'price') {
        filtered.sort((a, b) => a.priceCurrent - b.priceCurrent); // Menor preço primeiro
    } else if (currentSort === 'recent') {
        // Como a API do CheapShark já entrega ordenado por relevância/recente por padrão,
        // mantemos a ordem original ou invertemos o ID se necessário.
        filtered.sort((a, b) => b.id - a.id);
    }
    
    renderGames(filtered);
}

// ====== CONFIGURAÇÃO DOS BOTÕES DE ACOMPANHAR ======
function initTrackButtons() {
    document.querySelectorAll('.track-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita bugar se futuramente o card inteiro for clicável
            const id = btn.dataset.id;
            const title = btn.dataset.title;
            const updatedFavs = FavoritesManager.toggle(id);
            
            if (updatedFavs.includes(id)) {
                btn.classList.add('active');
                btn.innerText = 'Acompanhando';
                sendLocalNotification("PobreDescontão", `Você começou a acompanhar: ${title}`);
            } else {
                btn.classList.remove('active');
                btn.innerText = 'Acompanhar';
            }
        });
    });
}

// ====== DISPARADOR DE NOTIFICAÇÃO DO NAVEGADOR ======
function sendLocalNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
    }
}

// ====== EVENT LISTENERS (FAZENDO AS COISAS FUNCIONAREM) ======
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Inicializa carregando os dados da API
    fetchGameDeals();
    
    // 2. Ouvinte da Barra de Pesquisa (Digitação)
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        applyFiltersAndRender();
    });
    
    // 3. Ouvinte dos Botões de Plataforma
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove classe ativa de todos e adiciona no clicado
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentPlatform = btn.dataset.platform;
            applyFiltersAndRender();
        });
    });
    
    // 4. Ouvinte do Select de Ordenação
    const sortSelect = document.getElementById('sortSelect');
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFiltersAndRender();
    });
});
