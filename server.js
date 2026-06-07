const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'dados.json');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'copa2026-key', resave: false, saveUninitialized: true }));

// --- PERSISTÊNCIA EM ARQUIVO LOCAL ---
let DB = {
    usuarios: { "admin": "1234", "thiago": "1234", "sofia": "1234" },
    disputas: [{ id: "GLOBAL", nome: "Bolão Geral (AMBOS)", modo: "ambos" }],
    membros: { "GLOBAL": ["thiago", "sofia", "admin"] },
    pClassif: {},
    pPlacar: {}
};

function carregarDados() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const conteudo = fs.readFileSync(DATA_FILE, 'utf8');
            DB = JSON.parse(conteudo);
        } catch (e) {
            console.error("Erro ao ler arquivo de dados, usando estrutura inicial.");
        }
    }
}
function salvarDados() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(DB, null, 2), 'utf8');
    } catch (e) {
        console.error("Erro ao salvar dados:", e);
    }
}
carregarDados();

// --- DICIONÁRIO DE BANDEIRAS ---
const PAISES = { 
    "México": "mx", "África do Sul": "za", "Coreia do Sul": "kr", "Tchéquia": "cz",
    "Canadá": "ca", "Bósnia e Herzegovina": "ba", "Catar": "qa", "Suíça": "ch",
    "Brasil": "br", "Marrocos": "ma", "Haiti": "ht", "Escócia": "gb-sct",
    "Estados Unidos": "us", "Paraguai": "py", "Austrália": "au", "Turquia": "tr",
    "Alemanha": "de", "Curaçao": "cw", "Costa do Marfim": "ci", "Equador": "ec",
    "Holanda": "nl", "Japão": "jp", "Suécia": "se", "Tunísia": "tn",
    "Bélgica": "be", "Egito": "eg", "Irã": "ir", "Nova Zelândia": "nz",
    "Espanha": "es", "Cabo Verde": "cv", "Arábia Saudita": "sa", "Uruguai": "uy",
    "França": "fr", "Senegal": "sn", "Iraque": "iq", "Noruega": "no",
    "Argentina": "ar", "Argélia": "dz", "Áustria": "at", "Jordânia": "jo",
    "Portugal": "pt", "RD Congo": "cd", "Uzbequistão": "uz", "Colômbia": "co",
    "Inglaterra": "gb-eng", "Croácia": "hr", "Gana": "gh", "Panamá": "pa",
    "A definir": "un"
};

// --- GRUPOS OFICIAIS COPA 2026 ---
const GRUPOS = { 
    A: ["México", "África do Sul", "Coreia do Sul", "Tchéquia"], 
    B: ["Canadá", "Bósnia e Herzegovina", "Catar", "Suíça"], 
    C: ["Brasil", "Marrocos", "Haiti", "Escócia"],
    D: ["Estados Unidos", "Paraguai", "Austrália", "Turquia"],
    E: ["Alemanha", "Curaçao", "Costa do Marfim", "Equador"],
    F: ["Holanda", "Japão", "Suécia", "Tunísia"],
    G: ["Bélgica", "Egito", "Irã", "Nova Zelândia"],
    H: ["Espanha", "Cabo Verde", "Arábia Saudita", "Uruguai"],
    I: ["França", "Senegal", "Iraque", "Noruega"],
    J: ["Argentina", "Argélia", "Áustria", "Jordânia"],
    K: ["Portugal", "RD Congo", "Uzbequistão", "Colômbia"],
    L: ["Inglaterra", "Croácia", "Gana", "Panamá"]
};

// --- GERADOR DINÂMICO DO CALENDÁRIO ---
const PARTIDAS = [];
let idPartida = 1;

// Rodada 1
Object.keys(GRUPOS).forEach(g => {
    const [t1, t2, t3, t4] = GRUPOS[g];
    PARTIDAS.push({ id: idPartida++, tA: t1, tB: t2, grupo: `Grupo ${g}`, fase: "r1" });
    PARTIDAS.push({ id: idPartida++, tA: t3, tB: t4, grupo: `Grupo ${g}`, fase: "r1" });
});

