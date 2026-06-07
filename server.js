const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'copa2026-key', resave: false, saveUninitialized: true }));

// 1. BANCO DE DADOS EM MEMÓRIA
const USUARIOS_CADASTRADOS = { "admin": "1234", "thiago": "1234", "sofia": "1234" };
const disputasBase = [{ id: "GLOBAL", nome: "Bolão Geral (AMBOS)", modo: "ambos" }];
const membrosDisputas = { "GLOBAL": ["thiago", "sofia", "admin"] };

const pClassif = {}; 
const pPlacar = {}; // Estrutura: pPlacar[disputaId][usuario][partidaId] = { golA, golB }

// 2. DICIONÁRIO DE BANDEIRAS
const PAISES = { 
    "México": "mx", "África do Sul": "za", "Coreia do Sul": "kr", "Chéquia": "cz",
    "Canadá": "ca", "Bósnia e Herzegovina": "ba", "Catar": "qa", "Suíça": "ch",
    "Brasil": "br", "Marrocos": "ma", "Haiti": "ht", "Escócia": "gb-sct",
    "França": "fr", "Espanha": "es", "Tunísia": "tn", "Nova Zelândia": "nz",
    "Alemanha": "de", "Japão": "jp", "Camarões": "cm", "Honduras": "hn",
    "Argentina": "ar", "Irã": "ir", "Costa Rica": "cr", "Ucrânia": "ua",
    "Inglaterra": "gb-eng", "Equador": "ec", "Nigéria": "ng", "Uzbequistão": "uz",
    "Bélgica": "be", "Austrália": "au", "Panamá": "pa", "Jamaica": "jm",
    "Itália": "it", "Uruguai": "uy", "Gana": "gh", "Omã": "om",
    "Portugal": "pt", "Croácia": "hr", "Argélia": "dz", "Iraque": "iq",
    "Holanda": "nl", "Chile": "cl", "Mali": "ml", "Zâmbia": "zm",
    "Estados Unidos": "us", "Colômbia": "co", "Áustria": "at", "Peru": "pe",
    "A definir": "un" // Bandeira genérica para jogos não decididos no mata-mata
};

const GRUPOS = { 
    A: ["México", "África do Sul", "Coreia do Sul", "Chéquia"], 
    B: ["Canadá", "Básnia e Herzegovina", "Catar", "Suíça"], 
    C: ["Brasil", "Marrocos", "Haiti", "Escócia"],
    D: ["França", "Espanha", "Tunísia", "Nova Zelândia"],
    E: ["Alemanha", "Japão", "Camarões", "Honduras"],
    F: ["Argentina", "Irã", "Costa Rica", "Ucrânia"],
    G: ["Inglaterra", "Equador", "Nigéria", "Uzbequistão"],
    H: ["Bélgica", "Austrália", "Panamá", "Jamaica"],
    I: ["Itália", "Uruguai", "Gana", "Omã"],
    J: ["Portugal", "Croácia", "Argélia", "Iraque"],
    K: ["Holanda", "Chile", "Mali", "Zâmbia"],
    L: ["Estados Unidos", "Colômbia", "Áustria", "Peru"]
};

