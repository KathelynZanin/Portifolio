const express = require('express');
const cors    = require('cors');
const mysql   = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// ONEXÃO COM O BANCO 
const pool = mysql.createPool({
  host:               process.env.DB_HOST || 'localhost',
  user:               process.env.DB_USER || 'root',
  password:           process.env.DB_PASS || 'fatec',
  database:           process.env.DB_NAME || 'portifolio',
  waitForConnections: true,
  connectionLimit:    10
});


pool.getConnection()
  .then(conn => {
    console.log(' Conectado ao banco de dados MySQL!');
    conn.release();
  })
  .catch(err => {
    console.error(' Erro ao conectar no banco:', err.message);
    process.exit(1);
  });


app.post('/login', async (req, res) => {
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha)
    return res.status(400).json({ erro: "Usuário e senha são obrigatórios." });
  try {
    const [[user]] = await pool.query(
      'SELECT * FROM usuarios WHERE usuario = ? AND senha = ?', [usuario, senha]
    );
    if (!user)
      return res.status(401).json({ erro: "Usuário ou senha incorretos." });
    res.status(200).json({ mensagem: "Login realizado com sucesso!", usuario: user.usuario });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});


function validarId(id) {
  return Number.isInteger(id) && id > 0;
}

function validarAno(ano) {
  return Number.isInteger(ano) && ano >= 1900 && ano <= 2100;
}

function validarCargaHoraria(ch) {
  return Number.isInteger(ch) && ch >= 0;
}


app.get('/', (req, res) => {
  res.json({
    mensagem: "API do Portfólio da Kathelyn está funcionando!",
    rotas_disponíveis: [
      "GET    /projetos",
      "GET    /projetos/:id",
      "POST   /projetos",
      "PUT    /projetos/:id",
      "DELETE /projetos/:id",
      "GET    /formacoes",
      "GET    /formacoes/:id",
      "POST   /formacoes",
      "PUT    /formacoes/:id",
      "DELETE /formacoes/:id",
      "GET    /certificados",
      "GET    /certificados/:id",
      "POST   /certificados",
      "PUT    /certificados/:id",
      "DELETE /certificados/:id",
      "GET    /competencias",
      "POST   /competencias",
      "PUT    /competencias",
      "DELETE /competencias/:tipo/:nome"
    ]
  });
});

async function projetoComTecnologias(conn, id) {
  const [[projeto]] = await conn.query('SELECT * FROM projetos WHERE id = ?', [id]);
  if (!projeto) return null;
  const [tecRows] = await conn.query(
    'SELECT tecnologia FROM projeto_tecnologias WHERE projeto_id = ?', [id]
  );
  projeto.tecnologias = tecRows.map(r => r.tecnologia);
  return projeto;
}


async function getCompetencias(conn) {
  const [rows] = await conn.query('SELECT tipo, nome FROM competencias ORDER BY tipo, nome');
  const resultado = { tecnicas: [], interpessoais: [] };
  for (const row of rows) {
    if (row.tipo === 'tecnica')      resultado.tecnicas.push(row.nome);
    if (row.tipo === 'interpessoal') resultado.interpessoais.push(row.nome);
  }
  return resultado;
}


app.get('/projetos', async (req, res) => {
  try {
  
    const page  = parseInt(req.query.page)  || null;
    const limit = parseInt(req.query.limit) || null;

    let query = 'SELECT * FROM projetos ORDER BY id';
    const params = [];

    if (page && limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);
    }

    const [rows] = await pool.query(query, params);
    const projetos = await Promise.all(rows.map(p => projetoComTecnologias(pool, p.id)));

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM projetos');
    res.status(200).json({ total, projetos });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/projetos/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const projeto = await projetoComTecnologias(pool, id);
    if (!projeto) return res.status(404).json({ erro: `Projeto com id ${id} não encontrado.` });
    res.status(200).json(projeto);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/projetos', async (req, res) => {
  const dados = req.body;
  if (!dados?.nome?.trim()) return res.status(400).json({ erro: "O campo 'nome' é obrigatório." });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO projetos (nome, descricao, imagem, github, site) VALUES (?, ?, ?, ?, ?)',
      [dados.nome.trim(), dados.descricao || '', dados.imagem || '', dados.github || '', dados.site || '']
    );
    const novoId = result.insertId;
    const tecnologias = Array.isArray(dados.tecnologias) ? dados.tecnologias : [];
    for (const tec of tecnologias) {
      await conn.query(
        'INSERT INTO projeto_tecnologias (projeto_id, tecnologia) VALUES (?, ?)',
        [novoId, tec]
      );
    }
    await conn.commit();
    const novo = await projetoComTecnologias(conn, novoId);
    res.status(201).json(novo);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ erro: err.message });
  } finally {
    conn.release();
  }
});

