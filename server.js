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
    pPlacar: {},
    gabaritoClassif: {}, 
    gabaritoPlacar: {}    
};

function carregarDados() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const conteudo = fs.readFileSync(DATA_FILE, 'utf8');
            DB = JSON.parse(conteudo);
            if (!DB.gabaritoClassif) DB.gabaritoClassif = {};
            if (!DB.gabaritoPlacar) DB.gabaritoPlacar = {};
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

function vincularAoGrupo(disputaId, usuario) {
    if (!DB.membros[disputaId]) { DB.membros[disputaId] = []; }
    if (!DB.membros[disputaId].includes(usuario)) { DB.membros[disputaId].push(usuario); }
    salvarDados();
}

// --- MOTORES DE CÁLCULO DE PONTOS ---
function calcularPontosPlacar(palpite, real) {
    if (!palpite || palpite.golA === '' || palpite.golB === '' || !real || real.golA === '' || real.golB === '') return 0;
    
    const gA_pal = parseInt(palpite.golA);
    const gB_pal = parseInt(palpite.golB);
    const gA_real = parseInt(real.golA);
    const gB_real = parseInt(real.golB);

    if (gA_pal === gA_real && gB_pal === gB_real) return 25;

    const saldo_pal = gA_pal - gB_pal;
    const saldo_real = gA_real - gB_real;
    const acertouResultado = (saldo_pal > 0 && saldo_real > 0) || (saldo_pal < 0 && saldo_real < 0) || (saldo_pal === 0 && saldo_real === 0);

    if (acertouResultado) return 15;
    if (gA_pal === gA_real || gB_pal === gB_real) return 5;

    return 0;
}

function calcularPontosClassif(palpite, real) {
    if (!palpite || !palpite.primeiro || !palpite.segundo || !real || !real.primeiro || !real.segundo) return 0;

    if (palpite.primeiro === real.primeiro && palpite.segundo === real.segundo) return 25;
    if (palpite.primeiro === real.segundo && palpite.segundo === real.primeiro) return 15;
    if (palpite.primeiro === real.primeiro || palpite.segundo === real.segundo || palpite.primeiro === real.segundo || palpite.segundo === real.primeiro) return 5;

    return 0;
}

// SCRIPT MELHORADO: Controla os selects do admin e gerencia a memória de posição do Scroll (LocalStorage)
const SCRIPT_DINAMICO = `
<script>
    const gruposData = ${JSON.stringify(GRUPOS)};
    
    function atualizarSeletorPaises(grupoLetra) {
        const p1 = document.getElementById('admin_primeiro');
        const p2 = document.getElementById('admin_segundo');
        if(!p1 || !p2) return;
        const paises = gruposData[grupoLetra] || [];
        
        p1.innerHTML = '<option value="">Escolha o 1º</option>';
        p2.innerHTML = '<option value="">Escolha o 2º</option>';
        
        paises.forEach(p => {
            p1.innerHTML += \`<option value="\${p}">\${p}</option>\`;
            p2.innerHTML += \`<option value="\${p}">\${p}</option>\`;
        });
    }

    // Grava a posição do Scroll quando o usuário move a tela
    window.addEventListener('scroll', function() {
        localStorage.setItem('bolao_scroll_pos', window.scrollY);
    });

    window.onload = function() {
        const selectGrupo = document.getElementById('admin_select_grupo');
        if(selectGrupo) { atualizarSeletorPaises(selectGrupo.value); }

        // Restaura a posição salva do scroll se ela existir
        const posSalva = localStorage.getItem('bolao_scroll_pos');
        if (posSalva) {
            window.scrollTo({
                top: parseInt(posSalva),
                behavior: 'instant'
            });
        }
    }
</script>
`;

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
    salvarDados(); 

    res.redirect('/');
});

app.post('/fase/selecionar', (req, res) => {
    req.session.faseAtiva = req.body.faseId;
    res.redirect('/');
});
app.get('/fase/selecionar', (req, res) => { res.redirect('/'); });

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

app.post('/admin/gabarito/grupo', (req, res) => {
    if (req.session.user !== 'admin') return res.status(403).send("Acesso negado.");
    const { grupo, primeiro, segundo } = req.body;
    if(!primeiro || !segundo) return res.send("<h3>Selecione os dois países! <a href='/'>Voltar</a></h3>");
    DB.gabaritoClassif[grupo] = { primeiro, segundo };
    salvarDados();
    res.redirect('/');
});

