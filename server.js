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

// --- PERSISTÊNCIA EM ARQUIVO LOCAL (SEM GRUPO GLOBAL) ---
let DB = {
    usuarios: { "admin": "1234", "thiago": "1234", "sofia": "1234" },
    disputas: [], 
    membros: {},
    pClassif: {},
    pPlacar: {},
    gabaritoClassif: {}, 
    gabaritoPlacar: {},
    historicoRanking: {},
    murais: {} 
};

function carregarDados() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const conteudo = fs.readFileSync(DATA_FILE, 'utf8');
            DB = JSON.parse(conteudo);
            if (!DB.gabaritoClassif) DB.gabaritoClassif = {};
            if (!DB.gabaritoPlacar) DB.gabaritoPlacar = {};
            if (!DB.historicoRanking) DB.historicoRanking = {};
            if (!DB.membros) DB.membros = {};
            if (!DB.murais) DB.murais = {};
            if (!DB.disputas) DB.disputas = [];
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

Object.keys(GRUPOS).forEach((g, idx) => {
    const [t1, t2, t3, t4] = GRUPOS[g];
    PARTIDAS.push({ id: idPartida++, tA: t1, tB: t2, grupo: `Grupo ${g}`, fase: "r1", dataHora: `2026-06-11T${14 + (idx % 3)}:00:00` });
    PARTIDAS.push({ id: idPartida++, tA: t3, tB: t4, grupo: `Grupo ${g}`, fase: "r1", dataHora: `2026-06-11T${17 + (idx % 2)}:00:00` });
});
Object.keys(GRUPOS).forEach((g, idx) => {
    const [t1, t2, t3, t4] = GRUPOS[g];
    PARTIDAS.push({ id: idPartida++, tA: t1, tB: t3, grupo: `Grupo ${g}`, fase: "r2", dataHora: `2026-06-16T${14 + (idx % 3)}:00:00` });
    PARTIDAS.push({ id: idPartida++, tA: t2, tB: t4, grupo: `Grupo ${g}`, fase: "r2", dataHora: `2026-06-16T${17 + (idx % 2)}:00:00` });
});
Object.keys(GRUPOS).forEach((g, idx) => {
    const [t1, t2, t3, t4] = GRUPOS[g];
    PARTIDAS.push({ id: idPartida++, tA: t4, tB: t1, grupo: `Grupo ${g}`, fase: "r3", dataHora: `2026-06-21T16:00:00` });
    PARTIDAS.push({ id: idPartida++, tA: t2, tB: t3, grupo: `Grupo ${g}`, fase: "r3", dataHora: `2026-06-21T20:00:00` });
});

for (let i = 1; i <= 16; i++) { PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: `16avos - Jg ${i}`, fase: "16avos", dataHora: `2026-06-25T16:00:00` }); }
for (let i = 1; i <= 8; i++) { PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: `Oitavas - Jg ${i}`, fase: "oitavas", dataHora: `2026-06-29T17:00:00` }); }
for (let i = 1; i <= 4; i++) { PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: `Quartas - Jg ${i}`, fase: "quartas", dataHora: `2026-07-04T17:00:00` }); }
PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: "Semifinal 1", fase: "semis", dataHora: `2026-07-08T21:00:00` });
PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: "Semifinal 2", fase: "semis", dataHora: `2026-07-09T21:00:00` });
PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: "Grande Final", fase: "final", dataHora: `2026-07-19T18:00:00` });

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
    if (!DB.membros[disputaId].includes(usuario)) { 
        DB.membros[disputaId].push(usuario); 
        salvarDados();
    }
}

// --- MOTORES DE CÁLCULO DE PONTOS ---
function obterMetricasRodada(palpite, real) {
    let pontos = 0; let exato = 0; let resultado = 0;
    if (!palpite || palpite.golA === '' || palpite.golB === '' || !real || real.golA === '' || real.golB === '') {
        return { pontos, exato, resultado };
    }
    const gA_pal = parseInt(palpite.golA); const gB_pal = parseInt(palpite.golB);
    const gA_real = parseInt(real.golA); const gB_real = parseInt(real.golB);

    if (gA_pal === gA_real && gB_pal === gB_real) return { pontos: 25, exato: 1, resultado: 0 };

    const saldo_pal = gA_pal - gB_pal; const saldo_real = gA_real - gB_real;
    const acResultado = (saldo_pal > 0 && saldo_real > 0) || (saldo_pal < 0 && saldo_real < 0) || (saldo_pal === 0 && saldo_real === 0);

    if (acResultado) return { pontos: 15, exato: 0, resultado: 1 };
    if (gA_pal === gA_real || gB_pal === gB_real) return { pontos: 5, exato: 0, resultado: 0 };
    return { pontos, exato, resultado };
}

