// Gerenciador de Favoritos / Acompanhamento
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

// Simulador de API para renderização inicial (Substitua pela sua lógica de Fetch futuramente)
const mockGames = [
    { id: "1", title: "Cyberpunk 2077", platform: "steam", priceOld: 199.90, priceCurrent: 99.95, discount: 50, thumb: "https://via.placeholder.com/300x170" },
    { id: "2", title: "Elden Ring", platform: "psn", priceOld: 299.90, priceCurrent: 179.94, discount: 40, thumb: "https://via.placeholder.com/300x170" },
    { id: "3", title: "Halo Infinite", platform: "xbox", priceOld: 249.00, priceCurrent: 124.50, discount: 50, thumb: "https://via.placeholder.com/300x170" }
];

// Renderizador da Interface
function renderGames(games) {
    const grid = document.getElementById('gamesGrid');
    const favs = FavoritesManager.get();
    
    grid.innerHTML = games.map(game => {
        const isFav = favs.includes(game.id);
        return `
            <div class="game-card" data-platform="${game.platform}">
                <div class="discount-badge">-${game.discount}%</div>
                <img src="${game.thumb}" alt="${game.title}" class="game-thumb">
                <div class="game-info">
                    <h3 class="game-title">${game.title}</h3>
                    <div class="price-row">
                        <span class="price-old">R$ ${game.priceOld.toFixed(2)}</span>
                        <span class="price-current">R$ ${game.priceCurrent.toFixed(2)}</span>
                    </div>
                    <button class="track-btn ${isFav ? 'active' : ''}" data-id="${game.id}">
                        ${isFav ? 'Acompanhando' : 'Acompanhar'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Adiciona eventos aos botões de Acompanhar
    document.querySelectorAll('.track-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const updatedFavs = FavoritesManager.toggle(id);
            
            // Feedback visual rápido
            if (updatedFavs.includes(id)) {
                e.target.classList.add('active');
                e.target.innerText = 'Acompanhando';
                sendLocalNotification("Sucesso!", `Você agora está acompanhando este jogo.`);
            } else {
                e.target.classList.remove('active');
                e.target.innerText = 'Acompanhar';
            }
        });
    });
}

// Disparador de Notificação Local
function sendLocalNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: './assets/icons/favicon.png' });
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    renderGames(mockGames);
});