// Rodada 2
Object.keys(GRUPOS).forEach(g => {
    const [t1, t2, t3, t4] = GRUPOS[g];
    PARTIDAS.push({ id: idPartida++, tA: t1, tB: t3, grupo: `Grupo ${g}`, fase: "r2" });
    PARTIDAS.push({ id: idPartida++, tA: t2, tB: t4, grupo: `Grupo ${g}`, fase: "r2" });
});

// Rodada 3
Object.keys(GRUPOS).forEach(g => {
    const [t1, t2, t3, t4] = GRUPOS[g];
    PARTIDAS.push({ id: idPartida++, tA: t4, tB: t1, grupo: `Grupo ${g}`, fase: "r3" });
    PARTIDAS.push({ id: idPartida++, tA: t2, tB: t3, grupo: `Grupo ${g}`, fase: "r3" });
});

// Mata-Mata
for (let i = 1; i <= 16; i++) { PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: `16avos - Jg ${i}`, fase: "16avos" }); }
for (let i = 1; i <= 8; i++) { PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: `Oitavas - Jg ${i}`, fase: "oitavas" }); }
for (let i = 1; i <= 4; i++) { PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: `Quartas - Jg ${i}`, fase: "quartas" }); }
PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: "Semifinal 1", fase: "semis" });
PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: "Semifinal 2", fase: "semis" });
PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", group: "Grande Final", fase: "final" });

const NOMES_FASES = {
    "r1": "Fase de Grupos - 1ª Rodada", "r2": "Fase de Grupos - 2ª Rodada", "r3": "Fase de Grupos - 3ª Rodada",
    "16avos": "Dezesseis-avos de Final", "oitavas": "Oitavas de Final", "quartas": "Quartas de Final",
    "semis": "Semifinais", "final": "Grande Final"
};

function badge(time) {
    const c = PAISES[time] || "un";
    return `<img src="https://flagcdn.com/w40/${c}.png" style="width:22px; border-radius:4px; vertical-align:middle; margin:0 6px;">`;
}

function vincularAoGrupo(disputaId, usuario) {
    if (!DB.membros[disputaId]) { DB.membros[disputaId] = []; }
    if (!DB.membros[disputaId].includes(usuario)) { DB.membros[disputaId].push(usuario); }
    salvarDados();
}

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/login', (req, res) => {
    const user = req.body.username.trim().toLowerCase();
    const pass = req.body.password;
    if (DB.usuarios[user] && DB.usuarios[user] === pass) {
        req.session.user = user;
        req.session.dispId = req.session.convitePendente || "GLOBAL";
        req.session.faseAtiva = "r1";
        vincularAoGrupo(req.session.dispId, user);
        return res.redirect('/');
    }
    res.send("<h3>Erro! Usuário ou senha incorretos. <a href='/'>Voltar</a></h3>");
});

app.post('/cadastrar', (req, res) => {
    const user = req.body.username.trim().toLowerCase();
    const pass = req.body.password;
    if (!user || !pass) return res.send("<h3>Preencha tudo! <a href='/?tela=cadastro'>Voltar</a></h3>");
    if (DB.usuarios[user]) return res.send("<h3>Usuário já existe! <a href='/?tela=cadastro'>Voltar</a></h3>");

    DB.usuarios[user] = pass;
    req.session.user = user;
    req.session.dispId = req.session.convitePendente || "GLOBAL";
    req.session.faseAtiva = "r1";
    vincularAoGrupo("GLOBAL", user);
    vincularAoGrupo(req.session.dispId, user);
    res.redirect('/');
});

// --- SEGURANÇA DE ROTAS ---
app.post('/fase/selecionar', (req, res) => {
    req.session.faseAtiva = req.body.faseId;
    res.redirect('/');
});
app.get('/fase/selecionar', (req, res) => {
    res.redirect('/');
});

