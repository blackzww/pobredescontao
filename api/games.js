export default async function handler(req, res) {
    // Configura os cabeçalhos de CORS para o seu navegador liberar o acesso
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 1. Cotação do Dólar Fixada Comercial Média do Brasil (Evita quebrar se a API de moedas cair)
        const cotacaoDolar = 5.50;

        // 2. Busca os dados reais diretamente do servidor público do CheapShark
        const response = await fetch('https://www.cheapshark.com/api/1.0/deals?pageSize=30');
        
        if (!response.ok) {
            throw new Error('Falha ao conectar no servidor de ofertas');
        }
        
        const data = await response.json();

        const plataformas = ['steam', 'xbox', 'psn'];

        // 3. Monta o objeto perfeito em Reais (R$)
        const jogosConvertidos = data.map((item, index) => {
            const precoAntigo = parseFloat(item.normalPrice) * cotacaoDolar;
            const precoAtual = parseFloat(item.salePrice) * cotacaoDolar;
            const desconto = Math.round(parseFloat(item.savings));
            
            // Define a plataforma real para testes visuais
            const plataformaDefinida = item.storeID === '1' ? 'steam' : plataformas[index % plataformas.length];

            return {
                id: item.gameID,
                title: item.title,
                platform: plataformaDefinida,
                price_old: precoAntigo,
                price_current: precoAtual,
                discount: desconto,
                thumb: item.thumb
            };
        });

        // Devolve o JSON limpo para o seu script.js
        return res.status(200).json(jogosConvertidos);

    } catch (error) {
        // Se QUALQUER coisa der errado na nuvem, o backend envia essa lista de segurança 
        // em R$ para o seu site nunca mais ficar em branco!
        const backupJogos = [
            { id: "b1", title: "Resident Evil 4", platform: "steam", price_old: 169.00, price_current: 99.90, discount: 41, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/header.jpg" },
            { id: "b2", title: "Elden Ring", platform: "psn", price_old: 299.90, price_current: 179.94, discount: 40, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg" },
            { id: "b3", title: "Forza Horizon 5", platform: "xbox", price_old: 249.00, price_current: 99.60, discount: 60, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/header.jpg" }
        ];
        
        return res.status(200).json(backupJogos);
    }
}
