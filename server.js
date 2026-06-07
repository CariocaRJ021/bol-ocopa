const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'copa2026-key', resave: false, saveUninitialized: true }));

// 1. BANCO DE DADOS EM MEMÓRIA (Agora aceita novos cadastros via formulário)
const USUARIOS_CADASTRADOS = { "admin": "1234", "thiago": "1234", "sofia": "1234" };
const disputasBase = [{ id: "GLOBAL", nome: "Bolão Geral (AMBOS)", modo: "ambos" }];
const pClassif = {}; 
const pPlacar = {};

// 2. DICIONÁRIO DE BANDEIRAS OFICIAIS
const PAISES = { 
    "Estados Unidos": "us", "Jamaica": "jm", "Ucrânia": "ua", "África do Sul": "za",
    "México": "mx", "Costa Rica": "cr", "Polônia": "pl", "Tunísia": "tn",
    "Canadá": "ca", "Panamá": "pa", "Chéquia": "cz", "Argélia": "dz"
};

// 3. ESTRUTURA REAL DOS GRUPOS A, B e C
const GRUPOS = { 
    A: ["Estados Unidos", "Jamaica", "Ucrânia", "África do Sul"], 
    B: ["México", "Costa Rica", "Polônia", "Tunísia"], 
    C: ["Canadá", "Panamá", "Chéquia", "Argélia"] 
};

// 4. JOGOS REAIS DA 1ª RODADA ORGANIZADOS POR GRUPO
const PARTIDAS = [
    { id: 1, tA: "Estados Unidos", tB: "Jamaica", grupo: "A" },
    { id: 2, tA: "Ucrânia", tB: "África do Sul", grupo: "A" },
    { id: 3, tA: "México", tB: "Costa Rica", grupo: "B" },
    { id: 4, tA: "Polônia", tB: "Tunísia", grupo: "B" },
    { id: 5, tA: "Canadá", tB: "Panamá", grupo: "C" },
    { id: 6, tA: "Chéquia", tB: "Argélia", grupo: "C" }
];

function badge(time) {
    const c = PAISES[time];
    return c ? `<img src="https://flagcdn.com/w40/${c}.png" style="width:26px; border-radius:4px; vertical-align:middle; margin:0 6px;">` : '';
}

// 5. ROTAS DE AUTENTICAÇÃO (LOGIN E CADASTRO)
app.post('/login', (req, res) => {
    const user = req.body.username.trim().toLowerCase();
    if (USUARIOS_CADASTRADOS[user] && USUARIOS_CADASTRADOS[user] === req.body.password) {
        req.session.user = user;
        req.session.dispId = req.session.convitePendente || "GLOBAL";
        return res.redirect('/');
    }
    res.send("<h3>Erro! Usuário ou senha inválidos. <a href='/'>Voltar</a></h3>");
});

app.post('/cadastrar', (req, res) => {
    const user = req.body.username.trim().toLowerCase();
    const pass = req.body.password;

    if (!user || !pass) {
        return res.send("<h3>Erro! Usuário e senha são obrigatórios. <a href='/?tela=cadastro'>Voltar</a></h3>");
    }
    if (USUARIOS_CADASTRADOS[user]) {
        return res.send("<h3>Erro! Este usuário já existe. Escolha outro nome. <a href='/?tela=cadastro'>Voltar</a></h3>");
    }

    // Salva o novo amigo na memória do servidor
    USUARIOS_CADASTRADOS[user] = pass;
    
    // Faz o login automático do novo usuário
    req.session.user = user;
    req.session.dispId = req.session.convitePendente || "GLOBAL";
    res.redirect('/');
});

// ROTAS DE GERENCIAMENTO DE DISPUTAS E PALPITES
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

