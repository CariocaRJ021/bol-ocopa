const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const app = express();

const PORT = process.env.PORT || 3000;

// --- CONEXÃO COM O BANCO DE DADOS (MONGODB) ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bolaoCopa";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🔥 Conectado ao MongoDB!"))
  .catch(err => console.error("❌ Erro ao conectar ao MongoDB:", err));

// --- CONFIGURAÇÃO DE SESSÕES PERSISTENTES ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ 
    secret: 'copa2026-key', 
    resave: false, 
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));

// --- DEFINIÇÃO DOS SCHEMAS ---
const EstadoSchema = new mongoose.Schema({
    idUnico: { type: String, default: "SISTEMA_GLOBAL" },
    usuarios: { type: Map, of: String, default: { "admin": "1234", "thiago": "1234", "sofia": "1234" } },
    disputas: { type: Array, default: [{ id: "GLOBAL", nome: "Bolão Geral (AMBOS)", modo: "ambos" }] },
    membros: { type: Map, of: [String], default: { "GLOBAL": ["thiago", "sofia", "admin"] } },
    pClassif: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    pPlacar: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
});

const EstadoBoletao = mongoose.model('EstadoBoletao', EstadoSchema);

async function obterDB() {
    let dados = await EstadoBoletao.findOne({ idUnico: "SISTEMA_GLOBAL" });
    if (!dados) {
        dados = await EstadoBoletao.create({});
    }
    if (!dados.usuarios) dados.usuarios = new Map([["admin", "1234"], ["thiago", "1234"], ["sofia", "1234"]]);
    if (!dados.membros) dados.membros = new Map([["GLOBAL", ["thiago", "sofia", "admin"]]]);
    if (!dados.pClassif) dados.pClassif = new Map();
    if (!dados.pPlacar) dados.pPlacar = new Map();
    return dados;
}

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

Object.keys(GRUPOS).forEach(g => {
    const [t1, t2, t3, t4] = GRUPOS[g];
    PARTIDAS.push({ id: idPartida++, tA: t1, tB: t2, grupo: `Grupo ${g}`, fase: "r1" });
    PARTIDAS.push({ id: idPartida++, tA: t3, tB: t4, grupo: `Grupo ${g}`, fase: "r1" });
});
Object.keys(GRUPOS).forEach(g => {
    const [t1, t2, t3, t4] = GRUPOS[g];
    PARTIDAS.push({ id: idPartida++, tA: t1, tB: t3, grupo: `Grupo ${g}`, fase: "r2" });
    PARTIDAS.push({ id: idPartida++, tA: t2, tB: t4, grupo: `Grupo ${g}`, fase: "r2" });
});
Object.keys(GRUPOS).forEach(g => {
    const [t1, t2, t3, t4] = GRUPOS[g];
    PARTIDAS.push({ id: idPartida++, tA: t4, tB: t1, grupo: `Grupo ${g}`, fase: "r3" });
    PARTIDAS.push({ id: idPartida++, tA: t2, tB: t3, grupo: `Grupo ${g}`, fase: "r3" });
});

for (let i = 1; i <= 16; i++) { PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: `16avos - Jg ${i}`, fase: "16avos" }); }
for (let i = 1; i <= 8; i++) { PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: `Oitavas - Jg ${i}`, fase: "oitavas" }); }
for (let i = 1; i <= 4; i++) { PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: `Quartas - Jg ${i}`, fase: "quartas" }); }
PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: "Semifinal 1", fase: "semis" });
PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: "Semifinal 2", fase: "semis" });
PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: "Grande Final", fase: "final" });

const NOMES_FASES = {
    "r1": "Fase de Grupos - 1ª Rodada", "r2": "Fase de Grupos - 2ª Rodada", "r3": "Fase de Grupos - 3ª Rodada",
    "16avos": "Dezesseis-avos de Final", "oitavas": "Oitavas de Final", "quartas": "Quartas de Final",
    "semis": "Semifinais", "final": "Grande Final"
};

function badge(time) {
    const c = PAISES[time] || "un";
    return `<img src="https://flagcdn.com/w40/${c}.png" style="width:22px; border-radius:4px; vertical-align:middle; margin:0 6px;">`;
}

