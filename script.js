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

// ====== ESTADO GLOBAL ======
let allGames = [];
let currentPlatform = 'all';
let currentSort = 'discount';
let searchQuery = '';

// ====== BUSCA DIRETO DA SUA NOVA API NA VERCEL ======
async function fetchGameDeals() {
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = '<div class="loading">Carregando promoções reais em R$...</div>';
    
    try {
        const response = await fetch('/api/games');
        const data = await response.json();
        
        // Mapeia garantindo tratamento de erros se algum ID ou preço vier nulo
        allGames = data.map(game => ({
            id: game.id ? game.id.toString() : Math.random().toString(),
            title: game.title || 'Jogo Sem Nome',
            platform: game.platform || 'steam',
            priceOld: parseFloat(game.price_old) || 0,
            priceCurrent: parseFloat(game.price_current) || 0,
            discount: parseInt(game.discount) || 0,
            thumb: game.thumb || 'https://via.placeholder.com/300x170?text=PobreDescontao'
        }));

        applyFiltersAndRender();
    } catch (error) {
        console.error("Erro ao conectar na API PobreDescontão:", error);
        grid.innerHTML = '<div class="error">Erro ao carregar os dados reais da API da Vercel.</div>';
    }
}

// ====== FILTROS E ORDENAÇÃO ======
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
    }
    
    renderGames(filtered);
}

// ====== RENDERIZADOR DE CARDS ======
function renderGames(gamesList) {
    const grid = document.getElementById('gamesGrid');
    const favs = FavoritesManager.get();

    if (gamesList.length === 0) {
        grid.innerHTML = '<div class="no-results">Nenhum jogo encontrado.</div>';
        return;
    }
    
    grid.innerHTML = gamesList.map(game => {
        const isFav = favs.includes(game.id);
        return `
            <div class="game-card" data-platform="${game.platform}">
                <div class="discount-badge">-${game.discount}%</div>
                <img src="${game.thumb}" alt="${game.title}" class="game-thumb" onerror="this.src='https://via.placeholder.com/300x170?text=PobreDescontao'">
                <div class="game-info">
                    <h3 class="game-title">${game.title}</h3>
                    <div class="platform-indicator" style="font-size:0.75rem; color:var(--texto-escuro); font-weight:bold; text-transform:uppercase; margin-bottom:8px;">
                        ${game.platform}
                    </div>
                    <div class="price-row">
                        <span class="price-old">R$ ${game.priceOld.toFixed(2)}</span>
                        <span class="price-current" style="color:var(--cor-desconto); font-size:1.1rem;">R$ ${game.priceCurrent.toFixed(2)}</span>
                    </div>
                    <button class="track-btn ${isFav ? 'active' : ''}" data-id="${game.id}" data-title="${game.title}">
                        ${isFav ? 'Acompanhando' : 'Acompanhar'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // ATIVA OS BOTÕES APÓS GERAR O HTML
    initTrackButtons();
}

// ====== INTERAÇÃO DOS BOTÕES ======
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
                    new Notification("PobreDescontão", { body: `Você começou a acompanhar: ${title}` });
                }
            } else {
                btn.classList.remove('active');
                btn.innerText = 'Acompanhar';
            }
        });
    });
}

// ====== INICIALIZAÇÃO ======
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
