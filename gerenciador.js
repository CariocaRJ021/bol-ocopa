const express = require('express');
const cors = require('cors'); // Permite a comunicação segura entre as portas
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Banco global na memória do processo
global.disputasPrivadas = global.disputasPrivadas || [];

app.get('/', (req, res) => {
    let lista = global.disputasPrivadas.map(d => `
        <div style="background:#111827; border:1px solid #1f2937; padding:15px; margin:10px 0; border-radius:12px; border-left:5px solid #f59e0b; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <span style="font-weight:600; font-size:15px; color:#f3f4f6;">🏆 ${d.nome}</span>
                <span style="font-size:11px; background:#10b981; color:#fff; padding:2px 6px; border-radius:4px; margin-left:8px;">${d.modo.toUpperCase()}</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:12px; color:#9ca3af;">Código:</span>
                <input type="text" value="${d.codigo}" readonly onclick="this.select(); document.execCommand('copy'); alert('Código copiado!');" style="width:100px; background:#0b0f19; color:#f59e0b; border:1px solid #374151; padding:6px; border-radius:6px; text-align:center; font-weight:bold; cursor:pointer;">
            </div>
        </div>
    `).join('');

    res.send(`
        <head>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body { background:#0b0f19; color:#f3f4f6; font-family:'Poppins', sans-serif; margin:0; padding:20px; }
                .container { max-width:600px; margin:50px auto; background:#111827; padding:30px; border-radius:16px; border:1px solid #1f2937; border-top:6px solid #f59e0b; }
                h2 { color:#f59e0b; font-size:20px; text-transform:uppercase; margin-bottom:20px; }
                h3 { color:#10b981; font-size:15px; text-transform:uppercase; margin-top:30px; border-left:4px solid #10b981; padding-left:8px; }
                .btn { background:linear-gradient(135deg, #f59e0b, #d97706); color:#fff; border:none; padding:10px 20px; font-weight:600; cursor:pointer; border-radius:6px; width:100%; margin-top:15px; }
                input, select { background:#1f2937; color:#fff; border:1px solid #374151; padding:10px; border-radius:6px; width:100%; box-sizing:border-box; margin-bottom:10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>CRIAR NOVA DISPUTA</h2>
                <form action="/criar" method="POST">
                    <input type="text" name="nome" placeholder="Nome do seu Grupo (Ex: Bolão dos Amigos)" required>
                    <select name="modo">
                        <option value="ambos">Modo: Ambos (Grupos e Placares)</option>
                        <option value="grupos">Modo: Apenas Grupos</option>
                        <option value="placares">Modo: Apenas Placares</option>
                    </select>
                    <button type="submit" class="btn">Gerar Grupo Privado e Convite</button>
                </form>
                <h3>Minhas Disputas Criadas</h3>
                <div>${lista || '<p style="color:#9ca3af; font-size:13px;">Nenhum grupo criado ainda.</p>'}</div>
            </div>
        </body>
    `);
});

app.post('/criar', (req, res) => {
    const codigoUnico = 'COPA-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    global.disputasPrivadas.push({ nome: req.body.nome, codigo: codigoUnico, modo: req.body.modo, participantes: [] });
    res.redirect('/');
});

// Rota api externa para o server.js consultar as disputas
app.get('/api/disputas', (req, res) => res.json(global.disputasPrivadas));
app.listen(3001, () => console.log('Gerenciador ativo na porta 3001'));