app.post('/grupo/criar', (req, res) => {
    const codigoUnico = 'COPA-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const modoSelecionado = req.body.modo || "ambos";
    DB.disputas.push({ id: codigoUnico, nome: req.body.nome, modo: modoSelecionado });
    req.session.dispId = codigoUnico;
    vincularAoGrupo(codigoUnico, req.session.user);
    res.redirect('/');
});

app.post('/grupo/entrar', (req, res) => {
    const cod = req.body.codigo.trim().toUpperCase();
    const grupoEncontrado = DB.disputas.find(g => g.id === cod);
    if (grupoEncontrado) { 
        req.session.dispId = grupoEncontrado.id; 
        vincularAoGrupo(grupoEncontrado.id, req.session.user);
    }
    res.redirect('/');
});

app.post('/disputa/selecionar', (req, res) => { 
    req.session.dispId = req.body.disputaId; 
    res.redirect('/'); 
});

app.post('/palpite/grupo', (req, res) => {
    const { grupo, primeiro, segundo } = req.body; 
    const dId = req.session.dispId || "GLOBAL"; const u = req.session.user;
    if (!DB.pClassif[dId]) DB.pClassif[dId] = {}; 
    if (!DB.pClassif[dId][u]) DB.pClassif[dId][u] = {};
    DB.pClassif[dId][u][grupo] = { primeiro, segundo };
    salvarDados();
    res.redirect('/');
});

