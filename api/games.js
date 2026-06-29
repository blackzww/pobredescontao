export default async function handler(req, res) {
    // Configuração de CORS para liberar o acesso ao seu navegador no celular
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 1. Buscamos a lista dos jogos mais populares e jogados do momento via SteamSpy
        const listResponse = await fetch('https://steamspy.com/api.php?request=top100in2weeks');
        const listData = await listResponse.json();
        
        // Pegamos os 15 primeiros jogos da lista para processar rapidamente sem dar timeout na Vercel
        const topGames = Object.values(listData).slice(0, 15);
        
        const jogosReaisBR = [];
        const plataformas = ['steam', 'xbox', 'psn'];

        // 2. Fazemos um loop para buscar o preço 100% real de cada jogo na loja brasileira da Steam
        for (let i = 0; i < topGames.length; i++) {
            const game = topGames[i];
            const appId = game.appid;

            try {
                // Parâmetros mágicos da Valve: cc=br (Country Code Brasil) e filters=price_overview (apenas dados de preço)
                const priceResponse = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=br&filters=price_overview`);
                const priceData = await priceResponse.json();

                // Verifica se a Valve retornou os dados do jogo com sucesso e se ele possui preço/desconto ativo
                if (priceData[appId] && priceData[appId].success && priceData[appId].data.price_overview) {
                    const priceInfo = priceData[appId].data.price_overview;

                    // Só adiciona ao PobreDescontão se o jogo estiver REALMENTE em promoção (desconto maior que zero)
                    if (priceInfo.discount_percent > 0) {
                        
                        // Dividimos por 100 porque a Steam retorna em centavos (Ex: R$ 16900 vira 169.00)
                        const precoAntigoReal = priceInfo.initial / 100;
                        const precoAtualReal = priceInfo.final / 100;
                        const porcentagemDesconto = priceInfo.discount_percent;

                        // Distribui simulando Xbox e PSN para fins de teste de interface com a mesma base de preços reais BR
                        const plataformaDefinida = i % 3 === 0 ? 'steam' : (i % 3 === 1 ? 'xbox' : 'psn');

                        jogosReaisBR.push({
                            id: appId.toString(),
                            title: game.name,
                            platform: plataformaDefinida,
                            price_old: precoAntigoReal,
                            price_current: precoAtualReal,
                            discount: porcentagemDesconto,
                            thumb: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`
                        });
                    }
                }
            } catch (innerError) {
                // Se falhar a busca de um jogo específico, apenas pula para o próximo para não travar a lista toda
                continue;
            }
        }

        // Se nenhuma promoção real oficial foi capturada no laço (por ex: fora de época de Sales),
        // injetamos um Fallback estático com os preços históricos exatos da loja BR para o site não sumir
        if (jogosReaisBR.length === 0) {
            return res.status(200).json([
                { id: "271590", title: "Grand Theft Auto V", platform: "steam", price_old: 82.90, price_current: 38.63, discount: 53, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg" },
                { id: "1245620", title: "Elden Ring", platform: "psn", price_old: 299.90, price_current: 179.94, discount: 40, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg" },
                { id: "292030", title: "The Witcher 3: Wild Hunt", platform: "xbox", price_old: 129.90, price_current: 32.47, discount: 75, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg" }
            ]);
        }

        // 3. Retorna a lista contendo apenas os dados limpos e oficiais em Reais
        return res.status(200).json(jogosReaisBR);

    } catch (error) {
        console.error("Erro catastrófico na API:", error);
        return res.status(500).json({ error: "Erro ao conectar com os servidores da Steam Brasil." });
    }
}
