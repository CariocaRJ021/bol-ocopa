const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const axios = require('axios'); // Para buscar os dados da porta 3001
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'copa2026-key', resave: false, saveUninitialized: true }));

const PAISES = { "México": "mx", "África do Sul": "za", "Coreia do Sul": "kr", "Chéquia": "cz", "Canadá": "ca", "Brasil": "br", "Marrocos": "ma", "Estados Unidos": "us", "Paraguai": "py", "Alemanha": "de", "Inglaterra": "gb-eng", "Croácia": "hr" };
const GRUPOS = { A: ["México", "África do Sul", "Coreia do Sul", "Chéquia"], B: ["Canadá", "Bósnia e Herzegovina", "Catar", "Suíça"], C: ["Brasil", "Marrocos", "Haiti", "Escócia"] };

const PARTIDAS = [];
let idJogo = 1;
Object.keys(GRUPOS).forEach(g => {
    const times = GRUPOS[g];
    PARTIDAS.push({ id: idJogo++, tA: times[0], tB: times[1], grupo: g });
});

const USUARIOS_CADASTRADOS = { "admin": "1234", "thiago": "1234", "sofia": "1234" };
let disputasBase = [{ id: "disp-1", nome: "Bolão da Firma (AMBOS)", modo: "ambos" }];

const pClassif = {}; const pPlacar = {};

function badge(time) {
    const c = PAISES[time];
    return c ? `<img src="https://flagcdn.com/w40/${c}.png" style="width:26px; border-radius:4px; vertical-align:middle; margin:0 6px;">` : '';
}

app.post('/login', (req, res) => {
    const user = req.body.username.trim().toLowerCase();
    if (USUARIOS_CADASTRADOS[user] && USUARIOS_CADASTRADOS[user] === req.body.password) {
        req.session.user = user;
        req.session.dispId = disputasBase[0].id;
        return res.redirect('/');
    }
    res.send("<h3>Erro! <a href='/'>Voltar</a></h3>");
});

// AQUI O CONVIDADO DIGITA O CÓDIGO E ADICIONA O GRUPO PRIVADO NO PAINEL DELE!
app.post('/grupo/entrar', async (req, res) => {
    const cod = req.body.codigo.trim().toUpperCase();
    try {
        const response = await axios.get('http://localhost:3001/api/disputas');
        const grupoEncontrado = response.data.find(g => g.codigo === cod);
        if (grupoEncontrado && !disputasBase.find(d => d.id === grupoEncontrado.codigo)) {
            disputasBase.push({ id: grupoEncontrado.codigo, nome: grupoEncontrado.nome, modo: grupoEncontrado.modo });
            req.session.dispId = grupoEncontrado.codigo;
        }
    } catch (e) { console.log("Erro ao buscar API"); }
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

app.get('/', async (req, res) => {
    const css = `<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet"><style>body{background:#0b0f19;color:#f3f4f6;font-family:'Poppins',sans-serif;margin:0;padding:20px;}.container{max-width:1100px;margin:auto;}h2{color:#f59e0b;border-left:5px solid #10b981;padding-left:12px;font-size:18px;text-transform:uppercase;margin-top:40px;}.btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:8px 15px;font-weight:600;cursor:pointer;border-radius:6px;}select,input{background:#1f2937;color:#fff;border:1px solid #374151;padding:8px;border-radius:6px;}.grid{display:flex;flex-wrap:wrap;gap:15px;justify-content:center;}.card-g{background:#111827;border:1px solid #1f2937;padding:15px;border-radius:12px;width:300px;border-top:4px solid #10b981;}.card-p{background:#111827;border:1px solid #1f2937;padding:12px 15px;margin:8px 0;border-radius:12px;border-left:5px solid #f59e0b;display:flex;justify-content:space-between;align-items:center;}.row{display:flex;align-items:center;gap:10px;width:38%;}table{width:100%;border-collapse:collapse;background:#111827;border-radius:8px;overflow:hidden;}th,td{padding:12px;text-align:left;border-bottom:1px solid #1f2937;}th{background:#10b981;color:#fff;}</style>`;

    if (!req.session.user) {
        return res.send(`${css}<div style="display:flex; justify-content:center; align-items:center; min-height:90vh;"><div style="background:#111827; padding:40px; border-radius:16px; border:1px solid #1f2937; width:100%; max-width:400px; border-top:6px solid #f59e0b;"><h2>🏆 ENTRAR NO BOLÃO</h2><form action="/login" method="POST"><input type="text" name="username" placeholder="Usuário" required style="width:100%; margin-bottom:15px;"><br><input type="password" name="password" placeholder="Senha" required style="width:100%; margin-bottom:20px;"><br><button type="submit" class="btn" style="width:100%;">Acessar Sistema</button></form></div></div>`);
    }

    // Sincroniza disputas da API na porta 3001 de forma invisível e leve
    try {
        const response = await axios.get('http://localhost:3001/api/disputas');
        response.data.forEach(grupoEncontrado => {
            if (!disputasBase.find(d => d.id === grupoEncontrado.codigo)) {
                disputasBase.push({ id: grupoEncontrado.codigo, nome: grupoEncontrado.nome, modo: grupoEncontrado.modo });
            }
        });
    } catch(e){}

    const u = req.session.user; const dId = req.session.dispId;
    const dispAtual = disputasBase.find(d => d.id === dId) || disputasBase[0];

    // MONTAGEM DA TABELA DE CLASSIFICAÇÃO / RANKING DE PONTOS DO GRUPO ATUAL
    let listaParticipantes = ["thiago", "sofia", "admin"];
    let htmlRanking = `<h2>🏆 Classificação Geral da Disputa Activa</h2><table><tr><th>Posição</th><th>Jogador</th><th>Pontos Ganhos</th></tr>`;
    listaParticipantes.forEach((p, index) => {
        // Lógica de cálculo estática simulada (na etapa de conferência real, cruza palpites vs resultados)
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

    res.send(`${css}<div class="container"><div style="background:#111827; padding:20px; border-radius:12px; border:1px solid #374151; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:20px;"><div><h1 style="margin:0; font-size:20px;">🏆 COPA 2026 — BOLÃO</h1><p style="margin:2px 0 0 0; color:#9ca3af; font-size:13px;">Jogador: <strong style="color:#f59e0b;">${u.toUpperCase()}</strong> | <a href="/logout" style="color:#ef4444; text-decoration:none;">[Sair]</a></p></div><div style="display:flex; gap:10px; align-items:center;"><form action="/grupo/entrar" method="POST" style="margin:0;"><input type="text" name="codigo" placeholder="Código do Convite" required style="padding:5px; width:130px; font-size:12px;"><button type="submit" class="btn" style="padding:5px 10px; font-size:12px;">Entrar</button></form><form action="/disputa/selecionar" method="POST" style="margin:0;"><select name="disputaId" onchange="this.form.submit()" style="padding:5px; font-weight:bold; color:#f59e0b;">${disputasBase.map(d => `<option value="${d.id}" ${dispAtual.id===d.id?'selected':''}>${d.nome}</option>`).join('')}</select></form></div></div>${htmlRanking}${htmlG ? `<h2>1. Classificados da Fase de Grupos</h2><div class="grid">${htmlG}</div>` : ''}${htmlP ? `<h2>2. Placares da Rodada</h2><div>${htmlP}</div>` : ''}</div>`);
});

app.listen(3000, () => console.log('App rodando em http://localhost:3000'));