app.post('/admin/gabarito/placar', (req, res) => {
    if (req.session.user !== 'admin') return res.status(403).send("Acesso negado.");
    const { partidaId, golA, golB } = req.body;
    DB.gabaritoPlacar[partidaId] = { golA, golB };
    salvarDados();
    res.redirect('/');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// --- ROTA INTERFACE PRINCIPAL ---
app.get('/', (req, res) => {
    const css = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body{background:#0b0f19;color:#f3f4f6;font-family:'Poppins',sans-serif;margin:0;padding:12px;} 
        .container{max-width:1100px;margin:auto;} 
        h2{color:#f59e0b;border-left:5px solid #10b981;padding-left:12px;font-size:16px;text-transform:uppercase;margin-top:30px;margin-bottom:15px;} 
        .btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:10px 15px;font-weight:600;cursor:pointer;border-radius:6px;transition:0.2s;} 
        .btn:hover{opacity:0.9;} 
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
        
        .flex-wrap-header{display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap;}
        .tabela-wrapper{width:100%;overflow-x:auto;background:#111827;border-radius:8px;}
        table{width:100%;border-collapse:collapse;min-width:400px;} 
        th,td{padding:12px;text-align:left;border-bottom:1px solid #1f2937;font-size:14px;} 
        th{background:#10b981;color:#fff;} 
        .regras-box{background:#111827;border:1px solid #1f2937;padding:15px;border-radius:12px;margin-top:15px;border-left:5px solid #10b981;} 
        .regras-item{margin:6px 0;font-size:13px;color:#9ca3af;} 
        .admin-box{background:#1e1b4b;border:2px dashed #6366f1;padding:15px;border-radius:12px;margin-top:30px;}

        @media(max-width:600px){
            body{padding:8px;}
            .form-placar{flex-direction:column;align-items:stretch;text-align:center;}
            .time-box.casa{justify-content:center;text-align:center;}
            .time-box.fora{justify-content:center;text-align:center;}
            .placar-inputs{justify-content:center;margin:10px 0;}
            .info-partida{text-align:center;width:100%;border-bottom:1px dashed #374151;padding-bottom:5px;}
            .form-placar button{width:100%;}
            .flex-wrap-header{flex-direction:column;align-items:stretch;text-align:center;}
            .flex-wrap-header form{width:100%;}
            .flex-wrap-header select, .flex-wrap-header input{width:100%;}
        }
    </style>`;

    if (req.query.convite) { req.session.convitePendente = req.query.convite.trim().toUpperCase(); }

    if (!req.session.user) {
        if (req.query.tela === 'cadastro') {
            return res.send(`${css}<div style="display:flex; justify-content:center; align-items:center; min-height:90vh;"><div style="background:#111827; padding:25px 20px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:360px; border-top:6px solid #10b981; box-sizing:border-box;"><h2>📝 CRIAR CADASTRO</h2><form action="/cadastrar" method="POST"><input type="text" name="username" placeholder="Escolha seu Usuário" required style="width:100%; margin-bottom:15px;"><br><input type="password" name="password" placeholder="Crie uma Senha" required style="width:100%; margin-bottom:20px;"><br><button type="submit" class="btn" style="width:100%;">Registrar e Entrar</button></form><p style="margin-top:20px; font-size:13px; text-align:center;"><a href="/" style="color:#f59e0b; text-decoration:none;">Já tem conta? Faça seu Login</a></p></div></div>`);
        } else {
            return res.send(`${css}<div style="display:flex; justify-content:center; align-items:center; min-height:90vh;"><div style="background:#111827; padding:25px 20px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:360px; border-top:6px solid #f59e0b; box-sizing:border-box;"><h2>🏆 ENTRAR NO BOLÃO</h2><form action="/login" method="POST"><input type="text" name="username" placeholder="Usuário" required style="width:100%; margin-bottom:15px;"><br><input type="password" name="password" placeholder="Senha" required style="width:100%; margin-bottom:20px;"><br><button type="submit" class="btn" style="width:100%;">Acessar Sistema</button></form><p style="margin-top:20px; font-size:13px; text-align:center;"><a href="/?tela=cadastro" style="color:#10b981; text-decoration:none; font-weight:bold;">Não tem conta? Cadastre-se aqui</a></p></div></div>`);
        }
    }

    const u = req.session.user; 
    const dId = req.session.dispId || "GLOBAL";
    const faseAtiva = req.session.faseAtiva || "r1";
    const dispAtual = DB.disputas.find(d => d.id === dId) || DB.disputas[0];

    let htmlLinkConvite = '';
    if (dispAtual.id !== 'GLOBAL') {
        htmlLinkConvite = `
            <div style="background:#111827; border:1px solid #1f2937; padding:15px; margin-bottom:20px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <span style="font-size:14px; color:#9ca3af;">✉️ Link de convite do grupo:</span>
                <input type="text" value="https://${req.get('host')}/?convite=${dispAtual.id}" readonly onclick="this.select(); alert('Link copiado!');" style="flex:1; min-width:240px; color:#f59e0b; text-align:center; font-weight:bold; background:#1f2937; border:1px solid #374151; padding:6px; border-radius:4px;">
            </div>`;
    }

    let htmlTopo = `
    <div style="background:#111827; padding:15px; border-radius:12px; border:1px solid #374151; margin-bottom:20px;" class="flex-wrap-header">
        <div><h1 style="margin:0; font-size:18px;">🏆 COPA 2026 — BOLÃO</h1><p style="margin:2px 0 0 0; color:#9ca3af; font-size:13px;">Jogador: <strong style="color:#f59e0b;">${u.toUpperCase()}</strong> | <a href="/logout" style="color:#ef4444; text-decoration:none;">[Sair]</a></p></div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;" class="flex-wrap-header">
            <form action="/grupo/entrar" method="POST" style="margin:0; display:flex; gap:5px;"><input type="text" name="codigo" placeholder="Código" style="padding:6px; width:90px; font-size:12px;"><button type="submit" class="btn" style="padding:6px 10px; font-size:12px;">Entrar</button></form>
            <form action="/disputa/selecionar" method="POST" style="margin:0;"><select name="disputaId" onchange="this.form.submit()" style="padding:6px; font-weight:bold; color:#f59e0b;">${DB.disputas.map(d => `<option value="${d.id}" ${dispAtual.id===d.id?'selected':''}>${d.nome}</option>`).join('')}</select></form>
        </div>
    </div>`;

    let htmlCriadorGrupo = `
    <div style="background:#111827; border:1px solid #1f2937; padding:15px; border-radius:12px; margin-bottom:20px;">
        <h3 style="color:#f59e0b; margin:0 0 12px 0; font-size:13px; text-transform:uppercase;">➕ Criar Novo Grupo de Disputa</h3>
        <form action="/grupo/criar" method="POST" style="display:flex; gap:10px; flex-direction:column;" onsubmit="this.style.opacity='0.5'">
            <input type="text" name="nome" placeholder="Nome do Grupo" required style="width:100%;">
            <select name="modo" style="color:#f59e0b; font-weight:bold; width:100%;">
                <option value="ambos">Modo: Ambos (Grupos e Rodadas)</option>
                <option value="groups">Modo: Apenas Grupos</option>
                <option value="rounds">Modo: Apenas Rodadas</option>
            </select>
            <button type="submit" class="btn" style="width:100%;">Gerar Grupo Privado</button>
        </form>
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
    const competidores = DB.membros[dispAtual.id] || [u];
    
    competidores.forEach(jogador => {
        let totalPontos = 0;

        if (dispAtual.modo === 'groups' || dispAtual.modo === 'ambos') {
            if (DB.pClassif[dispAtual.id] && DB.pClassif[dispAtual.id][jogador]) {
                Object.keys(GRUPOS).forEach(g => {
                    const palpite = DB.pClassif[dispAtual.id][jogador][g];
                    const real = DB.gabaritoClassif[g];
                    totalPontos += calcularPontosClassif(palpite, real);
                });
            }
        }

        if (dispAtual.modo === 'rounds' || dispAtual.modo === 'ambos') {
            if (DB.pPlacar[dispAtual.id] && DB.pPlacar[dispAtual.id][jogador]) {
                PARTIDAS.forEach(p => {
                    const palpite = DB.pPlacar[dispAtual.id][jogador][p.id];
                    const real = DB.gabaritoPlacar[p.id];
                    totalPontos += calcularPontosPlacar(palpite, real);
                });
            }
        }

        listaPontuou.push({ nome: joker = jogador, pontos: totalPontos });
    });

    listaPontuou.sort((a, b) => b.pontos - a.pontos);

    let htmlRanking = `<h2>🏆 Classificação Geral</h2><div class="tabela-wrapper"><table><tr><th>Posição</th><th>Jogador</th><th>Pontos</th></tr>`;
    listaPontuou.forEach((item, index) => {
        htmlRanking += `<tr><td><strong>${index + 1}º</strong></td><td>${item.nome.toUpperCase()}</td><td style="color:#10b981; font-weight:bold;">${item.pontos} pts</td></tr>`;
    });
    htmlRanking += `</table></div>`;

    let htmlRegrasModo = `<div class="regras-box"><h4 style="margin:0 0 10px 0; font-size:13px; color:#f59e0b; text-transform:uppercase;">📌 Regras de Pontuação</h4>`;
    if (dispAtual.modo === 'rounds' || dispAtual.modo === 'ambos') {
        htmlRegrasModo += `
        <div style="margin-bottom: 4px; font-size:12px; font-weight:bold; color:#10b981;">⚽ Placares:</div>
        <div class="regras-item">✔️ <strong>25 pts:</strong> Placar exato. | ✔️ <strong>15 pts:</strong> Resultado. | ✔️ <strong>5 pts:</strong> Gols de 1 time.</div>`;
    }
    if (dispAtual.modo === 'ambos') { htmlRegrasModo += `<div style="margin: 10px 0; border-top: 1px dashed #374151;"></div>`; }
    if (dispAtual.modo === 'groups' || dispAtual.modo === 'ambos') {
        htmlRegrasModo += `
        <div style="margin-bottom: 4px; font-size:12px; font-weight:bold; color:#10b981;">📊 Grupos:</div>
        <div class="regras-item">✔️ <strong>25 pts:</strong> 1º e 2º exatos. | ✔️ <strong>15 pts:</strong> Dois invertidos. | ✔️ <strong>5 pts:</strong> Apenas 1 país.</div>`;
    }
    htmlRegrasModo += `</div>`;

    let htmlG = '';
    if (dispAtual.modo === 'groups' || dispAtual.modo === 'ambos') {
        Object.keys(GRUPOS).forEach(g => {
            const pal = (DB.pClassif[dispAtual.id] && DB.pClassif[dispAtual.id][u] && DB.pClassif[dispAtual.id][u][g]) || { primeiro: '', segundo: '' };
            const real = DB.gabaritoClassif[g] ? `<div style="margin-top:8px; font-size:11px; background:#1e1b4b; padding:6px; border-radius:4px; text-align:center; color:#a5b4fc;">Oficial: 1º ${DB.gabaritoClassif[g].primeiro} | 2º ${DB.gabaritoClassif[g].segundo}</div>` : '';
            
            htmlG += `<div class="card-g">
                <h3 style="color:#10b981; margin:0 0 10px 0; font-size:15px;">Grupo ${g}</h3>
                ${GRUPOS[g].map(t => `<div style="margin:6px 0; font-size:13px; display:flex; align-items:center;">${badge(t)} ${t}</div>`).join('')}
                <form action="/palpite/grupo" method="POST" style="margin-top:12px;">
                    <input type="hidden" name="grupo" value="${g}">
                    <select name="primeiro" style="width:100%; margin-bottom:6px; padding:6px; font-size:13px;"><option value="">1º Lugar</option>${GRUPOS[g].map(t => `<option value="${t}" ${pal.primeiro===t?'selected':''}>${t}</option>`).join('')}</select>
                    <select name="segundo" style="width:100%; margin-bottom:10px; padding:6px; font-size:13px;"><option value="">2º Lugar</option>${GRUPOS[g].map(t => `<option value="${t}" ${pal.segundo===t?'selected':''}>${t}</option>`).join('')}</select>
                    <button type="submit" class="btn" style="width:100%; padding:6px; font-size:12px;">Salvar Grupo</button>
                </form>
                ${real}
            </div>`;
        });
    }

    let htmlP = '';
    if (dispAtual.modo === 'rounds' || dispAtual.modo === 'ambos') {
        const jogosFase = PARTIDAS.filter(p => p.fase === faseAtiva);
        jogosFase.forEach(p => {
            const pal = (DB.pPlacar[dispAtual.id] && DB.pPlacar[dispAtual.id][u] && DB.pPlacar[dispAtual.id][u][p.id]) || { golA: '', golB: '' };
            const real = DB.gabaritoPlacar[p.id] ? `<div style="background:#1e1b4b; padding:2px 6px; border-radius:4px; font-size:11px; color:#6366f1; text-align:center;">Oficial: ${DB.gabaritoPlacar[p.id].golA} x ${DB.gabaritoPlacar[p.id].golB}</div>` : '';

            htmlP += `<div class="card-p">
                <form action="/palpite/placar" method="POST" class="form-placar">
                    <input type="hidden" name="partidaId" value="${p.id}">
                    <div class="info-partida">${p.grupo.toUpperCase()} ${real}</div>
                    
                    <div class="time-box casa"><span>${p.tA}</span> ${badge(p.tA)}</div>
                    
                    <div class="placar-inputs">
                        <input type="number" name="golA" value="${pal.golA}">
                        <span style="font-weight:bold; color:#f59e0b;">X</span>
                        <input type="number" name="golB" value="${pal.golB}">
                    </div>
                    
                    <div class="time-box fora">${badge(p.tB)} <span>${p.tB}</span></div>
                    
                    <button type="submit" class="btn" style="padding:6px 12px; font-size:12px;">Salvar</button>
                </form>
            </div>`;
        });
    }

    let htmlAdmin = '';
    if (u === 'admin') {
        let opcoesJogosFase = PARTIDAS.filter(p => p.fase === faseAtiva).map(p => `<option value="${p.id}">${p.grupo} - ${p.tA} x ${p.tB}</option>`).join('');
        
        htmlAdmin = `
        <div class="admin-box">
            <h2 style="margin-top:0; color:#6366f1; border-left:5px solid #6366f1; font-size:14px;">⚙️ PAINEL DO ADMINISTRADOR</h2>
            <div style="display:flex; gap:15px; flex-direction:column;">
                
                <div style="background:#111827; padding:12px; border-radius:8px;">
                    <h4 style="margin:0 0 8px 0; color:#fff; font-size:13px;">⚽ Placar Oficial</h4>
                    <form action="/admin/gabarito/placar" method="POST">
                        <select name="partidaId" style="width:100%; margin-bottom:10px; font-size:13px;">${opcoesJogosFase}</select>
                        <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px; justify-content:center;">
                            <input type="number" name="golA" placeholder="Gols A" required style="width:70px; text-align:center;">
                            <span>X</span>
                            <input type="number" name="golB" placeholder="Gols B" required style="width:70px; text-align:center;">
                        </div>
                        <button type="submit" class="btn" style="background:linear-gradient(135deg,#6366f1,#4f46e5); width:100%; font-size:13px;">Gravar Placar</button>
                    </form>
                </div>

                <div style="background:#111827; padding:12px; border-radius:8px;">
                    <h4 style="margin:0 0 8px 0; color:#fff; font-size:13px;">📊 Classificados Oficiais</h4>
                    <form action="/admin/gabarito/grupo" method="POST">
                        <select name="grupo" id="admin_select_grupo" onchange="atualizarSeletorPaises(this.value)" style="width:100%; margin-bottom:10px; font-size:13px;">
                            ${Object.keys(GRUPOS).map(g => `<option value="${g}">Grupo ${g}</option>`).join('')}
                        </select>
                        <select name="primeiro" id="admin_primeiro" style="width:100%; margin-bottom:6px; font-size:13px;" required></select>
                        <select name="segundo" id="admin_segundo" style="width:100%; margin-bottom:10px; font-size:13px;" required></select>
                        <button type="submit" class="btn" style="background:linear-gradient(135deg,#6366f1,#4f46e5); width:100%; font-size:13px;">Gravar Grupo</button>
                    </form>
                </div>

            </div>
        </div>`;
    }

    res.send(`${css}<div class="container">
        ${htmlTopo}
        ${htmlCriadorGrupo}
        ${htmlLinkConvite}
        ${htmlRanking}
        ${htmlRegrasModo}
        ${htmlG ? `<h2>1. Classificados da Fase de Grupos</h2><div class="grid">${htmlG}</div>` : ''}
        ${htmlSeletorFases}
        ${htmlP ? `<h2>2. Placares da Rodada</h2><div>${htmlP}</div>` : ''}
        ${htmlAdmin}
    </div>
    ${SCRIPT_DINAMICO}`); // Script injetado globalmente no fim do body
});

app.listen(PORT, () => console.log(`Servidor ativo na porta ${PORT}`));