function obterMetricasClassif(palpite, real) {
    let pontos = 0; let exato = 0; let resultado = 0;
    if (!palpite || !palpite.primeiro || !palpite.segundo || !real || !real.primeiro || !real.segundo) {
        return { pontos, exato, resultado };
    }
    if (palpite.primeiro === real.primeiro && palpite.segundo === real.segundo) return { pontos: 25, exato: 1, resultado: 0 };
    if (palpite.primeiro === real.segundo && palpite.segundo === real.primeiro) return { pontos: 15, exato: 0, resultado: 1 };
    if (palpite.primeiro === real.primeiro || palpite.segundo === real.segundo || palpite.primeiro === real.segundo || palpite.segundo === real.primeiro) return { pontos: 5, exato: 0, resultado: 0 };
    return { pontos, exato, resultado };
}

const SCRIPT_DINAMICO = `
<script>
    const gruposData = ${JSON.stringify(GRUPOS)};
    function atualizarSeletorPaises(grupoLetra) {
        const p1 = document.getElementById('admin_primeiro');
        const p2 = document.getElementById('admin_segundo');
        if(!p1 || !p2) return;
        const countries = gruposData[grupoLetra] || [];
        p1.innerHTML = '<option value="">Escolha o 1º</option>';
        p2.innerHTML = '<option value="">Escolha o 2º</option>';
        countries.forEach(p => {
            p1.innerHTML += \`<option value="\${p}">\${p}</option>\`;
            p2.innerHTML += \`<option value="\${p}">\${p}</option>\`;
        });
    }
    window.addEventListener('scroll', function() { localStorage.setItem('bolao_scroll_pos', window.scrollY); });
    window.onload = function() {
        const sg = document.getElementById('admin_select_grupo');
        if(sg) { atualizarSeletorPaises(sg.value); }
        const posSalva = localStorage.getItem('bolao_scroll_pos');
        if (posSalva) { window.scrollTo({ top: parseInt(posSalva), behavior: 'instant' }); }
    }
</script>`;

// --- ROTAS DE AUTENTICAÇÃO MODIFICADAS ---
app.post('/login', (req, res) => {
    const user = req.body.username.trim().toLowerCase();
    const pass = req.body.password;
    if (DB.usuarios[user] && DB.usuarios[user] === pass) {
        req.session.user = user;
        req.session.dispId = req.session.convitePendente || null;
        req.session.faseAtiva = "r1";
        if (req.session.dispId) {
            vincularAoGrupo(req.session.dispId, user);
        }
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
    req.session.dispId = req.session.convitePendente || null;
    req.session.faseAtiva = "r1";
    
    if (req.session.dispId) {
        vincularAoGrupo(req.session.dispId, user);
    }
    res.redirect('/');
});

app.post('/fase/selecionar', (req, res) => { req.session.faseAtiva = req.body.faseId; res.redirect('/'); });

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
    const groupFound = DB.disputas.find(g => g.id === cod);
    if (groupFound) { 
        req.session.dispId = groupFound.id; 
        vincularAoGrupo(groupFound.id, req.session.user);
    }
    res.redirect('/');
});

app.post('/disputa/selecionar', (req, res) => { req.session.dispId = req.body.disputaId; res.redirect('/'); });