async function vincularAoGrupo(dadosDB, disputaId, usuario) {
    if (!dadosDB.membros) dadosDB.membros = new Map();
    if (!dadosDB.membros.has(disputaId)) {
        dadosDB.membros.set(disputaId, []);
    }
    const lista = dadosDB.membros.get(disputaId);
    if (!lista.includes(usuario)) {
        lista.push(usuario);
        dadosDB.membros.set(disputaId, lista);
        dadosDB.markModified('membros');
        await dadosDB.save();
    }
}

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/login', async (req, res) => {
    try {
        const user = req.body.username.trim().toLowerCase();
        const pass = req.body.password;
        const db = await obterDB();
        
        if (db.usuarios && db.usuarios.has(user) && db.usuarios.get(user) === pass) {
            req.session.user = user;
            req.session.dispId = req.session.convitePendente || "GLOBAL";
            req.session.faseAtiva = "r1";
            await vincularAoGrupo(db, req.session.dispId, user);
            return res.redirect('/');
        }
        res.send("<h3>Erro! Usuário ou senha incorretos. <a href='/'>Voltar</a></h3>");
    } catch (e) {
        res.send(`<h3>Erro no servidor: ${e.message}. <a href='/'>Voltar</a></h3>`);
    }
});

app.post('/cadastrar', async (req, res) => {
    try {
        const user = req.body.username.trim().toLowerCase();
        const pass = req.body.password;
        if (!user || !pass) return res.send("<h3>Preencha tudo! <a href='/?tela=cadastro'>Voltar</a></h3>");
        
        const db = await obterDB();
        if (db.usuarios && db.usuarios.has(user)) return res.send("<h3>Usuário já existe! <a href='/?tela=cadastro'>Voltar</a></h3>");

        db.usuarios.set(user, pass);
        db.markModified('usuarios');
        await db.save();

        req.session.user = user;
        req.session.dispId = req.session.convitePendente || "GLOBAL";
        req.session.faseAtiva = "r1";
        
        await vincularAoGrupo(db, "GLOBAL", user);
        await vincularAoGrupo(db, req.session.dispId, user);
        
        res.redirect('/');
    } catch (e) {
        res.send(`<h3>Erro no cadastro: ${e.message}. <a href='/'>Voltar</a></h3>`);
    }
});

app.post('/fase/selecionar', (req, res) => {
    req.session.faseAtiva = req.body.faseId;
    res.redirect('/');
});
app.get('/fase/selecionar', (req, res) => { res.redirect('/'); });

app.post('/grupo/criar', async (req, res) => {
    const codigoUnico = 'COPA-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const modoSelecionado = req.body.modo || "ambos";
    
    const db = await obterDB();
    db.disputas.push({ id: codigoUnico, nome: req.body.nome, modo: modoSelecionado });
    db.markModified('disputas');
    await db.save();

    req.session.dispId = codigoUnico;
    await vincularAoGrupo(db, codigoUnico, req.session.user);
    res.redirect('/');
});

app.post('/grupo/entrar', async (req, res) => {
    const cod = req.body.codigo.trim().toUpperCase();
    const db = await obterDB();
    const grupoEncontrado = db.disputas.find(g => g.id === cod);
    if (grupoEncontrado) { 
        req.session.dispId = grupoEncontrado.id; 
        await vincularAoGrupo(db, grupoEncontrado.id, req.session.user);
    }
    res.redirect('/');
});

app.post('/disputa/selecionar', (req, res) => { 
    req.session.dispId = req.body.disputaId; 
    res.redirect('/'); 
});

app.post('/palpite/grupo', async (req, res) => {
    const { grupo, primeiro, segundo } = req.body; 
    const dId = req.session.dispId || "GLOBAL"; 
    const u = req.session.user;
    
    const db = await obterDB();
    if (!db.pClassif.has(dId)) db.pClassif.set(dId, {});
    const rodadaObj = db.pClassif.get(dId);
    if (!rodadaObj[u]) rodadaObj[u] = {};
    
    rodadaObj[u][grupo] = { primeiro, segundo };
    db.pClassif.set(dId, rodadaObj);
    
    db.markModified('pClassif');
    await db.save();
    res.redirect('/');
});