// 3. JOGOS ORGANIZADOS POR TODAS AS FASES DO TORNEIO
const PARTIDAS = [
    // --- FASE DE GRUPOS: RODADA 1 ---
    { id: 1, tA: "México", tB: "África do Sul", grupo: "A", fase: "r1" },
    { id: 2, tA: "Coreia do Sul", tB: "Chéquia", grupo: "A", fase: "r1" },
    { id: 3, tA: "Canadá", tB: "Básnia e Herzegovina", grupo: "B", fase: "r1" },
    { id: 4, tA: "Catar", tB: "Suíça", grupo: "B", fase: "r1" },
    { id: 5, tA: "Brasil", tB: "Marrocos", grupo: "C", fase: "r1" },
    { id: 6, tA: "Haiti", tB: "Escócia", grupo: "C", fase: "r1" },

    // --- FASE DE GRUPOS: RODADA 2 ---
    { id: 25, tA: "México", tB: "Coreia do Sul", grupo: "A", fase: "r2" },
    { id: 26, tA: "África do Sul", tB: "Chéquia", grupo: "A", fase: "r2" },
    { id: 27, tA: "Canadá", tB: "Catar", grupo: "B", fase: "r2" },
    { id: 28, tA: "Básnia e Herzegovina", tB: "Suíça", grupo: "B", fase: "r2" },
    { id: 29, tA: "Brasil", tB: "Haiti", grupo: "C", fase: "r2" },
    { id: 30, tA: "Marrocos", tB: "Escócia", grupo: "C", fase: "r2" },

    // --- FASE DE GRUPOS: RODADA 3 ---
    { id: 49, tA: "Chéquia", tB: "México", grupo: "A", fase: "r3" },
    { id: 50, tA: "África do Sul", tB: "Coreia do Sul", grupo: "A", fase: "r3" },
    { id: 51, tA: "Suíça", tB: "Canadá", grupo: "B", fase: "r3" },
    { id: 52, tA: "Básnia e Herzegovina", tB: "Catar", grupo: "B", fase: "r3" },
    { id: 53, tA: "Escócia", tB: "Brasil", grupo: "C", fase: "r3" },
    { id: 54, tA: "Marrocos", tB: "Haiti", grupo: "C", fase: "r3" },

    // --- MATA-MATA: 16 AVOS DE FINAL (Exemplo de cruzamentos simulados)
    { id: 73, tA: "México", tB: "Suíça", grupo: "Mata-Mata", fase: "16avos" },
    { id: 74, tA: "Brasil", tB: "Básnia e Herzegovina", grupo: "Mata-Mata", fase: "16avos" },
    { id: 75, tA: "França", tB: "Japão", grupo: "Mata-Mata", fase: "16avos" },
    { id: 76, tA: "Argentina", tB: "Equador", grupo: "Mata-Mata", fase: "16avos" },

    // --- MATA-MATA: OITAVAS DE FINAL ---
    { id: 89, tA: "A definir", tB: "A definir", grupo: "Mata-Mata", fase: "oitavas" },
    { id: 90, tA: "A definir", tB: "A definir", grupo: "Mata-Mata", fase: "oitavas" },

    // --- MATA-MATA: QUARTAS DE FINAL ---
    { id: 97, tA: "A definir", tB: "A definir", grupo: "Mata-Mata", fase: "quartas" },
    { id: 98, tA: "A definir", tB: "A definir", grupo: "Mata-Mata", fase: "quartas" },

    // --- MATA-MATA: SEMIFINAIS ---
    { id: 101, tA: "A definir", tB: "A definir", grupo: "Mata-Mata", fase: "semis" },
    { id: 102, tA: "A definir", tB: "A definir", grupo: "Mata-Mata", fase: "semis" },

    // --- GRAND FINAL ---
    { id: 104, tA: "A definir", tB: "A definir", grupo: "Mata-Mata", fase: "final" }
];

// Nomes amigáveis das fases para renderização
const NOMES_FASES = {
    "r1": "Fase de Grupos - 1ª Rodada",
    "r2": "Fase de Grupos - 2ª Rodada",
    "r3": "Fase de Grupos - 3ª Rodada",
    "16avos": "Dezesseis-avos de Final (Novo)",
    "oitavas": "Oitavas de Final",
    "quartas": "Quartas de Final",
    "semis": "Semifinais",
    "final": "Grande Final"
};

function badge(time) {
    const c = PAISES[time] || "un";
    return `<img src="https://flagcdn.com/w40/${c}.png" style="width:22px; border-radius:4px; vertical-align:middle; margin:0 6px;">`;
}

function vincularAoGrupo(disputaId, usuario) {
    if (!membrosDisputas[disputaId]) { membrosDisputas[disputaId] = []; }
    if (!membrosDisputas[disputaId].includes(usuario)) { membrosDisputas[disputaId].push(usuario); }
}

// ROTAS PADRÃO (LOGIN/CADASTRO/CRIAR)
app.post('/login', (req, res) => {
    const user = req.body.username.trim().toLowerCase();
    if (USUARIOS_CADASTRADOS[user] && USUARIOS_CADASTRADOS[user] === req.body.password) {
        req.session.user = user;
        req.session.dispId = req.session.convitePendente || "GLOBAL";
        req.session.faseAtiva = "r1"; // Inicia na rodada 1 por padrão
        vincularAoGrupo(req.session.dispId, user);
        return res.redirect('/');
    }
    res.send("<h3>Erro! Usuário ou senha inválidos. <a href='/'>Voltar</a></h3>");
});

