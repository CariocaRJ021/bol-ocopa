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

// --- DICIONÁRIO DE BANDEIRAS REALISTAS COPA 2026 ---
const PAISES = { 
    "México": "mx", "Estados Unidos": "us", "Canadá": "ca", "Brasil": "br",
    "Argentina": "ar", "França": "fr", "Inglaterra": "gb-eng", "Espanha": "es",
    "Alemanha": "de", "Holanda": "nl", "Portugal": "pt", "Bélgica": "be",
    "Croácia": "hr", "Uruguai": "uy", "Colômbia": "co", "Marrocos": "ma",
    "Senegal": "sn", "Japão": "jp", "Coreia do Sul": "kr", "Austrália": "au",
    "Irã": "ir", "Arábia Saudita": "sa", "Egito": "eg", "Nigéria": "ng",
    "Camarões": "cm", "Argélia": "dz", "Tunísia": "tn", "Costa do Marfim": "ci",
    "Equador": "ec", "Peru": "pe", "Chile": "cl", "Paraguai": "py",
    "Panamá": "pa", "Costa Rica": "cr", "Jamaica": "jm", "Honduras": "hn",
    "Suíça": "ch", "Dinamarca": "dk", "Sérvia": "rs", "Ucrânia": "ua",
    "Escócia": "gb-sct", "Polônia": "pl", "Chéquia": "cz", "Áustria": "at",
    "Nova Zelândia": "nz", "Mali": "ml", "Gana": "gh", "Iraque": "iq",
    "A definir": "un"
};

// --- GRUPOS OFICIAIS DA COPA DO MUNDO 2026 ---
const GRUPOS = { 
    A: ["México", "Suíça", "Argélia", "Nova Zelândia"], 
    B: ["Estados Unidos", "Dinamarca", "Mali", "Iraque"], 
    C: ["Canadá", "Sérvia", "Gana", "Honduras"],
    D: ["Brasil", "Ucrânia", "Egito", "Jamaica"],
    E: ["Argentina", "Polônia", "Costa do Marfim", "Austrália"],
    F: ["França", "Chéquia", "Tunísia", "Costa Rica"],
    G: ["Inglaterra", "Áustria", "Nigéria", "Coreia do Sul"],
    H: ["Espanha", "Escócia", "Camarões", "Japão"],
    I: ["Alemanha", "Uruguai", "Senegal", "Irã"],
    J: ["Holanda", "Colômbia", "Arábia Saudita", "Panamá"],
    K: ["Portugal", "Equador", "Chile", "Peru"],
    L: ["Bélgica", "Croácia", "Marrocos", "Paraguai"]
};