app.put('/projetos/:id', async (req, res) => {
  const id    = parseInt(req.params.id);
  const dados = req.body;
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[atual]] = await conn.query('SELECT * FROM projetos WHERE id = ?', [id]);
    if (!atual) {
      await conn.rollback();
      return res.status(404).json({ erro: `Projeto com id ${id} não encontrado.` });
    }
    await conn.query(
      'UPDATE projetos SET nome=?, descricao=?, imagem=?, github=?, site=? WHERE id=?',
      [
        dados.nome?.trim()  ?? atual.nome,
        dados.descricao     ?? atual.descricao,
        dados.imagem        ?? atual.imagem,
        dados.github        ?? atual.github,
        dados.site          ?? atual.site,
        id
      ]
    );
    if (Array.isArray(dados.tecnologias)) {
      await conn.query('DELETE FROM projeto_tecnologias WHERE projeto_id = ?', [id]);
      for (const tec of dados.tecnologias) {
        await conn.query(
          'INSERT INTO projeto_tecnologias (projeto_id, tecnologia) VALUES (?, ?)',
          [id, tec]
        );
      }
    }
    await conn.commit();
    const atualizado = await projetoComTecnologias(conn, id);
    res.status(200).json(atualizado);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ erro: err.message });
  } finally {
    conn.release();
  }
});

app.delete('/projetos/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const [result] = await pool.query('DELETE FROM projetos WHERE id = ?', [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ erro: `Projeto com id ${id} não encontrado.` });
    res.status(200).json({ mensagem: `Projeto ${id} removido com sucesso.` });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});


app.get('/formacoes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM formacoes ORDER BY id');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/formacoes/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const [[formacao]] = await pool.query('SELECT * FROM formacoes WHERE id = ?', [id]);
    if (!formacao) return res.status(404).json({ erro: `Formação com id ${id} não encontrada.` });
    res.status(200).json(formacao);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/formacoes', async (req, res) => {
  const dados = req.body;
  if (!dados?.instituicao?.trim())
    return res.status(400).json({ erro: "O campo 'instituicao' é obrigatório." });
  try {
    const [result] = await pool.query(
      'INSERT INTO formacoes (instituicao, curso, status) VALUES (?, ?, ?)',
      [dados.instituicao.trim(), dados.curso || '', dados.status || '']
    );
    const [[nova]] = await pool.query('SELECT * FROM formacoes WHERE id = ?', [result.insertId]);
    res.status(201).json(nova);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/formacoes/:id', async (req, res) => {
  const id    = parseInt(req.params.id);
  const dados = req.body;
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const [[atual]] = await pool.query('SELECT * FROM formacoes WHERE id = ?', [id]);
    if (!atual) return res.status(404).json({ erro: `Formação com id ${id} não encontrada.` });
    await pool.query(
      'UPDATE formacoes SET instituicao=?, curso=?, status=? WHERE id=?',
      [dados.instituicao ?? atual.instituicao, dados.curso ?? atual.curso, dados.status ?? atual.status, id]
    );
    const [[atualizada]] = await pool.query('SELECT * FROM formacoes WHERE id = ?', [id]);
    res.status(200).json(atualizada);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/formacoes/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const [result] = await pool.query('DELETE FROM formacoes WHERE id = ?', [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ erro: `Formação com id ${id} não encontrada.` });
    res.status(200).json({ mensagem: `Formação ${id} removida com sucesso.` });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});