app.post('/palpite/placar', async (req, res) => {
    const { partidaId, golA, golB } = req.body; 
    const dId = req.session.dispId || "GLOBAL"; 
    const u = req.session.user;
    
    const db = await obterDB();
    if (!db.pPlacar.has(dId)) db.pPlacar.set(dId, {});
    const placarObj = db.pPlacar.get(dId);
    if (!placarObj[u]) placarObj[u] = {};
    
    placarObj[u][partidaId] = { golA, golB };
    db.pPlacar.set(dId, placarObj);
    
    db.markModified('pPlacar');
    await db.save();
    res.redirect('/');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// --- ROTA INTERFACE PRINCIPAL ---
app.get('/', async (req, res) => {
    try {
        const css = `<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet"><style>body{background:#0b0f19;color:#f3f4f6;font-family:'Poppins',sans-serif;margin:0;padding:20px;} .container{max-width:1100px;margin:auto;} h2{color:#f59e0b;border-left:5px solid #10b981;padding-left:12px;font-size:18px;text-transform:uppercase;margin-top:40px; margin-bottom:20px;} .btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:8px 15px;font-weight:600;cursor:pointer;border-radius:6px;transition:0.2s;} .btn:hover{opacity:0.9;} select,input{background:#1f2937;color:#fff;border:1px solid #374151;padding:8px;border-radius:6px;} .grid{display:flex;flex-wrap:wrap;gap:15px;justify-content:center;} .card-g{background:#111827;border:1px solid #1f2937;padding:15px;border-radius:12px;width:310px;border-top:4px solid #10b981;} .card-p{background:#111827;border:1px solid #1f2937;padding:12px 15px;margin:8px 0;border-radius:12px;border-left:5px solid #f59e0b;display:flex;justify-content:space-between;align-items:center;} .row{display:flex;align-items:center;gap:10px;width:38%;} table{width:100%;border-collapse:collapse;background:#111827;border-radius:8px;overflow:hidden;} th,td{padding:12px;text-align:left;border-bottom:1px solid #1f2937;} th{background:#10b981;color:#fff;} .regras-box{background:#111827; border:1px solid #1f2937; padding:15px 20px; border-radius:12px; margin-top:15px; border-left:5px solid #10b981;} .regras-item{margin:6px 0; font-size:13px; color:#9ca3af;} .regras-item strong{color:#f3f4f6;}</style>`;

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
        
        const db = await obterDB();
        const dispAtual = db.disputas.find(d => d.id === dId) || db.disputas[0];

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
                <form action="/disputa/selecionar" method="POST" style="margin:0;"><select name="disputaId" onchange="this.form.submit()" style="padding:6px; font-weight:bold; color:#f59e0b; background:#1f2937; border:1px solid #374151; border-radius:6px;">${db.disputas.map(d => `<option value="${d.id}" ${dispAtual.id===d.id?'selected':''}>${d.nome}</option>`).join('')}</select></form>
            </div>
        </div>`;

        let htmlCriadorGrupo = `
        <div style="background:#111827; border:1px solid #1f2937; padding:20px; border-radius:12px; margin-bottom:20px;">
            <h3 style="color:#f59e0b; margin:0 0 15px 0; font-size:14px; text-transform:uppercase;">➕ Criar Novo Grupo de Disputa</h3>
            <form action="/grupo/criar" method="POST" style="display:flex; gap:10px; flex-wrap:wrap; margin:0;">
                <input type="text" name="nome" placeholder="Nome do Grupo" required style="flex:1; min-width:200px;">
                <select name="modo" style="color:#f59e0b; font-weight:bold; background:#1f2937; border:1px solid #374151; border-radius:6px; padding:8px;">
                    <option value="ambos">Modo: Ambos (Grupos e Rodadas)</option>
                    <option value="groups">Modo: Apenas Grupos</option>
                    <option value="rounds">Modo: Apenas Rodadas</option>
                </select>
                <button type="submit" class="btn">Gerar Grupo Privado</button>
            </form>
        </div>`;

        let htmlSeletorFases = '';
        if (dispAtual.modo === 'rounds' || dispAtual.modo === 'ambos') {
            htmlSeletorFases = `
            <div style="background:#111827; border:1px solid #1f2937; padding:15px; margin-bottom:20px; border-radius:12px; display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
                <span style="font-size:14px; font-weight:bold; color:#9ca3af;">📅 Alternar Rodada do Bolão:</span>
                <form action="/fase/selecionar" method="POST" style="margin:0; display:flex; gap:10px;">
                    <select name="faseId" style="color:#10b981; font-weight:bold; background:#1f2937; border:1px solid #374151; border-radius:6px; padding:8px;">
                        ${Object.keys(NOMES_FASES).map(fId => `<option value="${fId}" ${faseAtiva===fId?'selected':''}>${NOMES_FASES[fId]}</option>`).join('')}
                    </select>
                    <button type="submit" class="btn" style="padding:5px 12px;">Visualizar</button>
                </form>
            </div>`;
        }

        let htmlRanking = `<h2>🏆 Classificação Geral (${dispAtual.nome})</h2><table><tr><th>Posição</th><th>Jogador</th><th>Pontos Ganhos</th></tr>`;
        const competidores = (db.membros && db.membros.get(dispAtual.id)) || [u];
        competidores.forEach((p, index) => {
            let pontos = 0;
            if (dispAtual.id === "GLOBAL") { pontos = p === "thiago" ? 12 : (p === "sofia" ? 9 : 0); }
            htmlRanking += `<tr><td><strong>${index + 1}º</strong></td><td>${p.toUpperCase()}</td><td style="color:#10b981; font-weight:bold;">${pontos} pts</td></tr>`;
        });
        htmlRanking += `</table>`;

        let htmlRegrasModo = `<div class="regras-box"><h4 style="margin:0 0 10px 0; font-size:14px; color:#f59e0b; text-transform:uppercase;">📌 Regras de Pontuação deste Grupo</h4>`;
        if (dispAtual.modo === 'rounds' || dispAtual.modo === 'ambos') {
            htmlRegrasModo += `
            <div style="margin-bottom: 8px; font-size:13px; font-weight:bold; color:#10b981;">⚽ Modo Rodadas (Placares):</div>
            <div class="regras-item">✔️ <strong>25 Pontos:</strong> Placar exato da partida.</div>
            <div class="regras-item">✔️ <strong>15 Pontos:</strong> Acertar o resultado (Vitória/Empate), mas não a quantidade exata de gols.</div>
            <div class="regras-item">✔️ <strong>5 Pontos:</strong> Acertar apenas a quantidade de gols de uma das equipes na partida.</div>`;
        }
        if (dispAtual.modo === 'ambos') { htmlRegrasModo += `<div style="margin: 10px 0; border-top: 1px dashed #374151;"></div>`; }
        if (dispAtual.modo === 'groups' || dispAtual.modo === 'ambos') {
            htmlRegrasModo += `
            <div style="margin-bottom: 8px; font-size:13px; font-weight:bold; color:#10b981;">📊 Modo Grupos (Classificação):</div>
            <div class="regras-item">✔️ <strong>25 Pontos:</strong> Acertar o 1º e o 2º lugar exatamente na ordem correta de classificação.</div>
            <div class="regras-item">✔️ <strong>15 Pontos:</strong> Acertar o 1º e o 2º lugar, mas fora da ordem de classificação.</div>
            <div class="regras-item">✔️ <strong>5 Pontos:</strong> Acertar exatamente apenas 1 dos países classificados.</div>`;
        }
        htmlRegrasModo += `</div>`;

        let htmlG = '';
        if (dispAtual.modo === 'groups' || dispAtual.modo === 'ambos') {
            const palpiteGrupo = db.pClassif.get(dispAtual.id) || {};
            Object.keys(GRUPOS).forEach(g => {
                const pal = (palpiteGrupo[u] && palpiteGrupo[u][g]) || { primeiro: '', segundo: '' };
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
            const palpitePlacar = db.pPlacar.get(dispAtual.id) || {};
            const jogosFase = PARTIDAS.filter(p => p.fase === faseAtiva);
            jogosFase.forEach(p => {
                const pal = (palpitePlacar[u] && palpitePlacar[u][p.id]) || { golA: '', golB: '' };
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
            ${htmlLinkConvite}
            ${htmlSeletorFases}
            ${htmlRanking}
            ${htmlRegrasModo}
            ${htmlG ? `<h2>1. Classificados da Fase de Grupos</h2><div class="grid">${htmlG}</div>` : ''}
            ${htmlP ? `<h2>2. Placares da Rodada — ${NOMES_FASES[faseAtiva]}</h2><div>${htmlP}</div>` : ''}
        </div>`);
    } catch (err) {
        res.status(500).send(`<h2>Erro na Renderização: ${err.message}</h2>`);
    }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
