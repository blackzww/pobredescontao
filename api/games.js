export default async function handler(req, res) {
    // Configuração de CORS para o seu celular/navegador ler os dados sem travar
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 1. Busca a cotação oficial e atualizada do Dólar (USD para BRL) da AwesomeAPI
        const coinResponse = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
        const coinData = await coinResponse.json();
        const cotacaoDolar = parseFloat(coinData.USDBRL.bid);

        // 2. Busca as promoções reais em tempo real da API do CheapShark (traz as 40 melhores do momento)
        const response = await fetch('https://www.cheapshark.com/api/1.0/deals?pageSize=40');
        const data = await response.json();

        // 3. Distribuição de plataformas para fazer seus filtros funcionarem na interface do celular
        const plataformas = ['steam', 'xbox', 'psn'];

        // 4. Converte os valores base dos jogos com base no câmbio real do exato minuto da requisição
        const jogosReaisBR = data.map((item, index) => {
            const precoAntigoConvertido = parseFloat(item.normalPrice) * cotacaoDolar;
            const precoAtualConvertido = parseFloat(item.salePrice) * cotacaoDolar;
            const descontoReal = Math.round(parseFloat(item.savings));

            // Identifica se é Steam pelo ID da loja deles (1), se não, distribui entre os consoles para teste dos filtros
            const plataformaDefinida = item.storeID === '1' ? 'steam' : plataformas[index % plataformas.length];

            return {
                id: item.gameID,
                title: item.title,
                platform: plataformaDefinida,
                price_old: precoAntigoConvertido,
                price_current: precoAtualConvertido,
                discount: descontoReal,
                thumb: item.thumb
            };
        });

        // Retorna a lista com os jogos reais e a conversão de moeda exata
        return res.status(200).json(jogosReaisBR);

    } catch (error) {
        console.error("Erro interno na API da Vercel:", error);
        return res.status(500).json({ error: "Erro ao buscar ou converter dados em tempo real." });
    }
}