app.post('/cadastrar', (req, res) => {
    const user = req.body.username.trim().toLowerCase();
    const pass = req.body.password;
    if (!user || !pass) return res.redirect('/');
    USUARIOS_CADASTRADOS[user] = pass;
    req.session.user = user;
    req.session.dispId = "GLOBAL";
    req.session.faseAtiva = "r1";
    vincularAoGrupo("GLOBAL", user);
    res.redirect('/');
});

app.post('/grupo/criar', (req, res) => {
    const codigoUnico = 'COPA-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const modoSelecionado = req.body.modo || "ambos";
    disputasBase.push({ id: codigoUnico, nome: req.body.nome, modo: modoSelecionado });
    req.session.dispId = codigoUnico;
    vincularAoGrupo(codigoUnico, req.session.user);
    res.redirect('/');
});

app.post('/disputa/selecionar', (req, res) => { 
    req.session.dispId = req.body.disputaId; 
    res.redirect('/'); 
});

// NOVA ROTA: Alterar a Fase Ativa de Visualização de Rodadas
app.post('/fase/selecionar', (req, res) => {
    req.session.faseAtiva = req.body.faseId;
    res.redirect('/');
});

app.post('/palpite/grupo', (req, res) => {
    const { grupo, primeiro, segundo } = req.body; 
    const dId = req.session.dispId || "GLOBAL"; const u = req.session.user;
    if (!pClassif[dId]) pClassif[dId] = {}; if (!pClassif[dId][u]) pClassif[dId][u] = {};
    pClassif[dId][u][grupo] = { primeiro, segundo };
    res.redirect('/');
});