app.post('/mural/enviar', (req, res) => {
    const dId = req.session.dispId;
    if (!dId) return res.redirect('/');
    const u = req.session.user;
    const msg = req.body.mensagem.trim();
    if (!msg) return res.redirect('/');

    if (!DB.murais[dId]) DB.murais[dId] = [];
    DB.murais[dId].unshift({ usuario: u, texto: msg, data: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
    
    if (DB.murais[dId].length > 15) DB.murais[dId].pop();
    salvarDados();
    res.redirect('/');
});

// --- ROTAS DO ADMIN TURBINADO ---
app.post('/admin/usuario/senha', (req, res) => {
    if (req.session.user !== 'admin') return res.status(403).send("Acesso negado.");
    const { usuarioAlvo, novaSenha } = req.body;
    const alvo = usuarioAlvo.trim().toLowerCase();
    if (DB.usuarios[alvo]) {
        DB.usuarios[alvo] = novaSenha;
        salvarDados();
    }
    res.redirect('/');
});

app.post('/admin/usuario/remover', (req, res) => {
    if (req.session.user !== 'admin') return res.status(403).send("Acesso negado.");
    const { usuarioAlvo } = req.body;
    const dId = req.session.dispId;
    const alvo = usuarioAlvo.trim().toLowerCase();
    
    if (dId && DB.membros[dId]) {
        DB.membros[dId] = DB.membros[dId].filter(m => m !== alvo);
        salvarDados();
    }
    res.redirect('/');
});

function verificarPrazoBloqueio(dataHoraPartida) {
    const agora = new Date();
    const limite = new Date(dataHoraPartida);
    limite.setMinutes(limite.getMinutes() - 30);
    return agora > limite;
}

app.post('/palpite/grupo', (req, res) => {
    const dId = req.session.dispId;
    if (!dId) return res.redirect('/');
    const { grupo, primeiro, segundo } = req.body; 
    const u = req.session.user;
    if(verificarPrazoBloqueio(PARTIDAS[0].dataHora)) return res.send("<h3>Prazo encerrado! <a href='/'>Voltar</a></h3>");

    if (!DB.pClassif[dId]) DB.pClassif[dId] = {}; 
    if (!DB.pClassif[dId][u]) DB.pClassif[dId][u] = {};
    DB.pClassif[dId][u][grupo] = { primeiro, segundo };
    salvarDados();
    res.redirect('/');
});

app.post('/palpite/placar', (req, res) => {
    const dId = req.session.dispId;
    if (!dId) return res.redirect('/');
    const { partidaId, golA, golB } = req.body; 
    const u = req.session.user;
    const jogo = PARTIDAS.find(p => p.id == partidaId);
    if (jogo && verificarPrazoBloqueio(jogo.dataHora)) return res.send("<h3>Jogo bloqueado! <a href='/'>Voltar</a></h3>");

    if (!DB.pPlacar[dId]) DB.pPlacar[dId] = {}; 
    if (!DB.pPlacar[dId][u]) DB.pPlacar[dId][u] = {};
    DB.pPlacar[dId][u][partidaId] = { golA, golB };
    salvarDados();
    res.redirect('/');
});

app.post('/admin/gabarito/grupo', (req, res) => {
    if (req.session.user !== 'admin') return res.status(403).send("Acesso negado.");
    const { grupo, primeiro, segundo } = req.body;
    DB.gabaritoClassif[grupo] = { primeiro, segundo };
    salvarDados();
    res.redirect('/');
});

app.post('/admin/gabarito/placar', (req, res) => {
    if (req.session.user !== 'admin') return res.status(403).send("Acesso negado.");
    const { partidaId, golA, golB, penA, penB } = req.body;
    DB.gabaritoPlacar[partidaId] = { golA, golB, penA: penA || '', penB: penB || '' };
    salvarDados();
    res.redirect('/');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

app.get('/', (req, res) => {
    const css = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body{background:#0b0f19;color:#f3f4f6;font-family:'Poppins',sans-serif;margin:0;padding:12px;} 
        .container{max-width:1100px;margin:auto;} 
        h2{color:#f59e0b;border-left:5px solid #10b981;padding-left:12px;font-size:16px;text-transform:uppercase;margin-top:30px;margin-bottom:15px;} 
        .btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:10px 15px;font-weight:600;cursor:pointer;border-radius:6px;transition:0.2s;} 
        select,input{background:#1f2937;color:#fff;border:1px solid #374151;padding:10px;border-radius:6px;box-sizing:border-box;} 
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:15px;justify-content:center;} 
        .card-g{background:#111827;border:1px solid #1f2937;padding:15px;border-radius:12px;border-top:4px solid #10b981;box-sizing:border-box;} 
        .card-p{background:#111827;border:1px solid #1f2937;padding:15px;margin:10px 0;border-radius:12px;border-left:5px solid #f59e0b;}
        .form-placar{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:10px;width:100%;flex-wrap:wrap;}
        .info-partida{font-size:11px;color:#10b981;font-weight:bold;min-width:90px;}
        .time-box{display:flex;align-items:center;gap:8px;flex:1;}
        .time-box.casa{justify-content:flex-end;text-align:right;}
        .time-box.fora{justify-content:flex-start;text-align:left;}
        .placar-inputs{display:flex;align-items:center;gap:6px;}
        .placar-inputs input{width:45px;text-align:center;padding:6px;font-weight:bold;font-size:16px;}
        .tendencia-bar{font-size:10px;color:#9ca3af;margin-top:4px;display:flex;gap:8px;justify-content:center;width:100%;font-weight:600;}
        .flex-wrap-header{display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap;}
        .tabela-wrapper{width:100%;overflow-x:auto;background:#111827;border-radius:8px;}
        table{width:100%;border-collapse:collapse;min-width:400px;} 
        th,td{padding:12px;text-align:left;border-bottom:1px solid #1f2937;font-size:14px;} 
        th{background:#10b981;color:#fff;} 
        .regras-box{background:#111827;border:1px solid #1f2937;padding:15px;border-radius:12px;margin-top:15px;border-left:5px solid #10b981;} 
        .regras-item{margin:6px 0;font-size:13px;color:#9ca3af;} 
        .admin-box{background:#1e1b4b;border:2px dashed #6366f1;padding:15px;border-radius:12px;margin-top:30px;}
        .secador-box{background:#1e293b;border:1px solid #3b82f6;padding:15px;border-radius:12px;margin:20px 0;}
        .mural-box{background:#1e293b; border:1px solid #475569; padding:12px; border-radius:12px; margin-bottom:20px;}
        .mural-feed{max-height:110px; overflow-y:auto; margin-top:8px; background:#0f172a; padding:8px; border-radius:6px; font-size:12px;}
        .mural-item{padding:4px 0; border-bottom:1px dashed #334155;}
        .lider-row{background:linear-gradient(90deg, #2e2206, #111827) !important; border-left: 4px solid #f59e0b;}

        @media(max-width:600px){
            body{padding:8px;}
            .form-placar{flex-direction:column;align-items:stretch;text-align:center;}
            .time-box.casa, .time-box.fora, .placar-inputs{justify-content:center;margin:5px 0;}
            .info-partida{text-align:center;width:100%;border-bottom:1px dashed #374151;padding-bottom:5px;}
            .flex-wrap-header{flex-direction:column;align-items:stretch;text-align:center;}
        }
    </style>`;

    if (req.query.convite) { req.session.convitePendente = req.query.convite.trim().toUpperCase(); }

    if (!req.session.user) {
        if (req.query.tela === 'cadastro') {
            return res.send(`${css}<div style="display:flex; justify-content:center; align-items:center; min-height:90vh;"><div style="background:#111827; padding:25px 20px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:360px; border-top:6px solid #10b981; box-sizing:border-box;"><h2>📝 CRIAR CADASTRO</h2><form action="/cadastrar" method="POST"><input type="text" name="username" placeholder="Usuário" required style="width:100%; margin-bottom:15px;"><br><input type="password" name="password" placeholder="Senha" required style="width:100%; margin-bottom:20px;"><br><button type="submit" class="btn" style="width:100%;">Registrar e Entrar</button></form><p style="margin-top:20px; font-size:13px; text-align:center;"><a href="/" style="color:#f59e0b; text-decoration:none;">Já tem conta? Login</a></p></div></div>`);
        } else {
            return res.send(`${css}<div style="display:flex; justify-content:center; align-items:center; min-height:90vh;"><div style="background:#111827; padding:25px 20px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:360px; border-top:6px solid #f59e0b; box-sizing:border-box;"><h2>🏆 ENTRAR NO BOLÃO</h2><form action="/login" method="POST"><input type="text" name="username" placeholder="Usuário" required style="width:100%; margin-bottom:15px;"><br><input type="password" name="password" placeholder="Senha" required style="width:100%; margin-bottom:20px;"><br><button type="submit" class="btn" style="width:100%;">Acessar</button></form><p style="margin-top:20px; font-size:13px; text-align:center;"><a href="/?tela=cadastro" style="color:#10b981; text-decoration:none; font-weight:bold;">Cadastre-se aqui</a></p></div></div>`);
        }
    }

    const u = req.session.user; 
    
    // Mapeia quais grupos privados o usuário logado realmente participa
    let meusGrupos = DB.disputas.filter(d => DB.membros[d.id] && DB.membros[d.id].includes(u));
    
    let dId = req.session.dispId;
    if (!dId && meusGrupos.length > 0) {
        dId = meusGrupos[0].id;
        req.session.dispId = dId;
    }

    const faseAtiva = req.session.faseAtiva || "r1";
    const dispAtual = DB.disputas.find(d => d.id === dId) || null;

    if (dispAtual) {
        vincularAoGrupo(dispAtual.id, u);
    }

    // Header dinâmico: Exibe apenas os grupos reais do usuário no seletor
    let htmlTopo = `
    <div style="background:#111827; padding:15px; border-radius:12px; border:1px solid #374151; margin-bottom:20px;" class="flex-wrap-header">
        <div><h1 style="margin:0; font-size:18px;">🏆 COPA 2026 — BOLÃO</h1><p style="margin:2px 0 0 0; color:#9ca3af; font-size:13px;">Jogador: <strong style="color:#f59e0b;">${u.toUpperCase()}</strong> | <a href="/logout" style="color:#ef4444; text-decoration:none;">[Sair]</a></p></div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;" class="flex-wrap-header">
            <form action="/grupo/entrar" method="POST" style="margin:0; display:flex; gap:5px;"><input type="text" name="codigo" placeholder="Código" style="padding:6px; width:90px; font-size:12px;"><button type="submit" class="btn" style="padding:6px 10px; font-size:12px;">Entrar</button></form>
            ${meusGrupos.length > 0 ? `
            <form action="/disputa/selecionar" method="POST" style="margin:0;"><select name="disputaId" onchange="this.form.submit()" style="padding:6px; font-weight:bold; color:#f59e0b;">${meusGrupos.map(d => `<option value="${d.id}" ${dId===d.id?'selected':''}>${d.nome}</option>`).join('')}</select></form>
            ` : '<span style="font-size:12px; color:#ef4444; font-weight:bold;">Sem grupo ativo</span>'}
        </div>
    </div>`;

    let htmlCriadorGrupo = `
    <div style="background:#111827; border:1px solid #1f2937; padding:15px; border-radius:12px; margin-bottom:20px;">
        <h3 style="color:#f59e0b; margin:0 0 12px 0; font-size:13px; text-transform:uppercase;">➕ Criar Novo Grupo de Disputa</h3>
        <form action="/grupo/criar" method="POST" style="display:flex; gap:10px; flex-direction:column;">
            <input type="text" name="nome" placeholder="Nome do Grupo" required style="width:100%;">
            <select name="modo" style="color:#f59e0b; font-weight:bold; width:100%;">
                <option value="ambos">Modo: Ambos (Grupos e Rodadas)</option>
                <option value="groups">Modo: Apenas Grupos</option>
                <option value="rounds">Modo: Apenas Rodadas</option>
            </select>
            <button type="submit" class="btn" style="width:100%;">Gerar Grupo Privado</button>
        </form>
    </div>`;

    // --- TELA DE ESPERA PARA QUEM NÃO TEM NENHUM GRUPO ---
    if (!dispAtual) {
        return res.send(`${css}<div class="container">
            ${htmlTopo}
            <div style="background:#1e293b; padding:20px; border-radius:12px; text-align:center; margin-bottom:20px; border-left:5px solid #f59e0b;">
                <p style="margin:0; font-weight:bold; color:#f3f4f6; font-size:14px;">👋 Bem-vindo! Você não está participando de nenhum grupo ainda.</p>
                <p style="margin:6px 0 0 0; color:#9ca3af; font-size:13px;">Crie uma disputa privada abaixo ou insira o código enviado pelos seus amigos no campo do topo.</p>
            </div>
            ${htmlCriadorGrupo}
        </div>`);
    }

    let htmlLinkConvite = `
        <div style="background:#111827; border:1px solid #1f2937; padding:15px; margin-bottom:20px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <span style="font-size:14px; color:#9ca3af;">✉️ Link de convite do grupo:</span>
            <input type="text" value="https://${req.get('host')}/?convite=${dispAtual.id}" readonly onclick="this.select(); alert('Copiado!');" style="flex:1; min-width:240px; color:#f59e0b; text-align:center; font-weight:bold; background:#1f2937; border:1px solid #374151; padding:6px; border-radius:4px;">
        </div>`;

    const mensagensMural = DB.murais[dispAtual.id] || [];
    let htmlMural = `
    <div class="mural-box">
        <h3 style="margin:0 0 8px 0; font-size:13px; color:#f59e0b; text-transform:uppercase;">💬 Mural de Provocações (${dispAtual.nome})</h3>
        <form action="/mural/enviar" method="POST" style="display:flex; gap:6px;">
            <input type="text" name="mensagem" placeholder="Solte a sua zueira da rodada..." required style="flex:1; padding:6px; font-size:13px;">
            <button type="submit" class="btn" style="padding:6px 12px; font-size:13px;">Enviar</button>
        </form>
        <div class="mural-feed">
            ${mensagensMural.length === 0 ? '<span style="color:#475569;">Nenhuma provocação enviada ainda...</span>' : mensagensMural.map(m => `
                <div class="mural-item">
                    <span style="color:#9ca3af; font-size:10px;">[${m.data}]</span> 
                    <strong style="color:#10b981;">${m.usuario.toUpperCase()}:</strong> 
                    <span style="color:#f3f4f6;">${m.texto}</span>
                </div>
            `).join('')}
        </div>
    </div>`;

    let htmlSeletorFases = '';
    if (dispAtual.modo === 'rounds' || dispAtual.modo === 'ambos') {
        htmlSeletorFases = `
        <div style="background:#111827; border:1px solid #1f2937; padding:15px; margin-top:25px; margin-bottom:10px; border-radius:12px;" class="flex-wrap-header">
            <span style="font-size:14px; font-weight:bold; color:#9ca3af;">📅 Alternar Rodada:</span>
            <form action="/fase/selecionar" method="POST" style="margin:0; display:flex; gap:10px; width:100%; max-width:400px;">
                <select name="faseId" style="color:#10b981; font-weight:bold; flex:1;">
                    ${Object.keys(NOMES_FASES).map(fId => `<option value="${fId}" ${faseAtiva===fId?'selected':''}>${NOMES_FASES[fId]}</option>`).join('')}
                </select>
                <button type="submit" class="btn" style="padding:5px 12px;">Ver</button>
            </form>
        </div>`;
    }

    let listaPontuou = [];
    const competidores = DB.membros[dispAtual.id] || [];
    if (!competidores.includes(u)) competidores.push(u); 

    competidores.forEach(jogador => {
        let totalPontos = 0; let totaisExatos = 0; let totaisResultados = 0;

        if (dispAtual.modo === 'groups' || dispAtual.modo === 'ambos') {
            if (DB.pClassif[dispAtual.id] && DB.pClassif[dispAtual.id][jogador]) {
                Object.keys(GRUPOS).forEach(g => {
                    const palpite = DB.pClassif[dispAtual.id][jogador][g];
                    const real = DB.gabaritoClassif[g];
                    const resMetrica = obterMetricasClassif(palpite, real);
                    totalPontos += resMetrica.pontos; totaisExatos += resMetrica.exato; totaisResultados += resMetrica.resultado;
                });
            }
        }

        if (dispAtual.modo === 'rounds' || dispAtual.modo === 'ambos') {
            if (DB.pPlacar[dispAtual.id] && DB.pPlacar[dispAtual.id][jogador]) {
                PARTIDAS.forEach(p => {
                    const palpite = DB.pPlacar[dispAtual.id][jogador][p.id];
                    const real = DB.gabaritoPlacar[p.id];
                    const resMetrica = obterMetricasRodada(palpite, real);
                    totalPontos += resMetrica.pontos; totaisExatos += resMetrica.exato; totaisResultados += resMetrica.resultado;
                });
            }
        }
        listaPontuou.push({ nome: jogador, pontos: totalPontos, exatos: totaisExatos, resultados: totaisResultados });
    });

    listaPontuou.sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.exatos !== a.exatos) return b.exatos - a.exatos;
        return b.resultados - a.resultados;
    });

    if (!DB.historicoRanking[dispAtual.id]) DB.historicoRanking[dispAtual.id] = {};
    
    let htmlRanking = `<h2>🏆 Classificação Geral (${dispAtual.nome})</h2><div class="tabela-wrapper"><table><tr><th>Posição</th><th>Jogador</th><th>Pontos</th><th>Exatos</th><th>Resultados</th></tr>`;
    
    listaPontuou.forEach((item, index) => {
        const posAtual = index + 1;
        const posAntiga = DB.historicoRanking[dispAtual.id][item.nome];
        let seta = `<span style="color:#9ca3af; margin-right:5px;">▬</span>`;
        
        if (posAntiga) {
            if (posAtual < posAntiga) seta = `<span style="color:#10b981; margin-right:5px; font-weight:bold;">▲</span>`;
            if (posAtual > posAntiga) seta = `<span style="color:#ef4444; margin-right:5px; font-weight:bold;">▼</span>`;
        }
        
        DB.historicoRanking[dispAtual.id][item.nome] = posAtual;

        const ehLider = posAtual === 1;
        const classeLider = ehLider ? 'class="lider-row"' : '';
        const coroa = ehLider ? '👑 ' : '';

        htmlRanking += `<tr ${classeLider}>
            <td><strong>${posAtual}º</strong></td>
            <td>${seta} ${coroa}<a href="/?verSecador=${item.nome}" style="color:#f3f4f6; text-decoration:none; font-weight:600; border-bottom:1px dashed #f59e0b;">${item.nome.toUpperCase()}</a> ${item.nome === u ? '<span style="font-size:11px; color:#10b981;">(Você)</span>' : ''}</td>
            <td style="color:#10b981; font-weight:bold;">${item.pontos} pts</td>
            <td style="color:#9ca3af;">${item.exatos}</td>
            <td style="color:#9ca3af;">${item.resultados}</td>
        </tr>`;
    });
    htmlRanking += `</table></div>`;
    salvarDados();

    let htmlSecador = '';
    if (req.query.verSecador) {
        const alvo = req.query.verSecador.trim().toLowerCase();
        if (competidores.includes(alvo)) {
            htmlSecador = `<div class="secador-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="margin:0; font-size:14px; color:#3b82f6;">🔍 PALPITES DE: <span style="color:#f59e0b;">${alvo.toUpperCase()}</span></h3>
                    <a href="/" style="color:#ef4444; text-decoration:none; font-size:12px; font-weight:bold;">[Fechar X]</a>
                </div>`;
            const jogosFase = PARTIDAS.filter(p => p.fase === faseAtiva);
            jogosFase.forEach(p => {
                const palAlvo = (DB.pPlacar[dispAtual.id] && DB.pPlacar[dispAtual.id][alvo] && DB.pPlacar[dispAtual.id][alvo][p.id]) || { golA: '-', golB: '-' };
                if (verificarPrazoBloqueio(p.dataHora) || u === alvo) {
                    htmlSecador += `<div style="font-size:12px; background:#111827; padding:6px 12px; margin:4px 0; border-radius:6px; display:flex; justify-content:space-between;">
                        <span>${p.tA} ${palAlvo.golA} x ${palAlvo.golB} ${p.tB}</span><span>${p.grupo}</span>
                    </div>`;
                } else {
                    htmlSecador += `<div style="font-size:12px; background:#111827; padding:6px 12px; margin:4px 0; border-radius:6px; display:flex; justify-content:space-between; color:#4b5563;">
                        <span>${p.tA} 🔒 PRIVADO x 🔒 PRIVADO ${p.tB}</span><span style="font-size:10px;">Aberto</span>
                    </div>`;
                }
            });
            htmlSecador += `</div>`;
        }
    }

    let htmlRegrasModo = `<div class="regras-box"><h4 style="margin:0 0 10px 0; font-size:13px; color:#f59e0b; text-transform:uppercase;">📌 Regras de Pontuação</h4>`;
    if (dispAtual.modo === 'rounds' || dispAtual.modo === 'ambos') {
        htmlRegrasModo += `<div class="regras-item">✔️ <strong>25 pts:</strong> Placar exato. | ✔️ <strong>15 pts:</strong> Resultado. | ✔️ <strong>5 pts:</strong> Gols de 1 time.</div>`;
    }
    if (dispAtual.modo === 'groups' || dispAtual.modo === 'ambos') {
        htmlRegrasModo += `<div class="regras-item">✔️ <strong>25 pts:</strong> 1º e 2º exatos. | ✔️ <strong>15 pts:</strong> Dois invertidos. | ✔️ <strong>5 pts:</strong> Apenas 1 país.</div>`;
    }
    htmlRegrasModo += `</div>`;

    let htmlG = '';
    if (dispAtual.modo === 'groups' || dispAtual.modo === 'ambos') {
        const gruposBloqueados = verificarPrazoBloqueio(PARTIDAS[0].dataHora);
        Object.keys(GRUPOS).forEach(g => {
            const pal = (DB.pClassif[dispAtual.id] && DB.pClassif[dispAtual.id][u] && DB.pClassif[dispAtual.id][u][g]) || { primeiro: '', segundo: '' };
            const real = DB.gabaritoClassif[g] ? `<div style="margin-top:8px; font-size:11px; background:#1e1b4b; padding:6px; border-radius:4px; text-align:center;">Oficial: 1º ${DB.gabaritoClassif[g].primeiro} | 2º ${DB.gabaritoClassif[g].segundo}</div>` : '';
            htmlG += `<div class="card-g">
                <h3 style="color:#10b981; margin:0 0 10px 0; font-size:15px;">Grupo ${g} ${gruposBloqueados ? '🔒' : ''}</h3>
                ${GRUPOS[g].map(t => `<div style="margin:6px 0; font-size:13px; display:flex; align-items:center;">${badge(t)} ${t}</div>`).join('')}
                <form action="/palpite/grupo" method="POST" style="margin-top:12px;">
                    <input type="hidden" name="grupo" value="${g}">
                    <select name="primeiro" style="width:100%; margin-bottom:6px; padding:6px; font-size:13px;" ${gruposBloqueados ? 'disabled' : ''}><option value="">1º Lugar</option>${GRUPOS[g].map(t => `<option value="${t}" ${pal.primeiro===t?'selected':''}>${t}</option>`).join('')}</select>
                    <select name="segundo" style="width:100%; margin-bottom:10px; padding:6px; font-size:13px;" ${gruposBloqueados ? 'disabled' : ''}><option value="">2º Lugar</option>${GRUPOS[g].map(t => `<option value="${t}" ${pal.segundo===t?'selected':''}>${t}</option>`).join('')}</select>
                    <button type="submit" class="btn" style="width:100%; padding:6px; font-size:12px;" ${gruposBloqueados ? 'disabled' : ''}>Salvar Grupo</button>
                </form>
                ${real}
            </div>`;
        });
    }

    let htmlP = '';
    if (dispAtual.modo === 'rounds' || dispAtual.modo === 'ambos') {
        const jogosFase = PARTIDAS.filter(p => p.fase === faseAtiva);
        let contagemPalpites = {};
        competidores.forEach(comp => {
            if (DB.pPlacar[dispAtual.id] && DB.pPlacar[dispAtual.id][comp]) {
                Object.keys(DB.pPlacar[dispAtual.id][comp]).forEach(pId => {
                    const pal = DB.pPlacar[dispAtual.id][comp][pId];
                    if (pal && pal.golA !== '' && pal.golB !== '') {
                        if (!contagemPalpites[pId]) contagemPalpites[pId] = { timeA: 0, empate: 0, timeB: 0, total: 0 };
                        const gA = parseInt(pal.golA); const gB = parseInt(pal.golB);
                        if (gA > gB) contagemPalpites[pId].timeA++;
                        else if (gA < gB) contagemPalpites[pId].timeB++;
                        else contagemPalpites[pId].empate++;
                        contagemPalpites[pId].total++;
                    }
                });
            }
        });

        jogosFase.forEach(p => {
            const pal = (DB.pPlacar[dispAtual.id] && DB.pPlacar[dispAtual.id][u] && DB.pPlacar[dispAtual.id][u][p.id]) || { golA: '', golB: '' };
            const gabPlac = DB.gabaritoPlacar[p.id];
            
            let stringResultadoOficial = '';
            if (gabPlac) {
                let txtPen = (gabPlac.penA || gabPlac.penB) ? ` (Pên: ${gabPlac.penA}x${gabPlac.penB})` : '';
                stringResultadoOficial = `<div style="background:#1e1b4b; padding:2px 6px; border-radius:4px; font-size:11px; color:#6366f1;">Oficial: ${gabPlac.golA} x ${gabPlac.golB}${txtPen}</div>`;
            }

            const estaBloqueado = verificarPrazoBloqueio(p.dataHora);

            let stringTendencia = `📊 Sem palpites gravados`;
            if (contagemPalpites[p.id] && contagemPalpites[p.id].total > 0) {
                const cP = contagemPalpites[p.id];
                stringTendencia = `📊 Palpites: ${p.tA} ${Math.round((cP.timeA/cP.total)*100)}% | Empate ${Math.round((cP.empate/cP.total)*100)}% | ${p.tB} ${Math.round((cP.timeB/cP.total)*100)}%`;
            }

            htmlP += `<div class="card-p">
                <form action="/palpite/placar" method="POST" class="form-placar">
                    <input type="hidden" name="partidaId" value="${p.id}">
                    <div class="info-partida">${p.grupo.toUpperCase()} ${stringResultadoOficial}</div>
                    <div class="time-box casa"><span>${p.tA}</span> ${badge(p.tA)}</div>
                    <div class="placar-inputs">
                        <input type="number" name="golA" value="${pal.golA}" ${estaBloqueado ? 'disabled' : ''}>
                        <span style="font-weight:bold; color:#f59e0b;">X</span>
                        <input type="number" name="golB" value="${pal.golB}" ${estaBloqueado ? 'disabled' : ''}>
                    </div>
                    <div class="time-box fora">${badge(p.tB)} <span>${p.tB}</span></div>
                    <button type="submit" class="btn" style="padding:6px 12px; font-size:12px;" ${estaBloqueado ? 'disabled' : ''}>${estaBloqueado ? '🔒' : 'Salvar'}</button>
                </form>
                <div class="tendencia-bar">${stringTendencia}</div>
            </div>`;
        });
    }

    let htmlAdmin = '';
    if (u === 'admin') {
        let opcoesJogosFase = PARTIDAS.filter(p => p.fase === faseAtiva).map(p => `<option value="${p.id}">${p.grupo} - ${p.tA} x ${p.tB}</option>`).join('');
        let opcoesMembros = competidores.map(m => `<option value="${m}">${m.toUpperCase()}</option>`).join('');

        htmlAdmin = `
        <div class="admin-box">
            <h2 style="margin-top:0; color:#6366f1; border-left:5px solid #6366f1; font-size:14px;">⚙️ PAINEL DO ADMINISTRADOR</h2>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:15px;">
                
                <div style="background:#111827; padding:12px; border-radius:8px;">
                    <h4 style="margin:0 0 6px 0; font-size:12px; color:#9ca3af;">⚽ GABARITO OFICIAL</h4>
                    <form action="/admin/gabarito/placar" method="POST">
                        <select name="partidaId" style="width:100%; margin-bottom:10px; font-size:12px;">${opcoesJogosFase}</select>
                        <div style="display:flex; gap:10px; align-items:center; margin-bottom:6px; justify-content:center;">
                            <input type="number" name="golA" placeholder="Gols A" required style="width:65px; text-align:center;">
                            <span>X</span>
                            <input type="number" name="golB" placeholder="Gols B" required style="width:65px; text-align:center;">
                        </div>
                        <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px; justify-content:center;">
                            <input type="number" name="penA" placeholder="Pên A" style="width:65px; text-align:center; font-size:11px; background:#111827;">
                            <span style="font-size:10px; color:#475569;">Pênaltis</span>
                            <input type="number" name="penB" placeholder="Pên B" style="width:65px; text-align:center; font-size:11px; background:#111827;">
                        </div>
                        <button type="submit" class="btn" style="background:#6366f1; width:100%; font-size:12px;">Gravar Placar</button>
                    </form>
                </div>

                <div style="background:#111827; padding:12px; border-radius:8px;">
                    <h4 style="margin:0 0 6px 0; font-size:12px; color:#9ca3af;">📊 GABARITO GRUPOS</h4>
                    <form action="/admin/gabarito/grupo" method="POST">
                        <select name="grupo" id="admin_select_grupo" onchange="atualizarSeletorPaises(this.value)" style="width:100%; margin-bottom:10px; font-size:12px;">
                            ${Object.keys(GRUPOS).map(g => `<option value="${g}">Grupo ${g}</option>`).join('')}
                        </select>
                        <select name="primeiro" id="admin_primeiro" style="width:100%; margin-bottom:6px; font-size:12px;" required></select>
                        <select name="segundo" id="admin_segundo" style="width:100%; margin-bottom:10px; font-size:12px;" required></select>
                        <button type="submit" class="btn" style="background:#6366f1; width:100%; font-size:12px;">Gravar Ordem</button>
                    </form>
                </div>

                <div style="background:#111827; padding:12px; border-radius:8px; display:flex; flex-direction:column; gap:8px;">
                    <h4 style="margin:0; font-size:12px; color:#9ca3af;">👤 MODERAÇÃO DE MEMBROS</h4>
                    
                    <form action="/admin/usuario/senha" method="POST" style="border-bottom:1px solid #1f2937; padding-bottom:8px; margin:0;">
                        <select name="usuarioAlvo" style="width:100%; padding:4px; font-size:12px; margin-bottom:4px;">${opcoesMembros}</select>
                        <input type="text" name="novaSenha" placeholder="Nova Senha" required style="width:100%; padding:4px; font-size:12px; margin-bottom:4px;">
                        <button type="submit" class="btn" style="background:#475569; padding:4px; width:100%; font-size:11px;">Trocar Senha</button>
                    </form>

                    <form action="/admin/usuario/remover" method="POST" style="margin:0;" onsubmit="return confirm('Deseja mesmo remover este jogador?')">
                        <select name="usuarioAlvo" style="width:100%; padding:4px; font-size:12px; margin-bottom:4px;">${opcoesMembros}</select>
                        <button type="submit" class="btn" style="background:#ef4444; padding:4px; width:100%; font-size:11px;">Banir do Grupo</button>
                    </form>
                </div>

            </div>
        </div>`;
    }

    res.send(`${css}<div class="container">
        ${htmlTopo}
        ${htmlCriadorGrupo}
        ${htmlLinkConvite}
        ${htmlMural}
        ${htmlRanking}
        ${htmlSecador}
        ${htmlRegrasModo}
        ${htmlG ? `<h2>1. Classificados da Fase de Grupos</h2><div class="grid">${htmlG}</div>` : ''}
        ${htmlSeletorFases}
        ${htmlP ? `<h2>2. Placares da Rodada</h2><div>${htmlP}</div>` : ''}
        ${htmlAdmin}
    </div>
    ${SCRIPT_DINAMICO}`);
});

app.listen(PORT, () => console.log(`Servidor ativo na porta ${PORT}`));
