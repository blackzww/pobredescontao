// Dados limpos de segurança em R$ para o seu front-end nunca ficar em branco
const jogosFallbackBR = [
    { id: 1, title: "Resident Evil 4 Remake", platform: "steam", price_old: 169.00, price_current: 99.90, discount: 41, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/header.jpg" },
    { id: 2, title: "Elden Ring", platform: "psn", price_old: 299.90, price_current: 179.94, discount: 40, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg" },
    { id: 3, title: "Cyberpunk 2077", platform: "steam", price_old: 199.90, price_current: 99.95, discount: 50, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg" },
    { id: 4, title: "Forza Horizon 5", platform: "xbox", price_old: 249.00, price_current: 99.60, discount: 60, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/header.jpg" }
];

export default async function handler(req, res) {
    // Configura os cabeçalhos de CORS para o navegador liberar o acesso
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Tenta carregar o Supabase de forma dinâmica para evitar travar a execução se o pacote sumir
        const { createClient } = await import('@supabase/supabase-js');
        
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_KEY;

        if (SUPABASE_URL && SUPABASE_KEY && req.method === 'GET') {
            const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
            const { data, error } = await supabase
                .from('jogos_promocao')
                .select('*')
                .order('discount', { ascending: false });

            if (!error && data && data.length > 0) {
                return res.status(200).json(data);
            }
        }
        
        // Se cair aqui (banco vazio ou sem chaves), entrega os jogos em R$ padrão
        return res.status(200).json(jogosFallbackBR);

    } catch (e) {
        // Se der erro de módulo ou qualquer outra coisa na Vercel, joga o fallback na tela!
        return res.status(200).json(jogosFallbackBR);
    }
}
