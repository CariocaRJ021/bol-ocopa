const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'copa2026-key', resave: false, saveUninitialized: true }));

// 1. BANCO DE DADOS EM MEMÓRIA
const USUARIOS_CADASTRADOS = { "admin": "1234", "thiago": "1234", "sofia": "1234" };
const disputasBase = [
    { id: "GLOBAL", nome: "Bolão Geral (AMBOS)", modo: "ambos" }
];

const membrosDisputas = {
    "GLOBAL": ["thiago", "sofia", "admin"]
};

const pClassif = {}; 
const pPlacar = {};

// 2. DICIONÁRIO COMPLETO DE BANDEIRAS DA COPA 2026 (48 Seleções)
const PAISES = { 
    // Grupo A ao C
    "México": "mx", "África do Sul": "za", "Coreia do Sul": "kr", "Chéquia": "cz",
    "Canadá": "ca", "Básnia e Herzegovina": "ba", "Catar": "qa", "Suíça": "ch",
    "Brasil": "br", "Marrocos": "ma", "Haiti": "ht", "Escócia": "gb-sct",
    // Grupo D ao F
    "França": "fr", "Espanha": "es", "Tunísia": "tn", "Nova Zelândia": "nz",
    "Alemanha": "de", "Japão": "jp", "Camarões": "cm", "Honduras": "hn",
    "Argentina": "ar", "Irã": "ir", "Costa Rica": "cr", "Ucrânia": "ua",
    // Grupo G ao I
    "Inglaterra": "gb-eng", "Equador": "ec", "Nigéria": "ng", "Uzbequistão": "uz",
    "Bélgica": "be", "Austrália": "au", "Panamá": "pa", "Jamaica": "jm",
    "Itália": "it", "Uruguai": "uy", "Gana": "gh", "Omã": "om",
    // Grupo J ao L
    "Portugal": "pt", "Croácia": "hr", "Argélia": "dz", "Iraque": "iq",
    "Holanda": "nl", "Chile": "cl", "Mali": "ml", "Zâmbia": "zm",
    "Estados Unidos": "us", "Colômbia": "co", "Áustria": "at", "Peru": "pe"
};

// 3. ESTRUTURA DOS 12 GRUPOS COMPLETOS (A até L)
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

// 4. MAPEAMENTO DOS 24 JOGOS DA 1ª RODADA (2 jogos por grupo)
const PARTIDAS = [
    // Grupo A
    { id: 1, tA: "México", tB: "África do Sul", grupo: "A" },
    { id: 2, tA: "Coreia do Sul", tB: "Chéquia", grupo: "A" },
    // Grupo B
    { id: 3, tA: "Canadá", tB: "Básnia e Herzegovina", grupo: "B" },
    { id: 4, tA: "Catar", tB: "Suíça", grupo: "B" },
    // Grupo C
    { id: 5, tA: "Brasil", tB: "Marrocos", grupo: "C" },
    { id: 6, tA: "Haiti", tB: "Escócia", grupo: "C" },
    // Grupo D
    { id: 7, tA: "França", tB: "Espanha", grupo: "D" },
    { id: 8, tA: "Tunísia", tB: "Nova Zelândia", grupo: "D" },
    // Grupo E
    { id: 9, tA: "Alemanha", tB: "Japão", grupo: "E" },
    { id: 10, tA: "Camarões", tB: "Honduras", grupo: "E" },
    // Grupo F
    { id: 11, tA: "Argentina", tB: "Irã", grupo: "F" },
    { id: 12, tA: "Costa Rica", tB: "Ucrânia", grupo: "F" },
    // Grupo G
    { id: 13, tA: "Inglaterra", tB: "Equador", grupo: "G" },
    { id: 14, tA: "Nigéria", tB: "Uzbequistão", grupo: "G" },
    // Grupo H
    { id: 15, tA: "Bélgica", tB: "Austrália", grupo: "H" },
    { id: 16, tA: "Panamá", tB: "Jamaica", grupo: "H" },
    // Grupo I
    { id: 17, tA: "Itália", tB: "Uruguai", grupo: "I" },
    { id: 18, tA: "Gana", tB: "Omã", grupo: "I" },
    // Grupo J
    { id: 19, tA: "Portugal", tB: "Croácia", grupo: "J" },
    { id: 20, tA: "Argélia", tB: "Iraque", grupo: "J" },
    // Grupo K
    { id: 21, tA: "Holanda", tB: "Chile", grupo: "K" },
    { id: 22, tA: "Mali", tB: "Zâmbia", grupo: "K" },
    // Grupo L
    { id: 23, tA: "Estados Unidos", tB: "Colômbia", grupo: "L" },
    { id: 24, tA: "Áustria", tB: "Peru", grupo: "L" }
];

