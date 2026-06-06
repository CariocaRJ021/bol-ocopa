const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'copa2026-key', resave: false, saveUninitialized: true }));

// 1. BANCO DE DADOS EM MEMÓRIA (Seus amigos vão se auto-cadastrar aqui dentro agora!)
const USUARIOS_CADASTRADOS = { "admin": "1234", "thiago": "1234", "sofia": "1234" };
const disputasBase = [{ id: "GLOBAL", nome: "Bolão Geral (AMBOS)", modo: "ambos" }];
const pClassif = {}; 
const pPlacar = {};
const RESULTADOS_REAIS = {};

// 2. MAPA DE BANDEIRAS (48 SELEÇÕES DA COPA 2026)
const PAISES = {
    "Estados Unidos": "us", "México": "mx", "Canadá": "ca", "Brasil": "br", "Argentina": "ar", "França": "fr",
    "Inglaterra": "gb-eng", "Espanha": "es", "Alemanha": "de", "Itália": "it", "Portugal": "pt", "Holanda": "nl",
    "Bélgica": "be", "Croácia": "hr", "Marrocos": "ma", "Japão": "jp", "Coreia do Sul": "kr", "Austrália": "au",
    "Senegal": "sn", "Tunísia": "tn", "Argélia": "dz", "Uruguai": "uy", "Colômbia": "co", "Equador": "ec",
    "Peru": "pe", "Chile": "cl", "Paraguai": "py", "Venezuela": "ve", "Jamaica": "jm", "Costa Rica": "cr",
    "Panamá": "pa", "Honduras": "hn", "Gana": "gh", "Camarões": "cm", "Nigéria": "ng", "Egito": "eg",
    "Irã": "ir", "Arábia Saudita": "sa", "Catar": "qa", "Iraque": "iq", "Uzbequistão": "uz", "Ucrânia": "ua",
    "Polônia": "pl", "Chéquia": "cz", "Suécia": "se", "Suíça": "ch", "África do Sul": "za", "Nova Zelândia": "nz"
};

// 3. ESTRUTURA DOS 12 GRUPOS DA COPA 2026
const GRUPOS = {
    A: ["Estados Unidos", "Jamaica", "Ucrânia", "África do Sul"],
    B: ["México", "Costa Rica", "Polônia", "Tunísia"],
    C: ["Canadá", "Panamá", "Chéquia", "Argélia"],
    D: ["Brasil", "Equador", "Suécia", "Egito"],
    E: ["Argentina", "Paraguai", "Suíça", "Gana"],
    F: ["França", "Venezuela", "Colômbia", "Nigéria"],
    G: ["Inglaterra", "Chile", "Irã", "Camarões"],
    H: ["Espanha", "Peru", "Arábia Saudita", "Austrália"],
    I: ["Alemanha", "Uruguai", "Catar", "Uzbequistão"],
    J: ["Itália", "Honduras", "Iraque", "Nova Zelândia"],
    K: ["Portugal", "Bélgica", "Holanda", "Senegal"],
    L: ["Croácia", "Marrocos", "Japão", "Coreia do Sul"]
};

// 4. GERAÇÃO AUTOMÁTICA DOS JOGOS
const PARTIDAS = [];
let idJogo = 1;
Object.keys(GRUPOS).forEach(g => {
    const t = GRUPOS[g];
    PARTIDAS.push({ id: idJogo++, tA: t[0], tB: t[1], grupo: g, rodada: 1 });
    PARTIDAS.push({ id: idJogo++, tA: t[2], tB: t[3], grupo: g, rodada: 1 });
    PARTIDAS.push({ id: idJogo++, tA: t[0], tB: t[2], grupo: g, rodada: 2 });
    PARTIDAS.push({ id: idJogo++, tA: t[1], tB: t[3], grupo: g, rodada: 2 });
    PARTIDAS.push({ id: idJogo++, tA: t[3], tB: t[0], grupo: g, rodada: 3 });
    PARTIDAS.push({ id: idJogo++, tA: t[1], tB: t[2], grupo: g, rodada: 3 });
});

