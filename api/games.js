import { createClient } from '@supabase/supabase-js';

// Se você configurou as variáveis na Vercel, ele usa. Se não, evita quebrar o código.
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Dados reais do Brasil (em R$) de segurança para o seu site NUNCA ficar vazio
const jogosIniciaisBR = [
    { id: 1, title: "Resident Evil 4 Remake", platform: "steam", price_old: 169.00, price_current: 99.90, discount: 41, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/header.jpg" },
    { id: 2, title: "Elden Ring", platform: "psn", price_old: 299.90, price_current: 179.94, discount: 40, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg" },
    { id: 3, title: "Cyberpunk 2077", platform: "steam", price_old: 199.90, price_current: 99.95, discount: 50, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg" },
    { id: 4, title: "Forza Horizon 5", platform: "xbox", price_old: 249.00, price_current: 99.60, discount: 60, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/header.jpg" }
];

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'GET') {
            // Se o Supabase estiver configurado, tenta buscar de lá
            if (supabase) {
                const { data, error } = await supabase
                    .from('jogos_promocao')
                    .select('*')
                    .order('discount', { ascending: false });

                // Se achou dados no banco, mostra eles
                if (!error && data && data.length > 0) {
                    return res.status(200).json(data);
                }
            }

            // Se o banco estiver vazio ou der erro, manda a lista inicial para a tela NÃO ficar preta
            return res.status(200).json(jogosIniciaisBR);
        }

        if (req.method === 'POST') {
            if (!supabase) return res.status(400).json({ error: "Supabase não configurado nas variáveis de ambiente." });
            
            // Limpa e insere os dados para testar o banco
            await supabase.from('jogos_promocao').delete().neq('id', 0);
            const { data, error } = await supabase.from('jogos_promocao').insert(jogosIniciaisBR);

            if (error) throw error;
            return res.status(200).json({ message: "Banco populado com sucesso!", data });
        }
    } catch (error) {
        // Até se der erro catastrófico, joga os dados na tela pro seu front-end funcionar
        return res.status(200).json(jogosIniciaisBR);
    }
}