function badge(time) {
    const c = PAISES[time];
    return c ? `<img src="https://flagcdn.com/w40/${c}.png" style="width:22px; border-radius:4px; vertical-align:middle; margin:0 6px;">` : '';
}

function vincularAoGrupo(disputaId, usuario) {
    if (!membrosDisputas[disputaId]) { membrosDisputas[disputaId] = []; }
    if (!membrosDisputas[disputaId].includes(usuario)) { membrosDisputas[disputaId].push(usuario); }
}

// 5. ROTAS DE AUTENTICAÇÃO
app.post('/login', (req, res) => {
    const user = req.body.username.trim().toLowerCase();
    if (USUARIOS_CADASTRADOS[user] && USUARIOS_CADASTRADOS[user] === req.body.password) {
        req.session.user = user;
        const dId = req.session.convitePendente || "GLOBAL";
        req.session.dispId = dId;
        vincularAoGrupo(dId, user);
        return res.redirect('/');
    }
    res.send("<h3>Erro! Usuário ou senha inválidos. <a href='/'>Voltar</a></h3>");
});

app.post('/cadastrar', (req, res) => {
    const user = req.body.username.trim().toLowerCase();
    const pass = req.body.password;
    if (!user || !pass) { return res.send("<h3>Erro! Preencha todos os campos. <a href='/?tela=cadastro'>Voltar</a></h3>"); }
    if (USUARIOS_CADASTRADOS[user]) { return res.send("<h3>Erro! Este usuário já existe. <a href='/?tela=cadastro'>Voltar</a></h3>"); }

    USUARIOS_CADASTRADOS[user] = pass;
    req.session.user = user;
    const dId = req.session.convitePendente || "GLOBAL";
    req.session.dispId = dId;
    vincularAoGrupo("GLOBAL", user);
    vincularAoGrupo(dId, user);
    res.redirect('/');
});

// 6. ROTAS DE DISPUTAS AND PALPITES
app.post('/grupo/criar', (req, res) => {
    const codigoUnico = 'COPA-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const modoSelecionado = req.body.modo || "ambos";
    disputasBase.push({ id: codigoUnico, nome: `${req.body.nome}`, modo: modoSelecionado });
    req.session.dispId = codigoUnico;
    vincularAoGrupo(codigoUnico, req.session.user);
    res.redirect('/');
});

app.post('/grupo/entrar', (req, res) => {
    const cod = req.body.codigo.trim().toUpperCase();
    const grupoEncontrado = disputasBase.find(g => g.id === cod);
    if (grupoEncontrado) { 
        req.session.dispId = grupoEncontrado.id; 
        vincularAoGrupo(grupoEncontrado.id, req.session.user);
    }
    res.redirect('/');
});

app.post('/disputa/selecionar', (req, res) => { 
    req.session.dispId = req.body.disputaId; 
    vincularAoGrupo(req.body.disputaId, req.session.user);
    res.redirect('/'); 
});

app.post('/palpite/grupo', (req, res) => {
    const { grupo, primeiro, segundo } = req.body; 
    const dId = req.session.dispId || "GLOBAL"; const u = req.session.user;
    if (!pClassif[dId]) pClassif[dId] = {}; if (!pClassif[dId][u]) pClassif[dId][u] = {};
    pClassif[dId][u][grupo] = { primeiro, segundo };
    vincularAoGrupo(dId, u);
    res.redirect('/');
});