app.get('/certificados', async (req, res) => {
  try {

    const page  = parseInt(req.query.page)  || null;
    const limit = parseInt(req.query.limit) || null;

    let query = 'SELECT * FROM certificados ORDER BY id';
    const params = [];

    if (page && limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);
    }

    const [rows] = await pool.query(query, params);
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM certificados');
    res.status(200).json({ total, certificados: rows });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/certificados/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const [[cert]] = await pool.query('SELECT * FROM certificados WHERE id = ?', [id]);
    if (!cert) return res.status(404).json({ erro: `Certificado com id ${id} não encontrado.` });
    res.status(200).json(cert);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/certificados', async (req, res) => {
  const dados = req.body;
  if (!dados?.nome?.trim()) return res.status(400).json({ erro: "O campo 'nome' é obrigatório." });

  const cargaHoraria = dados.carga_horaria ?? 0;
  const ano          = dados.ano ?? 2025;

  if (!validarCargaHoraria(cargaHoraria))
    return res.status(400).json({ erro: "Carga horária deve ser um número inteiro positivo." });
  if (!validarAno(ano))
    return res.status(400).json({ erro: "Ano inválido. Deve ser entre 1900 e 2100." });

  try {
    const [result] = await pool.query(
      'INSERT INTO certificados (nome, carga_horaria, ano, instituicao) VALUES (?, ?, ?, ?)',
      [dados.nome.trim(), cargaHoraria, ano, dados.instituicao || '']
    );
    const [[novo]] = await pool.query('SELECT * FROM certificados WHERE id = ?', [result.insertId]);
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/certificados/:id', async (req, res) => {
  const id    = parseInt(req.params.id);
  const dados = req.body;
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });

  if (dados.carga_horaria !== undefined && !validarCargaHoraria(dados.carga_horaria))
    return res.status(400).json({ erro: "Carga horária deve ser um número inteiro positivo." });
  if (dados.ano !== undefined && !validarAno(dados.ano))
    return res.status(400).json({ erro: "Ano inválido. Deve ser entre 1900 e 2100." });

  try {
    const [[atual]] = await pool.query('SELECT * FROM certificados WHERE id = ?', [id]);
    if (!atual) return res.status(404).json({ erro: `Certificado com id ${id} não encontrado.` });
    await pool.query(
      'UPDATE certificados SET nome=?, carga_horaria=?, ano=?, instituicao=? WHERE id=?',
      [dados.nome ?? atual.nome, dados.carga_horaria ?? atual.carga_horaria,
       dados.ano  ?? atual.ano,  dados.instituicao   ?? atual.instituicao, id]
    );
    const [[atualizado]] = await pool.query('SELECT * FROM certificados WHERE id = ?', [id]);
    res.status(200).json(atualizado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/certificados/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const [result] = await pool.query('DELETE FROM certificados WHERE id = ?', [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ erro: `Certificado com id ${id} não encontrado.` });
    res.status(200).json({ mensagem: `Certificado ${id} removido com sucesso.` });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});


app.get('/competencias', async (req, res) => {
  try {
    res.status(200).json(await getCompetencias(pool));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/competencias', async (req, res) => {
  const { tipo, nome } = req.body || {};
  if (!tipo || !['tecnicas', 'interpessoais'].includes(tipo))
    return res.status(400).json({ erro: "O campo 'tipo' deve ser 'tecnicas' ou 'interpessoais'." });
  if (!nome?.trim()) return res.status(400).json({ erro: "O campo 'nome' é obrigatório." });

  const tipoDb = tipo === 'tecnicas' ? 'tecnica' : 'interpessoal';
  try {
    await pool.query('INSERT INTO competencias (tipo, nome) VALUES (?, ?)', [tipoDb, nome.trim()]);
    res.status(201).json(await getCompetencias(pool));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ erro: `'${nome}' já existe em ${tipo}.` });
    res.status(500).json({ erro: err.message });
  }
});

app.put('/competencias', async (req, res) => {
  const { tecnicas, interpessoais } = req.body || {};
  if (!tecnicas && !interpessoais)
    return res.status(400).json({ erro: "Envie 'tecnicas' e/ou 'interpessoais' para atualizar." });
  if (tecnicas && !Array.isArray(tecnicas))
    return res.status(400).json({ erro: "'tecnicas' deve ser um array." });
  if (interpessoais && !Array.isArray(interpessoais))
    return res.status(400).json({ erro: "'interpessoais' deve ser um array." });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (tecnicas) {
      await conn.query("DELETE FROM competencias WHERE tipo = 'tecnica'");
      for (const nome of tecnicas)
        await conn.query("INSERT INTO competencias (tipo, nome) VALUES ('tecnica', ?)", [nome]);
    }
    if (interpessoais) {
      await conn.query("DELETE FROM competencias WHERE tipo = 'interpessoal'");
      for (const nome of interpessoais)
        await conn.query("INSERT INTO competencias (tipo, nome) VALUES ('interpessoal', ?)", [nome]);
    }
    await conn.commit();
    res.status(200).json(await getCompetencias(conn));
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ erro: err.message });
  } finally {
    conn.release();
  }
});

app.delete('/competencias/:tipo/:nome', async (req, res) => {
  const { tipo, nome } = req.params;
  if (!['tecnicas', 'interpessoais'].includes(tipo))
    return res.status(400).json({ erro: "Tipo deve ser 'tecnicas' ou 'interpessoais'." });

  const tipoDb = tipo === 'tecnicas' ? 'tecnica' : 'interpessoal';
  try {
    const [result] = await pool.query(
      'DELETE FROM competencias WHERE tipo = ? AND nome = ?', [tipoDb, nome]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ erro: `'${nome}' não encontrado em ${tipo}.` });
    res.status(200).json(await getCompetencias(pool));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Servidor rodando em http://localhost:${PORT}`);
});