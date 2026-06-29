import { createClient } from '@supabase/supabase-client';

// Configuração do Supabase (Insira suas chaves do painel da Supabase aqui)
const supabase = createClient('https://jqkncyovfufgkgbmfsme.supabase.co', 'sb_publishable_Ux1pK7hw_hpoi6u67AKKeA__4i6l04w');

export default async function handler(req, res) {
    // Habilita o CORS para o seu front-end conseguir ler os dados sem travar
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Se o método for GET, nós apenas lemos o que está salvo no banco de dados de forma ultra rápida
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('jogos_promocao')
                .select('*')
                .order('discount', { ascending: false });

            if (error) throw error;
            return res.status(200).json(data);
        }

        // Se o método for POST (ou disparado por um CRON da Vercel para atualizar em tempo real)
        if (req.method === 'POST') {
            // Exemplo de como estruturar os dados 100% exatos em R$ capturados
            // Aqui você integrará scripts de scraping ou APIs parceiras brasileiras
            const ofertasExatasBR = [
                { title: "Resident Evil 4 Remake", platform: "steam", price_old: 169.00, price_current: 99.90, discount: 41, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/header.jpg" },
                { title: "Elden Ring", platform: "psn", price_old: 299.90, price_current: 179.94, discount: 40, thumb: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg" },
                { title: "Forza Horizon 5", platform: "xbox", price_old: 249.00, price_current: 99.60, discount: 60, thumb: "https://images.xbox.com/placeholder-exemplo.jpg" }
            ];

            // Limpa o banco antigo e atualiza com os novos preços reais
            await supabase.from('jogos_promocao').delete().neq('id', 0);
            const { data, error } = await supabase.from('jogos_promocao').insert(ofertasExatasBR);

            if (error) throw error;
            return res.status(200).json({ message: "Preços atualizados com sucesso no Supabase!" });
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
      }