app.post('/palpite/placar', (req, res) => {
    const { partidaId, golA, golB } = req.body; 
    const dId = req.session.dispId || "GLOBAL"; const u = req.session.user;
    if (!pPlacar[dId]) pPlacar[dId] = {}; if (!pPlacar[dId][u]) pPlacar[dId][u] = {};
    pPlacar[dId][u][partidaId] = { golA, golB };
    vincularAoGrupo(dId, u);
    res.redirect('/');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// 7. INTERFACE VISUAL
app.get('/', (req, res) => {
    const css = `<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet"><style>body{background:#0b0f19;color:#f3f4f6;font-family:'Poppins',sans-serif;margin:0;padding:20px;}.container{max-width:1100px;margin:auto;}h2{color:#f59e0b;border-left:5px solid #10b981;padding-left:12px;font-size:18px;text-transform:uppercase;margin-top:40px; margin-bottom:20px;}.btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:8px 15px;font-weight:600;cursor:pointer;border-radius:6px;transition:0.2s;} .btn:hover{opacity:0.9;} select,input{background:#1f2937;color:#fff;border:1px solid #374151;padding:8px;border-radius:6px;}.grid{display:flex;flex-wrap:wrap;gap:15px;justify-content:center;}.card-g{background:#111827;border:1px solid #1f2937;padding:15px;border-radius:12px;width:310px;border-top:4px solid #10b981;}.card-p{background:#111827;border:1px solid #1f2937;padding:12px 15px;margin:8px 0;border-radius:12px;border-left:5px solid #f59e0b;display:flex;justify-content:space-between;align-items:center;}.row{display:flex;align-items:center;gap:10px;width:38%;}table{width:100%;border-collapse:collapse;background:#111827;border-radius:8px;overflow:hidden;}th,td{padding:12px;text-align:left;border-bottom:1px solid #1f2937;}th{background:#10b981;color:#fff;}</style>`;

    if (req.query.convite) { req.session.convitePendente = req.query.convite.trim().toUpperCase(); }

    if (!req.session.user) {
        if (req.query.tela === 'cadastro') {
            return res.send(`${css}<div style="display:flex; justify-content:center; align-items:center; min-height:90vh;"><div style="background:#111827; padding:40px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:400px; border-top:6px solid #10b981;"><h2>📝 NOVO CADASTRO</h2><form action="/cadastrar" method="POST"><input type="text" name="username" placeholder="Escolha um Usuário" required style="width:100%; margin-bottom:15px;"><br><input type="password" name="password" placeholder="Crie uma Senha" required style="width:100%; margin-bottom:20px;"><br><button type="submit" class="btn" style="width:100%;">Registrar e Entrar</button></form><p style="margin-top:20px; font-size:13px; text-align:center;"><a href="/" style="color:#f59e0b; text-decoration:none;">Já tem conta? Faça Login aqui</a></p></div></div>`);
        } else {
            return res.send(`${css}<div style="display:flex; justify-content:center; align-items:center; min-height:90vh;"><div style="background:#111827; padding:40px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:400px; border-top:6px solid #f59e0b;"><h2>🏆 ENTRAR NO BOLÃO</h2><form action="/login" method="POST"><input type="text" name="username" placeholder="Usuário" required style="width:100%; margin-bottom:15px;"><br><input type="password" name="password" placeholder="Senha" required style="width:100%; margin-bottom:20px;"><br><button type="submit" class="btn" style="width:100%;">Acessar Sistema</button></form><p style="margin-top:20px; font-size:13px; text-align:center;"><a href="/?tela=cadastro" style="color:#10b981; text-decoration:none; font-weight:bold;">Não tem uma conta? Cadastre-se aqui</a></p></div></div>`);
        }
    }

    const u = req.session.user; 
    const dId = req.session.dispId || "GLOBAL";
    const dispAtual = disputasBase.find(d => d.id === dId) || disputasBase[0];

    let htmlLinkConvite = '';
    if (dispAtual.id !== 'GLOBAL') {
        const linkCompleto = `https://meu-bolao-2026.onrender.com/?convite=${dispAtual.id}`;
        htmlLinkConvite = `
            <div style="background:#111827; border:1px solid #1f2937; padding:15px; margin-bottom:20px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:14px; color:#9ca3af;">✉️ Link de convite para este grupo:</span>
                <input type="text" value="${linkCompleto}" readonly onclick="this.select(); document.execCommand('copy'); alert('Link copiado!');" style="width:340px; color:#f59e0b; text-align:center; font-weight:bold; cursor:pointer; background:#1f2937; border:1px solid #374151; padding:4px; border-radius:4px;">
            </div>`;
    }

    let htmlTopo = `
    <div style="background:#111827; padding:20px; border-radius:12px; border:1px solid #374151; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:20px;">
        <div><h1 style="margin:0; font-size:20px;">🏆 COPA 2026 — BOLÃO</h1><p style="margin:2px 0 0 0; color:#9ca3af; font-size:13px;">Jogador: <strong style="color:#f59e0b;">${u.toUpperCase()}</strong> | <a href="/logout" style="color:#ef4444; text-decoration:none;">[Sair]</a></p></div>
        <div style="display:flex; gap:10px; align-items:center;">
            <form action="/grupo/entrar" method="POST" style="margin:0;"><input type="text" name="codigo" placeholder="Código Manual" style="padding:5px; width:110px; font-size:12px; background:#1f2937; color:#fff; border:1px solid #374151; border-radius:6px;"><button type="submit" class="btn" style="padding:5px 10px; font-size:12px; margin-left:5px;">Entrar</button></form>
            <form action="/disputa/selecionar" method="POST" style="margin:0;"><select name="disputaId" onchange="this.form.submit()" style="padding:6px; font-weight:bold; color:#f59e0b; background:#1f2937; border:1px solid #374151; border-radius:6px;">${disputasBase.map(d => `<option value="${d.id}" ${dispAtual.id===d.id?'selected':''}>${d.nome}</option>`).join('')}</select></form>
        </div>
    </div>`;

    let htmlCriadorGrupo = `
    <div style="background:#111827; border:1px solid #1f2937; padding:20px; border-radius:12px; margin-bottom:20px;">
        <h3 style="color:#f59e0b; margin:0 0 15px 0; font-size:14px; text-transform:uppercase;">➕ Criar Novo Grupo de Disputa</h3>
        <form action="/grupo/criar" method="POST" style="display:flex; gap:10px; flex-wrap:wrap; margin:0;">
            <input type="text" name="nome" placeholder="Nome do Grupo (Ex: Galera da Quadra)" required style="flex:1; min-width:200px;">
            <select name="modo" style="color:#f59e0b; font-weight:bold; background:#1f2937; border:1px solid #374151; border-radius:6px; padding:8px;">
                <option value="groups">Modo: Apenas Grupos</option>
                <option value="rounds">Modo: Apenas Rodadas</option>
                <option value="ambos">Modo: Ambos (Grupos e Rodadas)</option>
            </select>
            <button type="submit" class="btn">Criar Grupo Privado</button>
        </form>
    </div>`;

    let htmlRanking = `<h2>🏆 Classificação Geral (${dispAtual.nome})</h2><table><tr><th>Posição</th><th>Jogador</th><th>Pontos Ganhos</th></tr>`;
    const competidores = membrosDisputas[dispAtual.id] || [u];
    
    competidores.forEach((p, index) => {
        let pontos = 0;
        if (dispAtual.id === "GLOBAL") { pontos = p === "thiago" ? 12 : (p === "sofia" ? 9 : 0); }
        htmlRanking += `<tr><td><strong>${index + 1}º</strong></td><td>${p.toUpperCase()}</td><td style="color:#10b981; font-weight:bold;">${pontos} pts</td></tr>`;
    });
    htmlRanking += `</table>`;

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

    let htmlP = '';
    if (dispAtual.modo === 'rounds' || dispAtual.modo === 'ambos') {
        PARTIDAS.forEach(p => {
            const pal = (pPlacar[dispAtual.id] && pPlacar[dispAtual.id][u] && pPlacar[dispAtual.id][u][p.id]) || { golA: '', golB: '' };
            htmlP += `<div class="card-p">
                <form action="/palpite/placar" method="POST" style="display:flex; width:100%; justify-content:space-between; align-items:center; margin:0;">
                    <input type="hidden" name="partidaId" value="${p.id}">
                    <div style="font-size:11px; color:#10b981; font-weight:bold; width:50px;">GRP ${p.grupo}</div>
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
        ${htmlLinkConvite}
        ${htmlRanking}
        ${htmlG ? `<h2>1. Classificados da Fase de Grupos (A ao L)</h2><div class="grid">${htmlG}</div>` : ''}
        ${htmlP ? `<h2>2. Placares da Rodada (24 Jogos Completos)</h2><div>${htmlP}</div>` : ''}
    </div>`);
});

app.listen(PORT, () => console.log('Servidor ativo, com todos os grupos e jogos da primeira rodada!'));
