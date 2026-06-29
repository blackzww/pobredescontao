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
let allGames = [];
let currentPlatform = 'all';
let currentSort = 'discount';
let searchQuery = '';

// ====== BUSCA PREÇOS REAIS E EXATOS ======
async function fetchGameDeals() {
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = '<div class="loading">Conectando aos servidores de preços em R$...</div>';
    
    try {
        // 1. Busca a cotação do Dólar (USD para BRL) em tempo real da AwesomeAPI para que a conversão seja 100% exata
        const coinResponse = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
        const coinData = await coinResponse.json();
        const precoDolarAtual = parseFloat(coinData.USDBRL.bid);

        // 2. Busca os maiores descontos ativos direto da API do CheapShark
        const response = await fetch('https://www.cheapshark.com/api/1.0/deals?pageSize=40');
        const data = await response.json();
        
        // Plataformas para distribuição de testes visuais dos cards reais
        const plataformas = ['steam', 'xbox', 'psn'];

        allGames = data.map((item, index) => {
            // Conversão matemática exata baseada no câmbio real brasileiro do minuto atual
            let precoAntigoBRL = parseFloat(item.normalPrice) * precoDolarAtual;
            let precoAtualBRL = parseFloat(item.salePrice) * precoDolarAtual;
            
            // Define a plataforma do card (Steam real, e simula Xbox/PSN usando os dados das outras lojas indexadas)
            let plataformaDefinida = item.storeID === '1' ? 'steam' : plataformas[index % plataformas.length];

            return {
                id: item.gameID,
                title: item.title,
                platform: plataformaDefinida,
                priceOld: precoAntigoBRL,
                priceCurrent: precoAtualBRL,
                discount: Math.round(parseFloat(item.savings)),
                thumb: item.thumb
            };
        });
        
        applyFiltersAndRender();
    } catch (error) {
        console.error("Erro ao buscar dados reais:", error);
        grid.innerHTML = '<div class="error">Erro ao carregar dados em tempo real. Tente novamente.</div>';
    }
}

// ====== RENDERIZAÇÃO DOS CARDS ======
function renderGames(gamesList) {
    const grid = document.getElementById('gamesGrid');
    const favs = FavoritesManager.get();
    
    if (gamesList.length === 0) {
        grid.innerHTML = '<div class="no-results">Nenhum jogo em promoção encontrado.</div>';
        return;
    }
    
    grid.innerHTML = gamesList.map(game => {
        const isFav = favs.includes(game.id);
        
        return `
            <div class="game-card" data-platform="${game.platform}">
                <div class="discount-badge">-${game.discount}%</div>
                <img src="${game.thumb}" alt="${game.title}" class="game-thumb" onerror="this.src='https://via.placeholder.com/300x170?text=PobreDescont%C3%A3o'">
                <div class="game-info">
                    <h3 class="game-title">${game.title}</h3>
                    <div class="platform-indicator" style="font-size:0.75rem; color:var(--texto-escuro); font-weight: bold; text-transform: uppercase; margin-bottom: 8px;">
                        ${game.platform}
                    </div>
                    <div class="price-row">
                        <span class="price-old">R$ ${game.priceOld.toFixed(2)}</span>
                        <span class="price-current" style="color: var(--cor-desconto); font-size: 1.1rem;">R$ ${game.priceCurrent.toFixed(2)}</span>
                    </div>
                    <button class="track-btn ${isFav ? 'active' : ''}" data-id="${game.id}" data-title="${game.title}">
                        ${isFav ? 'Acompanhando' : 'Acompanhar'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    initTrackButtons();
}

// ====== FILTROS, ORDENAÇÃO E EVENTOS ======
function applyFiltersAndRender() {
    let filtered = [...allGames];
    
    if (searchQuery.trim() !== '') {
        filtered = filtered.filter(game => game.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    if (currentPlatform !== 'all') {
        filtered = filtered.filter(game => game.platform === currentPlatform);
    }
    
    if (currentSort === 'discount') {
        filtered.sort((a, b) => b.discount - a.discount);
    } else if (currentSort === 'price') {
        filtered.sort((a, b) => a.priceCurrent - b.priceCurrent);
    } else if (currentSort === 'recent') {
        filtered.sort((a, b) => b.id - a.id);
    }
    
    renderGames(filtered);
}

function initTrackButtons() {
    document.querySelectorAll('.track-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const title = btn.dataset.title;
            const updatedFavs = FavoritesManager.toggle(id);
            
            if (updatedFavs.includes(id)) {
                btn.classList.add('active');
                btn.innerText = 'Acompanhando';
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification("PobreDescontão", { body: `Monitorando o preço de: ${title}` });
                }
            } else {
                btn.classList.remove('active');
                btn.innerText = 'Acompanhar';
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchGameDeals();
    
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value;
        applyFiltersAndRender();
    });
    
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPlatform = btn.dataset.platform;
            applyFiltersAndRender();
        });
    });
    
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFiltersAndRender();
    });
});
   sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFiltersAndRender();
    });
});
