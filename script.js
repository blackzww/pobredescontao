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
        // Aponta diretamente para a Serverless Function que criamos na Vercel
        // Quando estiver testando localmente use '/api/games', em produção use a URL da Vercel
        const response = await fetch('/api/games');
        allGames = await response.json();
        
        // Mapeia o formato do banco de dados para as variáveis do Front-end
        allGames = allGames.map(game => ({
            id: game.id.toString(),
            title: game.title,
            platform: game.platform,
            priceOld: parseFloat(game.price_old),
            priceCurrent: parseFloat(game.price_current),
            discount: game.discount,
            thumb: game.thumb
        }));

        applyFiltersAndRender();
    } catch (error) {
        console.error("Erro ao conectar na API PobreDescontão:", error);
        grid.innerHTML = '<div class="error">Erro ao carregar os dados reais. Verifique o banco Supabase.</div>';
    }
}

// ====== SEUS FILTROS E RENDER QUE VOCÊ JÁ TINHA ======
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

function renderGames(gamesList) {
    const grid = document.getElementById('gamesGrid');
    if (gamesList.length === 0) {
        grid.innerHTML = '<div class="no-results">Nenhum jogo encontrado.</div>';
        return;
    }
    
    grid.innerHTML = gamesList.map(game => `
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
                <button class="track-btn" data-id="${game.id}">Acompanhar</button>
            </div>
        </div>
    `).join('');
}

// Inicializadores dos eventos do input e botões permanecem os mesmos abaixo...
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