// --- TODOS OS 24 JOGOS POR RODADA (TOTAL DE 72 JOGOS NA FASE DE GRUPOS) ---
const PARTIDAS = [
    // --- RODADA 1 (24 Jogos) ---
    { id: 1, tA: "México", tB: "Suíça", grupo: "Grupo A", fase: "r1" },
    { id: 2, tA: "Argélia", tB: "Nova Zelândia", grupo: "Grupo A", fase: "r1" },
    { id: 3, tA: "Estados Unidos", tB: "Dinamarca", grupo: "Grupo B", fase: "r1" },
    { id: 4, tA: "Mali", tB: "Iraque", grupo: "Grupo B", fase: "r1" },
    { id: 5, tA: "Canadá", tB: "Sérvia", grupo: "Grupo C", fase: "r1" },
    { id: 6, tA: "Gana", tB: "Honduras", grupo: "Grupo C", fase: "r1" },
    { id: 7, tA: "Brasil", tB: "Ucrânia", grupo: "Grupo D", fase: "r1" },
    { id: 8, tA: "Egito", tB: "Jamaica", grupo: "Grupo D", fase: "r1" },
    { id: 9, tA: "Argentina", tB: "Polônia", grupo: "Grupo E", fase: "r1" },
    { id: 10, tA: "Costa do Marfim", tB: "Austrália", grupo: "Grupo E", fase: "r1" },
    { id: 11, tA: "França", tB: "Chéquia", grupo: "Grupo F", fase: "r1" },
    { id: 12, tA: "Tunísia", tB: "Costa Rica", grupo: "Grupo F", fase: "r1" },
    { id: 13, tA: "Inglaterra", tB: "Áustria", grupo: "Grupo G", fase: "r1" },
    { id: 14, tA: "Nigéria", tB: "Coreia do Sul", grupo: "Grupo G", fase: "r1" },
    { id: 15, tA: "Espanha", tB: "Escócia", grupo: "Grupo H", fase: "r1" },
    { id: 16, tA: "Camarões", tB: "Japão", grupo: "Grupo H", fase: "r1" },
    { id: 17, tA: "Alemanha", tB: "Uruguai", grupo: "Grupo I", fase: "r1" },
    { id: 18, tA: "Senegal", tB: "Irã", grupo: "Grupo I", fase: "r1" },
    { id: 19, tA: "Holanda", tB: "Colômbia", grupo: "Grupo J", fase: "r1" },
    { id: 20, tA: "Arábia Saudita", tB: "Panamá", grupo: "Grupo J", fase: "r1" },
    { id: 21, tA: "Portugal", tB: "Equador", grupo: "Grupo K", fase: "r1" },
    { id: 22, tA: "Chile", tB: "Peru", grupo: "Grupo K", fase: "r1" },
    { id: 23, tA: "Bélgica", tB: "Croácia", grupo: "Grupo L", fase: "r1" },
    { id: 24, tA: "Marrocos", tB: "Paraguai", grupo: "Grupo L", fase: "r1" },

    // --- RODADA 2 (24 Jogos) ---
    { id: 25, tA: "México", tB: "Argélia", grupo: "Grupo A", fase: "r2" },
    { id: 26, tA: "Suíça", tB: "Nova Zelândia", grupo: "Grupo A", fase: "r2" },
    { id: 27, tA: "Estados Unidos", tB: "Mali", grupo: "Grupo B", fase: "r2" },
    { id: 28, tA: "Dinamarca", tB: "Iraque", grupo: "Grupo B", fase: "r2" },
    { id: 29, tA: "Canadá", tB: "Gana", grupo: "Grupo C", fase: "r2" },
    { id: 30, tA: "Sérvia", tB: "Honduras", grupo: "Grupo C", fase: "r2" },
    { id: 31, tA: "Brasil", tB: "Egito", grupo: "Grupo D", fase: "r2" },
    { id: 32, tA: "Ucrânia", tB: "Jamaica", grupo: "Grupo D", fase: "r2" },
    { id: 33, tA: "Argentina", tB: "Costa do Marfim", grupo: "Grupo E", fase: "r2" },
    { id: 34, tA: "Polônia", tB: "Austrália", grupo: "Grupo E", fase: "r2" },
    { id: 35, tA: "França", tB: "Tunísia", grupo: "Grupo F", fase: "r2" },
    { id: 36, tA: "Chéquia", tB: "Costa Rica", grupo: "Grupo F", fase: "r2" },
    { id: 37, tA: "Inglaterra", tB: "Nigéria", grupo: "Grupo G", fase: "r2" },
    { id: 38, tA: "Áustria", tB: "Coreia do Sul", grupo: "Grupo G", fase: "r2" },
    { id: 39, tA: "Espanha", tB: "Camarões", grupo: "Grupo H", fase: "r2" },
    { id: 40, tA: "Escócia", tB: "Japão", grupo: "Grupo H", fase: "r2" },
    { id: 41, tA: "Alemanha", tB: "Senegal", grupo: "Grupo I", fase: "r2" },
    { id: 42, tA: "Uruguai", tB: "Irã", grupo: "Grupo I", fase: "r2" },
    { id: 43, tA: "Holanda", tB: "Arábia Saudita", grupo: "Grupo J", fase: "r2" },
    { id: 44, tA: "Colômbia", tB: "Panamá", grupo: "Grupo J", fase: "r2" },
    { id: 45, tA: "Portugal", tB: "Chile", grupo: "Grupo K", fase: "r2" },
    { id: 46, tA: "Equador", tB: "Peru", grupo: "Grupo K", fase: "r2" },
    { id: 47, tA: "Bélgica", tB: "Marrocos", grupo: "Grupo L", fase: "r2" },
    { id: 48, tA: "Croácia", tB: "Paraguai", grupo: "Grupo L", fase: "r2" },

    // --- RODADA 3 (24 Jogos) ---
    { id: 49, tA: "Nova Zelândia", tB: "México", grupo: "Grupo A", fase: "r3" },
    { id: 50, tA: "Suíça", tB: "Argélia", grupo: "Grupo A", fase: "r3" },
    { id: 51, tA: "Iraque", tB: "Estados Unidos", grupo: "Grupo B", fase: "r3" },
    { id: 52, tA: "Dinamarca", tB: "Mali", grupo: "Grupo B", fase: "r3" },
    { id: 53, tA: "Honduras", tB: "Canadá", grupo: "Grupo C", fase: "r3" },
    { id: 54, tA: "Sérvia", tB: "Gana", grupo: "Grupo C", fase: "r3" },
    { id: 55, tA: "Jamaica", tB: "Brasil", grupo: "Grupo D", fase: "r3" },
    { id: 56, tA: "Ucrânia", tB: "Egito", grupo: "Grupo D", fase: "r3" },
    { id: 57, tA: "Austrália", tB: "Argentina", grupo: "Grupo E", fase: "r3" },
    { id: 58, tA: "Polônia", tB: "Costa do Marfim", grupo: "Grupo E", fase: "r3" },
    { id: 59, tA: "Costa Rica", tB: "França", grupo: "Grupo F", fase: "r3" },
    { id: 60, tA: "Chéquia", tB: "Tunísia", grupo: "Grupo F", fase: "r3" },
    { id: 61, tA: "Coreia do Sul", tB: "Inglaterra", grupo: "Grupo G", fase: "r3" },
    { id: 62, tA: "Áustria", tB: "Nigéria", grupo: "Grupo G", fase: "r3" },
    { id: 63, tA: "Japão", tB: "Espanha", grupo: "Grupo H", fase: "r3" },
    { id: 64, tA: "Escócia", tB: "Camarões", grupo: "Grupo H", fase: "r3" },
    { id: 65, tA: "Irã", tB: "Alemanha", grupo: "Grupo I", fase: "r3" },
    { id: 66, tA: "Uruguai", tB: "Senegal", grupo: "Grupo I", fase: "r3" },
    { id: 67, tA: "Panamá", tB: "Holanda", grupo: "Grupo J", fase: "r3" },
    { id: 68, tA: "Colômbia", tB: "Arábia Saudita", grupo: "Grupo J", fase: "r3" },
    { id: 69, tA: "Peru", tB: "Portugal", grupo: "Grupo K", fase: "r3" },
    { id: 70, tA: "Equador", tB: "Chile", grupo: "Grupo K", fase: "r3" },
    { id: 71, tA: "Paraguai", tB: "Bélgica", grupo: "Grupo L", fase: "r3" },
    { id: 72, tA: "Croácia", tB: "Marrocos", grupo: "Grupo L", fase: "r3" },

    // --- MATA-MATA (Exemplos estruturados das chaves) ---
    { id: 73, tA: "A definir", tB: "A definir", grupo: "16avos (Jogo 1)", fase: "16avos" },
    { id: 74, tA: "A definir", tB: "A definir", grupo: "16avos (Jogo 2)", fase: "16avos" },
    { id: 89, tA: "A definir", tB: "A definir", grupo: "Oitavas de Final", fase: "oitavas" },
    { id: 97, tA: "A definir", tB: "A definir", grupo: "Quartas de Final", fase: "quartas" },
    { id: 101, tA: "A definir", tB: "A definir", grupo: "Semifinal", fase: "semis" },
    { id: 104, tA: "A definir", tB: "A definir", grupo: "Grande Final", fase: "final" }
];

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

// --- ROTAS ---
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