// 6. INTERFACE VISUAL COM CHAVEAMENTO DE TELA
app.get('/', (req, res) => {
    const css = `<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet"><style>body{background:#0b0f19;color:#f3f4f6;font-family:'Poppins',sans-serif;margin:0;padding:20px;}.container{max-width:1100px;margin:auto;}h2{color:#f59e0b;border-left:5px solid #10b981;padding-left:12px;font-size:18px;text-transform:uppercase;margin-top:40px;}.btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:8px 15px;font-weight:600;cursor:pointer;border-radius:6px; transition: 0.2s;} .btn:hover{opacity:0.9;} select,input{background:#1f2937;color:#fff;border:1px solid #374151;padding:8px;border-radius:6px;}.grid{display:flex;flex-wrap:wrap;gap:15px;justify-content:center;}.card-g{background:#111827;border:1px solid #1f2937;padding:15px;border-radius:12px;width:300px;border-top:4px solid #10b981;}.card-p{background:#111827;border:1px solid #1f2937;padding:12px 15px;margin:8px 0;border-radius:12px;border-left:5px solid #f59e0b;display:flex;justify-content:space-between;align-items:center;}.row{display:flex;align-items:center;gap:10px;width:38%;}table{width:100%;border-collapse:collapse;background:#111827;border-radius:8px;overflow:hidden;}th,td{padding:12px;text-align:left;border-bottom:1px solid #1f2937;}th{background:#10b981;color:#fff;}</style>`;

    if (req.query.convite) {
        req.session.convitePendente = req.query.convite.trim().toUpperCase();
    }

    // Tela de login e cadastro dinâmico para quem não está logado
    if (!req.session.user) {
        const querCadastro = req.query.tela === 'cadastro';
        
        if (querCadastro) {
            return res.send(`${css}<div style="display:flex; justify-content:center; align-items:center; min-height:90vh;"><div style="background:#111827; padding:40px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:400px; border-top:6px solid #10b981;"><h2>📝 CRIAR CONTA NO BOLÃO</h2><form action="/cadastrar" method="POST"><input type="text" name="username" placeholder="Escolha um Usuário" required style="width:100%; margin-bottom:15px;"><br><input type="password" name="password" placeholder="Defina uma Senha" required style="width:100%; margin-bottom:20px;"><br><button type="submit" class="btn" style="width:100%;">Finalizar Cadastro e Entrar</button></form><p style="margin-top:20px; font-size:13px; text-align:center;"><a href="/" style="color:#f59e0b; text-decoration:none;">Já tem conta? Faça Login</a></p></div></div>`);
        } else {
            return res.send(`${css}<div style="display:flex; justify-content:center; align-items:center; min-height:90vh;"><div style="background:#111827; padding:40px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:400px; border-top:6px solid #f59e0b;"><h2>🏆 ENTRAR NO BOLÃO</h2><form action="/login" method="POST"><input type="text" name="username" placeholder="Usuário" required style="width:100%; margin-bottom:15px;"><br><input type="password" name="password" placeholder="Senha" required style="width:100%; margin-bottom:20px;"><br><button type="submit" class="btn" style="width:100%;">Acessar Sistema</button></form><p style="margin-top:20px; font-size:13px; text-align:center;"><a href="/?tela=cadastro" style="color:#10b981; text-decoration:none; font-weight:bold;">Não tem uma conta? Cadastre-se aqui</a></p></div></div>`);
        }
    }

    const u = req.session.user; 
    const dId = req.session.dispId;
    const dispAtual = disputasBase.find(d => d.id === dId) || disputasBase[0];

    let htmlLinkConvite = '';
    if (dispAtual.id !== 'GLOBAL') {
        const linkCompleto = `https://meu-bolao-2026.onrender.com/?convite=${dispAtual.id}`;
        htmlLinkConvite = `
            <div style="background:#111827; border:1px solid #1f2937; padding:15px; margin-bottom:20px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:14px; color:#9ca3af;">✉️ Link de convite para este grupo:</span>
                <input type="text" value="${linkCompleto}" readonly onclick="this.select(); document.execCommand('copy'); alert('Link copiado!');" style="width:340px; color:#f59e0b; text-align:center; font-weight:bold; cursor:pointer;">
            </div>`;
    }

    let htmlRanking = `<h2>🏆 Classificação Geral (${dispAtual.nome})</h2><table><tr><th>Posição</th><th>Jogador</th><th>Pontos Ganhos</th></tr>`;
    // Lista dinamicamente o usuário logado se ele for novo
    const listaJogadores = ["thiago", "sofia", "admin"];
    if (!listaJogadores.includes(u)) { listaJogadores.push(u); }

    listaJogadores.forEach((p, index) => {
        let pontosSimulados = p === "thiago" ? 12 : (p === "sofia" ? 9 : 0);
        htmlRanking += `<tr><td><strong>${index + 1}º</strong></td><td>${p.toUpperCase()}</td><td style="color:#10b981; font-weight:bold;">${pontosSimulados} pts</td></tr>`;
    });
    htmlRanking += `</table>`;

    let htmlG = '';
    if (dispAtual.modo === 'grupos' || dispAtual.modo === 'ambos') {
        Object.keys(GRUPOS).forEach(g => {
            const pal = (pClassif[dispAtual.id] && pClassif[dispAtual.id][u] && pClassif[dispAtual.id][u][g]) || { primeiro: '', segundo: '' };
            htmlG += `<div class="card-g"><h3 style="color:#10b981; margin:0 0 10px 0;">Grupo ${g}</h3><form action="/palpite/grupo" method="POST"><input type="hidden" name="grupo" value="${g}"><select name="primeiro" style="width:100%; margin-bottom:5px;"><option value="">1º Lugar</option>${GRUPOS[g].map(t => `<option value="${t}" ${pal.primeiro===t?'selected':''}>${t}</option>`).join('')}</select><select name="segundo" style="width:100%; margin-bottom:10px;"><option value="">2º Lugar</option>${GRUPOS[g].map(t => `<option value="${t}" ${pal.segundo===t?'selected':''}>${t}</option>`).join('')}</select><button type="submit" class="btn" style="width:100%; padding:4px; font-size:12px;">Salvar Grupo</button></form></div>`;
        });
    }

    let htmlP = '';
    if (dispAtual.modo === 'placares' || dispAtual.modo === 'ambos') {
        PARTIDAS.forEach(p => {
            const pal = (pPlacar[dispAtual.id] && pPlacar[dispAtual.id][u] && pPlacar[dispAtual.id][u][p.id]) || { golA: '', golB: '' };
            htmlP += `<div class="card-p"><form action="/palpite/placar" method="POST" style="display:flex; width:100%; justify-content:space-between; align-items:center; margin:0;"><input type="hidden" name="partidaId" value="${p.id}"><div style="font-size:11px; color:#10b981; font-weight:bold; width:50px;">GRP ${p.grupo}</div><div class="row" style="justify-content:flex-end; text-align:right;"><span>${p.tA}</span> ${badge(p.tA)}</div><div style="display:flex; align-items:center; gap:5px;"><input type="number" name="golA" value="${pal.golA}" style="width:45px; text-align:center;"><span>X</span><input type="number" name="golB" value="${pal.golB}" style="width:45px; text-align:center;"></div><div class="row">${badge(p.tB)} <span>${p.tB}</span></div><button type="submit" class="btn" style="padding:4px 10px; font-size:12px;">Salvar</button></form></div>`;
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
        ${htmlG ? `<h2>1. Classificados da Fase de Grupos</h2><div class="grid">${htmlG}</div>` : ''}
        ${htmlP ? `<h2>2. Placares da Rodada</h2><div>${htmlP}</div>` : ''}
    </div>`);
});

app.listen(PORT, () => console.log('Servidor ativo na nuvem!'));