function badge(time) {
    const c = PAISES[time];
    return c ? `<img src="https://flagcdn.com/w40/${c}.png" style="width:26px; border-radius:4px; vertical-align:middle; margin:0 6px;">` : '';
}

function calcularPontosUsuario(usuario, disputaId) {
    let pontosTotais = 0;
    const palpitesDoGrupo = pPlacar[disputaId] && pPlacar[disputaId][usuario];
    if (!palpitesDoGrupo) return 0;

    Object.keys(RESULTADOS_REAIS).forEach(pId => {
        const real = RESULTADOS_REAIS[pId];
        const palpite = palpitesDoGrupo[pId];
        if (palpite && palpite.golA !== '' && palpite.golB !== '') {
            const gA_real = parseInt(real.golA); const gB_real = parseInt(real.golB);
            const gA_pal = parseInt(palpite.golA); const gB_pal = parseInt(palpite.golB);
            if (gA_real === gA_pal && gB_real === gB_pal) { pontosTotais += 25; } 
            else if ((gA_real > gB_real && gA_pal > gB_pal) || (gA_real < gB_real && gA_pal < gB_pal) || (gA_real === gB_real && gA_pal === gB_pal)) { pontosTotais += 10; }
        }
    });
    return pontosTotais;
}

// 5. ROTAS DE AUTENTICAÇÃO (LOGIN E NOVO CADASTRO)
app.post('/login', (req, res) => {
    const user = req.body.username.trim().toLowerCase();
    if (USUARIOS_CADASTRADOS[user] && USUARIOS_CADASTRADOS[user] === req.body.password) {
        req.session.user = user;
        req.session.dispId = req.session.convitePendente || "GLOBAL";
        return res.redirect('/');
    }
    res.send("<h3>Usuário ou senha incorretos. <a href='/'>Voltar</a></h3>");
});

app.post('/cadastrar', (req, res) => {
    const user = req.body.username.trim().toLowerCase();
    const pass = req.body.password;

    if (!user || !pass) {
        return res.send("<h3>Usuário ou senha inválidos. <a href='/'>Voltar</a></h3>");
    }
    if (USUARIOS_CADASTRADOS[user]) {
        return res.send("<h3>Este nome de usuário já está em uso! Escolha outro. <a href='/'>Voltar</a></h3>");
    }

    // Adiciona o amigo no banco de dados temporário
    USUARIOS_CADASTRADOS[user] = pass;
    
    // Loga ele automaticamente após cadastrar
    req.session.user = user;
    req.session.dispId = req.session.convitePendente || "GLOBAL";
    res.redirect('/');
});

app.post('/grupo/criar', (req, res) => {
    const codigoUnico = 'COPA-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    disputasBase.push({ id: codigoUnico, nome: req.body.nome, modo: req.body.modo });
    req.session.dispId = codigoUnico;
    res.redirect('/');
});

app.post('/grupo/entrar', (req, res) => {
    const cod = req.body.codigo.trim().toUpperCase();
    const grupoEncontrado = disputasBase.find(g => g.id === cod);
    if (grupoEncontrado) { req.session.dispId = grupoEncontrado.id; }
    res.redirect('/');
});

app.post('/disputa/selecionar', (req, res) => { req.session.dispId = req.body.disputaId; res.redirect('/'); });

app.post('/palpite/grupo', (req, res) => {
    const { grupo, primeiro, segundo } = req.body; const dId = req.session.dispId; const u = req.session.user;
    if (!pClassif[dId]) pClassif[dId] = {}; if (!pClassif[dId][u]) pClassif[dId][u] = {};
    pClassif[dId][u][grupo] = { primeiro, segundo }; res.redirect('/');
});