app.post('/palpite/placar', (req, res) => {
    const { partidaId, golA, golB } = req.body; 
    const dId = req.session.dispId || "GLOBAL"; const u = req.session.user;
    if (!DB.pPlacar[dId]) DB.pPlacar[dId] = {}; 
    if (!DB.pPlacar[dId][u]) DB.pPlacar[dId][u] = {};
    DB.pPlacar[dId][u][partidaId] = { golA, golB };
    salvarDados();
    res.redirect('/');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// --- ROTA INTERFACE PRINCIPAL ---
app.get('/', (req, res) => {
    const css = `<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet"><style>body{background:#0b0f19;color:#f3f4f6;font-family:'Poppins',sans-serif;margin:0;padding:20px;} .container{max-width:1100px;margin:auto;} h2{color:#f59e0b;border-left:5px solid #10b981;padding-left:12px;font-size:18px;text-transform:uppercase;margin-top:40px; margin-bottom:20px;} .btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:8px 15px;font-weight:600;cursor:pointer;border-radius:6px;transition:0.2s;} .btn:hover{opacity:0.9;} select,input{background:#1f2937;color:#fff;border:1px solid #374151;padding:8px;border-radius:6px;} .grid{display:flex;flex-wrap:wrap;gap:15px;justify-content:center;} .card-g{background:#111827;border:1px solid #1f2937;padding:15px;border-radius:12px;width:310px;border-top:4px solid #10b981;} .card-p{background:#111827;border:1px solid #1f2937;padding:12px 15px;margin:8px 0;border-radius:12px;border-left:5px solid #f59e0b;display:flex;justify-content:space-between;align-items:center;} .row{display:flex;align-items:center;gap:10px;width:38%;} table{width:100%;border-collapse:collapse;background:#111827;border-radius:8px;overflow:hidden;} th,td{padding:12px;text-align:left;border-bottom:1px solid #1f2937;} th{background:#10b981;color:#fff;}</style>`;

    if (req.query.convite) { req.session.convitePendente = req.query.convite.trim().toUpperCase(); }

    if (!req.session.user) {
        if (req.query.tela === 'cadastro') {
            return res.send(`${css}<div style="display:flex; justify-content:center; align-items:center; min-height:90vh;"><div style="background:#111827; padding:40px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:400px; border-top:6px solid #10b981;"><h2>📝 CRIAR CADASTRO</h2><form action="/cadastrar" method="POST"><input type="text" name="username" placeholder="Escolha seu Usuário" required style="width:100%; margin-bottom:15px;"><br><input type="password" name="password" placeholder="Crie uma Senha" required style="width:100%; margin-bottom:20px;"><br><button type="submit" class="btn" style="width:100%;">Registrar e Entrar</button></form><p style="margin-top:20px; font-size:13px; text-align:center;"><a href="/" style="color:#f59e0b; text-decoration:none;">Já tem conta? Faça seu Login</a></p></div></div>`);
        } else {
            return res.send(`${css}<div style="display:flex; justify-content:center; align-items:center; min-height:90vh;"><div style="background:#111827; padding:40px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:400px; border-top:6px solid #f59e0b;"><h2>🏆 ENTRAR NO BOLÃO</h2><form action="/login" method="POST"><input type="text" name="username" placeholder="Usuário" required style="width:100%; margin-bottom:15px;"><br><input type="password" name="password" placeholder="Senha" required style="width:100%; margin-bottom:20px;"><br><button type="submit" class="btn" style="width:100%;">Acessar Sistema</button></form><p style="margin-top:20px; font-size:13px; text-align:center;"><a href="/?tela=cadastro" style="color:#10b981; text-decoration:none; font-weight:bold;">Não tem conta? Cadastre-se aqui</a></p></div></div>`);
        }
    }

    const u = req.session.user; 
    const dId = req.session.dispId || "GLOBAL";
    const faseAtiva = req.session.faseAtiva || "r1";
    const dispAtual = DB.disputas.find(d => d.id === dId) || DB.disputas[0];

    let htmlLinkConvite = '';
    if (dispAtual.id !== 'GLOBAL') {
        htmlLinkConvite = `
            <div style="background:#111827; border:1px solid #1f2937; padding:15px; margin-bottom:20px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:14px; color:#9ca3af;">✉️ Link de convite para este grupo:</span>
                <input type="text" value="https://${req.get('host')}/?convite=${dispAtual.id}" readonly onclick="this.select(); alert('Link copiado!');" style="width:340px; color:#f59e0b; text-align:center; font-weight:bold; background:#1f2937; border:1px solid #374151; padding:4px; border-radius:4px;">
            </div>`;
    }

    let htmlTopo = `
    <div style="background:#111827; padding:20px; border-radius:12px; border:1px solid #374151; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:20px;">
        <div><h1 style="margin:0; font-size:20px;">🏆 COPA 2026 — BOLÃO</h1><p style="margin:2px 0 0 0; color:#9ca3af; font-size:13px;">Jogador: <strong style="color:#f59e0b;">${u.toUpperCase()}</strong> | <a href="/logout" style="color:#ef4444; text-decoration:none;">[Sair]</a></p></div>
        <div style="display:flex; gap:10px; align-items:center;">
            <form action="/grupo/entrar" method="POST" style="margin:0;"><input type="text" name="codigo" placeholder="Código Manual" style="padding:5px; width:110px; font-size:12px; background:#1f2937; color:#fff; border:1px solid #374151; border-radius:6px;"><button type="submit" class="btn" style="padding:5px 10px; font-size:12px;">Entrar</button></form>
            <form action="/disputa/selecionar" method="POST" style="margin:0;"><select name="disputaId" onchange="this.form.submit()" style="padding:6px; font-weight:bold; color:#f59e0b; background:#1f2937; border:1px solid #374151; border-radius:6px;">${DB.disputas.map(d => `<option value="${d.id}" ${dispAtual.id===d.id?'selected':''}>${d.nome}</option>`).join('')}</select></form>
        </div>
    </div>`;

    let htmlCriadorGrupo = `
    <div style="background:#111827; border:1px solid #1f2937; padding:20px; border-radius:12px; margin-bottom:20px;">
        <h3 style="color:#f59e0b; margin:0 0 15px 0; font-size:14px; text-transform:uppercase;">➕ Criar Novo Grupo de Disputa</h3>
        <form action="/grupo/criar" method="POST" style="display:flex; gap:10px; flex-wrap:wrap; margin:0;">
            <input type="text" name="nome" placeholder="Nome do Grupo" required style="flex:1; min-width:2
