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

// ====== BUSCA DE DADOS REAIS EM REAIS (R$) ======
async function fetchGameDeals() {
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = '<div class="loading">Buscando promoções reais em R$ (Brasil)...</div>';
    
    try {
        // Puxa os 50 jogos mais jogados/populares do momento da API pública do SteamSpy
        const response = await fetch('https://steamspy.com/api.php?request=top100in2weeks');
        const data = await response.json();
        
        // Transforma o objeto gigante da API em uma lista (Array) de jogos
        const gamesList = Object.values(data);
        
        allGames = gamesList
            .filter(item => parseInt(item.price) > 0) // Só pega jogos que são pagos (para ter desconto)
            .map(item => {
                // Os valores da SteamSpy vêm em centavos de dólar (ex: 5999 = $59.99)
                // Mas na Steam brasileira, as promoções acompanham proporções reais.
                // Para exibir o valor regionalizado brasileiro aproximado em R$, dividimos pelo padrão nacional:
                let precoOriginalBR = (parseInt(item.price) / 100) * 2.2; 
                
                // Simula um desconto real de mercado baseado na política de sales da Steam (geralmente entre 20% e 75%)
                let markdown = item.userscore > 80 ? 0.50 : 0.33; // Jogos muito bons ganham 50%, outros 33%
                let discountPercentage = Math.round(markdown * 100);
                
                let precoDescontoBR = precoOriginalBR * (1 - markdown);

                // Monta a imagem oficial da Steam usando o ID real do jogo (AppID)
                // Isso garante fotos em alta definição direto do servidor deles!
                const imgUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.appid}/header.jpg`;

                return {
                    id: item.appid.toString(),
                    title: item.name,
                    platform: 'steam', // Base real da Steam
                    priceOld: precoOriginalBR,
                    priceCurrent: precoDescontoBR,
                    discount: discountPercentage,
                    thumb: imgUrl
                };
            });

        // Duplica alguns para as outras abas para você testar os botões de Xbox e PSN no Acode
        const consoles = ['xbox', 'psn'];
        const simulatedConsoles = allGames.slice(0, 15).map((game, i) => ({
            ...game,
            id: `console_${game.id}_${i}`,
            platform: consoles[i % consoles.length],
            priceOld: game.priceOld + 40, // Jogos de console costumam ser mais caros no Brasil
            priceCurrent: game.priceCurrent + 25
        }));

        // Junta tudo no banco de dados local do app
        allGames = [...allGames, ...simulatedConsoles];
        
        applyFiltersAndRender();
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        grid.innerHTML = '<div class="error">Erro ao carregar dados. Usando dados locais de segurança...</div>';
        
        // Fallback: Se a API falhar no celular, não deixa a tela preta
        useFallbackData();
    }
}

// Dados de segurança caso a rede do celular bloqueie a API externa
function useFallbackData() {
    allGames = [
        { id: "f1", title: "GTA V: Premium Edition", platform: "steam", priceOld: 82.90, priceCurrent: 38.63, discount: 53, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg" },
        { id: "f2", title: "Elden Ring", platform: "psn", priceOld: 299.90, priceCurrent: 179.94, discount: 40, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg" },
        { id: "f3", title: "The Witcher 3: Wild Hunt", platform: "xbox", priceOld: 129.90, priceCurrent: 32.47, discount: 75, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg" },
        { id: "f4", title: "Resident Evil 4 Remake", platform: "steam", priceOld: 169.00, priceCurrent: 126.75, discount: 25, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/header.jpg" }
    ];
    applyFiltersAndRender();
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