app.post('/palpite/placar', (req, res) => {
    const { partidaId, golA, golB } = req.body; 
    const dId = req.session.dispId || "GLOBAL"; const u = req.session.user;
    if (!pPlacar[dId]) pPlacar[dId] = {}; if (!pPlacar[dId][u]) pPlacar[dId][u] = {};
    pPlacar[dId][u][partidaId] = { golA, golB };
    res.redirect('/');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// INTERFACE VISUAL
app.get('/', (req, res) => {
    const css = `<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet"><style>body{background:#0b0f19;color:#f3f4f6;font-family:'Poppins',sans-serif;margin:0;padding:20px;}.container{max-width:1100px;margin:auto;}h2{color:#f59e0b;border-left:5px solid #10b981;padding-left:12px;font-size:18px;text-transform:uppercase;margin-top:40px; margin-bottom:20px;}.btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:8px 15px;font-weight:600;cursor:pointer;border-radius:6px;transition:0.2s;} .btn:hover{opacity:0.9;} select,input{background:#1f2937;color:#fff;border:1px solid #374151;padding:8px;border-radius:6px;}.grid{display:flex;flex-wrap:wrap;gap:15px;justify-content:center;}.card-g{background:#111827;border:1px solid #1f2937;padding:15px;border-radius:12px;width:310px;border-top:4px solid #10b981;}.card-p{background:#111827;border:1px solid #1f2937;padding:12px 15px;margin:8px 0;border-radius:12px;border-left:5px solid #f59e0b;display:flex;justify-content:space-between;align-items:center;}.row{display:flex;align-items:center;gap:10px;width:38%;}table{width:100%;border-collapse:collapse;background:#111827;border-radius:8px;overflow:hidden;}th,td{padding:12px;text-align:left;border-bottom:1px solid #1f2937;}th{background:#10b981;color:#fff;}</style>`;

    if (!req.session.user) {
        return res.send(`${css}<div style="display:flex; justify-content:center; align-items:center; min-height:90vh;"><div style="background:#111827; padding:40px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:400px; border-top:6px solid #f59e0b;"><h2>🏆 ENTRAR NO BOLÃO</h2><form action="/login" method="POST"><input type="text" name="username" placeholder="Usuário" required style="width:100%; margin-bottom:15px;"><br><input type="password" name="password" placeholder="Senha" required style="width:100%; margin-bottom:20px;"><br><button type="submit" class="btn" style="width:100%;">Acessar Sistema</button></form></div></div>`);
    }

    const u = req.session.user; 
    const dId = req.session.dispId || "GLOBAL";
    const faseAtiva = req.session.faseAtiva || "r1";
    const dispAtual = disputasBase.find(d => d.id === dId) || disputasBase[0];

    let htmlTopo = `
    <div style="background:#111827; padding:20px; border-radius:12px; border:1px solid #374151; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:20px;">
        <div><h1 style="margin:0; font-size:20px;">🏆 COPA 2026 — BOLÃO</h1><p style="margin:2px 0 0 0; color:#9ca3af; font-size:13px;">Jogador: <strong style="color:#f59e0b;">${u.toUpperCase()}</strong> | <a href="/logout" style="color:#ef4444; text-decoration:none;">[Sair]</a></p></div>
        <div style="display:flex; gap:10px; align-items:center;">
            <form action="/disputa/selecionar" method="POST" style="margin:0;"><select name="disputaId" onchange="this.form.submit()" style="padding:6px; font-weight:bold; color:#f59e0b; background:#1f2937; border:1px solid #374151; border-radius:6px;">${disputasBase.map(d => `<option value="${d.id}" ${dispAtual.id===d.id?'selected':''}>${d.nome}</option>`).join('')}</select></form>
        </div>
    </div>`;

    let htmlCriadorGrupo = `
    <div style="background:#111827; border:1px solid #1f2937; padding:20px; border-radius:12px; margin-bottom:20px;">
        <h3 style="color:#f59e0b; margin:0 0 15px 0; font-size:14px; text-transform:uppercase;">➕ Criar Novo Grupo de Disputa</h3>
        <form action="/grupo/criar" method="POST" style="display:flex; gap:10px; flex-wrap:wrap; margin:0;">
            <input type="text" name="nome" placeholder="Nome do Grupo" required style="flex:1; min-width:200px;">
            <select name="modo" style="color:#f59e0b; font-weight:bold; background:#1f2937; border:1px solid #374151; border-radius:6px; padding:8px;">
                <option value="groups">Modo: Apenas Grupos</option>
                <option value="rounds">Modo: Apenas Rodadas</option>
                <option value="ambos">Modo: Ambos (Grupos e Rodadas)</option>
            </select>
            <button type="submit" class="btn">Criar Grupo Privado</button>
        </form>
    </div>`;

    // Filtro de Fase (Menu de Navegação das Rodadas)
    let htmlSeletorFases = '';
    if (dispAtual.modo === 'rounds' || dispAtual.modo === 'ambos') {
        htmlSeletorFases = `
        <div style="background:#111827; border:1px solid #1f2937; padding:15px; margin-bottom:20px; border-radius:12px; display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
            <span style="font-size:14px; font-weight:bold; color:#9ca3af;">📅 Escolha a Fase para Palpitar:</span>
            <form action="/fase/selecionar" method="POST" style="margin:0; display:inline-block;">
                <select name="faseId" onchange="this.form.submit()" style="color:#10b981; font-weight:bold; background:#1f2937; border:1px solid #374151; border-radius:6px; padding:8px; font-size:14px;">
                    ${Object.keys(NOMES_FASES).map(fId => `<option value="${fId}" ${faseAtiva===fId?'selected':''}>${NOMES_FASES[fId]}</option>`).join('')}
                </select>
            </form>
        </div>`;
    }

    let htmlRanking = `<h2>🏆 Classificação Geral (${dispAtual.nome})</h2><table><tr><th>Posição</th><th>Jogador</th><th>Pontos Ganhos</th></tr>`;
    const competidores = membrosDisputas[dispAtual.id] || [u];
    competidores.forEach((p, index) => {
        let pontos = 0;
        if (dispAtual.id === "GLOBAL") { pontos = p === "thiago" ? 12 : (p === "sofia" ? 9 : 0); }
        htmlRanking += `<tr><td><strong>${index + 1}º</strong></td><td>${p.toUpperCase()}</td><td style="color:#10b981; font-weight:bold;">${pontos} pts</td></tr>`;
    });
    htmlRanking += `</table>`;

    // Renderização da Fase de Grupos Estática (Classificados diretos)
    let htmlG = '';
    if (dispAtual.modo === 'groups' || dispAtual.modo === 'ambos') {
        Object.keys(GRUPOS).forEach(g => {
            const pal = (pClassif[dispAtual.id] && pClassif[dispAtual.id][u] && pClassif[dispAtual.id][u][g]) || { primeiro: '', segundo: '' };
            htmlG += `<div class="card-g" style="margin-bottom:15px;">
                <h3 style="color:#10b981; margin:0 0 10px 0;">Grupo ${g}</h3>
                ${GRUPOS[g].map(t => `<div style="margin:4px 0; font-size:14px;">${badge(t)} ${t}</div>`).join('')}
                <form action="/palpite/grupo" method="POST" style="margin-top:15px;">
                    <input type="hidden" name="grupo" value="${g}">
                    <select name="primeiro" style="width:100%; margin-bottom:5px; background:#1f2937; color:#fff; border:1px solid #374151; padding:5px; border-radius:4px;"><option value="">1º Lugar</option>${GRUPOS[g].map(t => `<option value="${t}" ${pal.primeiro===t?'selected':''}>${t}</option>`).join('')}</select>
                    <select name="segundo" style="width:100%; margin-bottom:10px; background:#1f2937; color:#fff; border:1px solid #374151; padding:5px; border-radius:4px;"><option value="">2º Lugar</option>${GRUPOS[g].map(t => `<option value="${t}" ${pal.segundo===t?'selected':''}>${t}</option>`).join('')}</select>
                    <button type="submit" class="btn" style="width:100%; padding:4px; font-size:12px;">Salvar Grupo</button>
                </form>
            </div>`;
        });
    }

    // Renderização Dinâmica por Rodada Selecionada
    let htmlP = '';
    if (dispAtual.modo === 'rounds' || dispAtual.modo === 'ambos') {
        // Filtra apenas os jogos correspondentes à fase que o usuário selecionou no menu dropdown
        const jogosFase = PARTIDAS.filter(p => p.fase === faseAtiva);
        
        jogosFase.forEach(p => {
            const pal = (pPlacar[dispAtual.id] && pPlacar[dispAtual.id][u] && pPlacar[dispAtual.id][u][p.id]) || { golA: '', golB: '' };
            htmlP += `<div class="card-p">
                <form action="/palpite/placar" method="POST" style="display:flex; width:100%; justify-content:space-between; align-items:center; margin:0;">
                    <input type="hidden" name="partidaId" value="${p.id}">
                    <div style="font-size:11px; color:#10b981; font-weight:bold; width:80px;">${p.grupo.toUpperCase()}</div>
                    <div class="row" style="justify-content:flex-end; text-align:right;"><span>${p.tA}</span> ${badge(p.tA)}</div>
                    <div style="display:flex; align-items:center; gap:5px;"><input type="number" name="golA" value="${pal.golA}" style="width:45px; text-align:center; background:#1f2937; color:#fff; border:1px solid #374151; border-radius:4px;"><span>X</span><input type="number" name="golB" value="${pal.golB}" style="width:45px; text-align:center; background:#1f2937; color:#fff; border:1px solid #374151; border-radius:4px;"></div>
                    <div class="row">${badge(p.tB)} <span>${p.tB}</span></div>
                    <button type="submit" class="btn" style="padding:4px 10px; font-size:12px;">Salvar</button>
                </form>
            </div>`;
        });
    }

    res.send(`${css}<div class="container">
        ${htmlTopo}
        ${htmlCriadorGrupo}
        ${htmlSeletorFases}
        ${htmlRanking}
        ${htmlG ? `<h2>1. Classificados da Fase de Grupos</h2><div class="grid">${htmlG}</div>` : ''}
        ${htmlP ? `<h2>2. Placares da Rodada — ${NOMES_FASES[faseAtiva]}</h2><div>${htmlP}</div>` : ''}
    </div>`);
});

app.listen(PORT, () => console.log('Servidor ativo com sistema de fases completo rodando!'));
