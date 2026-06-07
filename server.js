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
    fs.writeFileSync(DATA_FILE, JSON.stringify(DB, null, 2), 'utf8');
}
carregarDados();

// --- DICIONÁRIO DE BANDEIRAS ATUALIZADO (CONFORME OS PRINTS ENVIADOS) ---
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

// --- GRUPOS OFICIAIS CORRIGIDOS EXATAMENTE CONFORME OS PRINTS (48 Seleções) ---
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

// --- GERADOR DINÂMICO DO CALENDÁRIO COMPLETO (24 JOGOS POR RODADA - TOTAL 72 JOGOS) ---
const PARTIDAS = [];
let idPartida = 1;

// Rodada 1 (2 jogos por grupo x 12 grupos = 24 jogos completos)
Object.keys(GRUPOS).forEach(g => {
    const [t1, t2, t3, t4] = GRUPOS[g];
    PARTIDAS.push({ id: idPartida++, tA: t1, tB: t2, grupo: `Grupo ${g}`, fase: "r1" });
    PARTIDAS.push({ id: idPartida++, tA: t3, tB: t4, grupo: `Grupo ${g}`, fase: "r1" });
});

// Rodada 2 (2 jogos por grupo x 12 grupos = 24 jogos completos)
Object.keys(GRUPOS).forEach(g => {
    const [t1, t2, t3, t4] = GRUPOS[g];
    PARTIDAS.push({ id: idPartida++, tA: t1, tB: t3, grupo: `Grupo ${g}`, fase: "r2" });
    PARTIDAS.push({ id: idPartida++, tA: t2, tB: t4, grupo: `Grupo ${g}`, fase: "r2" });
});

// Rodada 3 (2 jogos por grupo x 12 grupos = 24 jogos completos)
Object.keys(GRUPOS).forEach(g => {
    const [t1, t2, t3, t4] = GRUPOS[g];
    PARTIDAS.push({ id: idPartida++, tA: t4, tB: t1, grupo: `Grupo ${g}`, fase: "r3" });
    PARTIDAS.push({ id: idPartida++, tA: t2, tB: t3, grupo: `Grupo ${g}`, fase: "r3" });
});

// Estrutura Base do Mata-Mata
for (let i = 1; i <= 16; i++) { PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: `16avos de Final - Jogo ${i}`, fase: "16avos" }); }
for (let i = 1; i <= 8; i++) { PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: `Oitavas de Final - Jogo ${i}`, fase: "oitavas" }); }
for (let i = 1; i <= 4; i++) { PARTIDAS.push({ id: idPartida++, tA: "A definir", tB: "A definir", grupo: `Quartas de Final - Jogo ${i}`, fase: "quartas" }); }
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

// --- ROTAS DO SISTEMA ---
app.post('/login', (req, res) => {
    const user = req.body.username.trim().toLowerCase();
    const pass = req.body.password;
    if (DB.usuarios[user] && DB.usuarios[user] === pass) {
        req.session.user = user;
        req.session.dispId = req.session.convitePendente ||