app.post('/palpite/placar', (req, res) => {
    const { partidaId, golA, golB } = req.body; const dId = req.session.dispId; const u = req.session.user;
    if (!pPlacar[dId]) pPlacar[dId] = {}; if (!pPlacar[dId][u]) pPlacar[dId][u] = {};
    pPlacar[dId][u][partidaId] = { golA, golB }; res.redirect('/');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

app.get('/', (req, res) => {
    const css = `<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet"><style>body{background:#0b0f19;color:#f3f4f6;font-family:'Poppins',sans-serif;margin:0;padding:20px;}.container{max-width:1100px;margin:auto;}h2{color:#f59e0b;border-left:5px solid #10b981;padding-left:12px;font-size:18px;text-transform:uppercase;margin-top:40px;margin-bottom:15px;}.btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:8px 15px;font-weight:600;cursor:pointer;border-radius:6px;}select,input{background:#1f2937;color:#fff;border:1px solid #374151;padding:8px;border-radius:6px;}.grid{display:flex;flex-wrap:wrap;gap:15px;justify-content:center;}.card-g{background:#111827;border:1px solid #1f2937;padding:15px;border-radius:12px;width:240px;border-top:4px solid #10b981;}.card-p{background:#111827;border:1px solid #1f2937;padding:12px 15px;margin:8px 0;border-radius:12px;border-left:5px solid #f59e0b;display:flex;justify-content:space-between;align-items:center;}.row{display:flex;align-items:center;gap:10px;width:38%;}table{width:100%;border-collapse:collapse;background:#111827;border-radius:8px;overflow:hidden;}th,td{padding:12px;text-align:left;border-bottom:1px solid #1f2937;}th{background:#10b981;color:#fff;}.aba-container{display:flex;gap:10px;margin-top:20px;margin-bottom:10px;}.aba{background:#1f2937;padding:8px 16px;border-radius:6px;cursor:pointer;color:#9ca3af;text-decoration:none;font-weight:600;}.aba.ativa{background:#10b981;color:#fff;}</style>`;

    if (req.query.convite) { req.session.convitePendente = req.query.convite.trim().toUpperCase(); }

    // TELA INICIAL INTEGRADA: LOGIN + SISTEMA DE CADASTRO PARA AMIGOS
    if (!req.session.user) {
        return res.send(`${css}
        <div style="display:flex; flex-wrap:wrap; justify-content:center; align-items:center; min-height:90vh; gap:30px; padding:20px;">
            <div style="background:#111827; padding:40px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:360px; border-top:6px solid #f59e0b;">
                <h2 style="margin-top:0;">🔑 ENTRAR NO BOLÃO</h2>
                <form action="/login" method="POST">
                    <input type="text" name="username" placeholder="Nome de Usuário" required style="width:100%; margin-bottom:15px;">
                    <input type="password" name="password" placeholder="Sua Senha" required style="width:100%; margin-bottom:20px;">
                    <button type="submit" class="btn" style="width:100%;">Acessar Conta</button>
                </form>
            </div>
            
            <div style="background:#111827; padding:40px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:360px; border-top:6px solid #10b981;">
                <h2 style="margin-top:0; color:#10b981; border-left:5px solid #f59e0b;">✨ CRIAR NOVA CONTA</h2>
                <p style="font-size:12px; color:#9ca3af; margin-bottom:15px;">Ainda não tem acesso? Escolha um nome de usuário e senha para começar a palpitar!</p>
                <form action="/cadastrar" method="POST">
                    <input type="text" name="username" placeholder="Escolha um Usuário (Ex: ronaldo)" required style="width:100%; margin-bottom:15px;">
                    <input type="password" name="password" placeholder="Crie uma Senha" required style="width:100%; margin-bottom:20px;">
                    <button type="submit" class="btn" style="width:100%; background:linear-gradient(135deg,#10b981,#059669);">Cadastrar e Entrar</button>
                </form>
            </div>
        </div>`);
    }

    const u = req.session.user; 
    const dId = req.session.dispId;
    const dispAtual = disputasBase.find(d => d.id === dId) || disputasBase[0];

    let htmlLinkConvite = '';
    if (dispAtual.id !== 'GLOBAL') {
        const linkCompleto = `https://meu-bolao-2026.onrender.com/?convite=${dispAtual.id}`;
        htmlLinkConvite = `
            <div style="background:#111827; border:1px solid #1f2937; padding:15px; margin-bottom:20px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <span style="font-size:14px; color:#9ca3af;">✉️ Link de convite para este grupo:</span>
                <input type="text" value="${linkCompleto}" readonly onclick="this.select(); document.execCommand('copy'); alert('Link de Convite copiado!');" style="flex:1; max-width:450px; color:#f59e0b; text-align:center; font-weight:bold; cursor:pointer;">
            </div>`;
    }

    // RANKING REAL DINÂMICO CONFORME OS USUÁRIOS VÃO SE CADASTRANDO
    let participantesLista = Object.keys(USUARIOS_CADASTRADOS);
    let rankingCalculado = participantesLista.map(p => {
        return { nome: p, pontos: calcularPontosUsuario(p, dispAtual.id) };
    }).sort((a, b) => b.pontos - a.pontos);

    let htmlRanking = `<h2>🏆 Classificação (${dispAtual.nome})</h2><table><tr><th>Posição</th><th>Jogador</th><th>Pontos Ganhos</th></tr>`;
    rankingCalculado.forEach((j, index) => {
        htmlRanking += `<tr><td><strong>${index + 1}º</strong></td><td>${j.nome.toUpperCase()}</td><td style="color:#10b981; font-weight:bold;">${j.pontos} pts</td></tr>`;
    });
    htmlRanking += `</table>`;

    const rodadaAtiva = parseInt(req.query.rodada) || 1;
    let htmlAbas = `<div class="aba-container"><span style="align-self:center; font-weight:bold; margin-right:10px; color:#9ca3af;">Filtrar Rodada:</span>`;
    [1, 2, 3].forEach(r => { htmlAbas += `<a href="/?rodada=${r}" class="aba ${rodadaAtiva===r?'ativa':''}">${r}ª Rodada</a>`; });
    htmlAbas += `</div>`;

    let htmlG = '';
    if (dispAtual.modo === 'grupos' || dispAtual.modo === 'ambos') {
        Object.keys(GRUPOS).forEach(g => {
            const pal = (pClassif[dispAtual.id] && pClassif[dispAtual.id][u] && pClassif[dispAtual.id][u][g]) || { primeiro: '', segundo: '' };
            htmlG += `<div class="card-g"><h3 style="color:#10b981; margin:0 0 10px 0; font-size:14px;">Grupo ${g}</h3><form action="/palpite/grupo" method="POST"><input type="hidden" name="grupo" value="${g}"><select name="primeiro" style="width:100%; margin-bottom:5px; font-size:12px;"><option value="">1º Lugar</option>${GRUPOS[g].map(t => `<option value="${t}" ${pal.primeiro===t?'selected':''}>${t}</option>`).join('')}</select><select name="segundo" style="width:100%; margin-bottom:10px; font-size:12px;"><option value="">2º Lugar</option>${GRUPOS[g].map(t => `<option value="${t}" ${pal.segundo===t?'selected':''}>${t}</option>`).join('')}</select><button type="submit" class="btn" style="width:100%; padding:4px; font-size:11px;">Salvar Grupo</button></form></div>`;
        });
    }

    let htmlP = '';
    if (dispAtual.modo === 'placares' || dispAtual.modo === 'ambos') {
        const partidasFiltradas = PARTIDAS.filter(p => p.rodada === rodadaAtiva);
        partidasFiltradas.forEach(p => {
            const pal = (pPlacar[dispAtual.id] && pPlacar[dispAtual.id][u] && pPlacar[dispAtual.id][u][p.id]) || { golA: '', golB: '' };
            const resultadoReal = RESULTADOS_REAIS[p.id] ? `<span style="background:#1f2937; padding:4px 8px; border-radius:4px; font-size:11px; color:#f59e0b; margin-left:10px;">Placar Real: ${RESULTADOS_REAIS[p.id].golA}x${RESULTADOS_REAIS[p.id].golB}</span>` : '';
            htmlP += `<div class="card-p"><form action="/palpite/placar" method="POST" style="display:flex; width:100%; justify-content:space-between; align-items:center; margin:0;"><input type="hidden" name="partidaId" value="${p.id}"><div style="font-size:11px; color:#10b981; font-weight:bold; width:60px;">GRP ${p.grupo} ${resultadoReal}</div><div class="row" style="justify-content:flex-end; text-align:right;"><span>${p.tA}</span> ${badge(p.tA)}</div><div style="display:flex; align-items:center; gap:5px;"><input type="number" name="golA" value="${pal.golA}" style="width:45px; text-align:center; padding:4px;"><span>X</span><input type="number" name="golB" value="${pal.golB}" style="width:45px; text-align:center; padding:4px;"></div><div class="row">${badge(p.tB)} <span>${p.tB}</span></div><button type="submit" class="btn" style="padding:4px 10px; font-size:12px;">Salvar</button></form></div>`;
        });
    }

    res.send(`${css}<div class="container">
        <div style="background:#111827; padding:20px; border-radius:12px; border:1px solid #374151; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:20px;">
            <div><h1 style="margin:0; font-size:20px;">🏆 COPA 2026 — BOLÃO</h1><p style="margin:2px 0 0 0; color:#9ca3af; font-size:13px;">Jogador: <strong style="color:#f59e0b;">${u.toUpperCase()}</strong> | <a href="/logout" style="color:#ef4444; text-decoration:none;">[Sair]</a></p></div>
            <div style="display:flex; gap:10px; align-items:center;">
                <form action="/grupo/entrar" method="POST" style="margin:0;"><input type="text" name="codigo" placeholder="Código Manual" style="padding:5px; width:110px; font-size:12px;"><button type="submit" class="btn" style="padding:5px 10px; font-size:12px;">Entrar</button></form>
                <form action="/disputa/selecionar" method="POST" style="margin:0;"><select name="disputaId" onchange="this.form.submit()" style="padding:5px; font-weight:bold; color:#f59e0b;">${disputasBase.map(d => `<option value="${d.id}" ${dispAtual.id===d.id?'selected':''}>${d.nome}</option>`).join('')}</select></form>
            </div>
        </div>

        <div style="background:#111827; border:1px solid #1f2937; padding:20px; border-radius:12px; margin-bottom:20px;">
            <h3 style="color:#f59e0b; margin:0 0 15px 0; font-size:14px; text-transform:uppercase;">➕ Criar Novo Grupo de Disputa</h3>
            <form action="/grupo/criar" method="POST" style="display:flex; gap:10px; flex-wrap:wrap; margin:0;">
                <input type="text" name="nome" placeholder="Nome do Grupo (Ex: Galera da Quadra)" required style="flex:1; min-width:200px;">
                <select name="modo" style="color:#f59e0b; font-weight:bold;">
                    <option value="ambos">Modo: Ambos (Grupos e Placares)</option>
                    <option value="grupos">Modo: Apenas Grupos</option>
                    <option value="placares">Modo: Apenas Placares</option>
                </select>
                <button type="submit" class="btn">Criar Grupo Privado</button>
            </form>
        </div>

        ${htmlLinkConvite}
        ${htmlRanking}
        ${htmlG ? `<h2>1. Classificados da Fase de Grupos (Todos os 12 Grupos)</h2><div class="grid">${htmlG}</div>` : ''}
        ${htmlP ? `<h2>2. Placares da Rodada</h2>${htmlAbas}<div>${htmlP}</div>` : ''}
    </div>`);
});

app.listen(PORT, () => console.log('Servidor ativo na nuvem!'));
