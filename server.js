const express = require('express');
const cors    = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app    = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// ── HELPERS ──────────────────────────────────────────────────────────────────

function validarId(id)          { return Number.isInteger(id) && id > 0; }
function validarAno(ano)        { return Number.isInteger(ano) && ano >= 1900 && ano <= 2100; }
function validarCargaHoraria(ch){ return Number.isInteger(ch) && ch >= 0; }

async function projetoComTecnologias(id) {
  const projeto = await prisma.projetos.findUnique({
    where: { id },
    include: { projeto_tecnologias: { select: { tecnologia: true } } }
  });
  if (!projeto) return null;
  return {
    ...projeto,
    tecnologias: projeto.projeto_tecnologias.map(t => t.tecnologia),
    projeto_tecnologias: undefined
  };
}

async function getCompetencias() {
  const rows = await prisma.competencias.findMany({ orderBy: [{ tipo: 'asc' }, { nome: 'asc' }] });
  return {
    tecnicas:      rows.filter(r => r.tipo === 'tecnica').map(r => r.nome),
    interpessoais: rows.filter(r => r.tipo === 'interpessoal').map(r => r.nome)
  };
}

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
// Protege rotas de escrita com header X-Admin-Token
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "1234";

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.body?._adminToken;
  if (token !== ADMIN_TOKEN)
    return res.status(401).json({ erro: 'Não autorizado. Token de admin inválido.' });
  next();
}

// ── ROTAS ─────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    mensagem: 'API do Portfólio da Kathelyn está funcionando!',
    rotas_disponíveis: [
      'GET    /projetos',
      'GET    /projetos/:id',
      'POST   /projetos',
      'PUT    /projetos/:id',
      'DELETE /projetos/:id',
      'GET    /formacoes',
      'GET    /formacoes/:id',
      'POST   /formacoes',
      'PUT    /formacoes/:id',
      'DELETE /formacoes/:id',
      'GET    /certificados',
      'GET    /certificados/:id',
      'POST   /certificados',
      'PUT    /certificados/:id',
      'DELETE /certificados/:id',
      'GET    /competencias',
      'POST   /competencias',
      'PUT    /competencias',
      'DELETE /competencias/:tipo/:nome'
    ]
  });
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────

app.post('/login', async (req, res) => {
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha)
    return res.status(400).json({ erro: 'Usuário e senha são obrigatórios.' });
  try {
    const user = await prisma.usuarios.findFirst({ where: { usuario, senha } });
    if (!user) return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
    res.status(200).json({ mensagem: 'Login realizado com sucesso!', usuario: user.usuario });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── PROJETOS ──────────────────────────────────────────────────────────────────

app.get('/projetos', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || null;
    const limit = parseInt(req.query.limit) || null;

    const options = { orderBy: { id: 'asc' } };
    if (page && limit) {
      options.skip = (page - 1) * limit;
      options.take = limit;
    }

    const [rows, total] = await Promise.all([
      prisma.projetos.findMany(options),
      prisma.projetos.count()
    ]);

    const projetos = await Promise.all(rows.map(p => projetoComTecnologias(p.id)));
    res.status(200).json({ total, projetos });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/projetos/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const projeto = await projetoComTecnologias(id);
    if (!projeto) return res.status(404).json({ erro: `Projeto com id ${id} não encontrado.` });
    res.status(200).json(projeto);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/projetos',      requireAdmin, async (req, res) => {
  const dados = req.body;
  if (!dados?.nome?.trim()) return res.status(400).json({ erro: "O campo 'nome' é obrigatório." });
  try {
    const tecnologias = Array.isArray(dados.tecnologias) ? dados.tecnologias : [];
    const novo = await prisma.projetos.create({
      data: {
        nome:      dados.nome.trim(),
        descricao: dados.descricao || '',
        imagem:    dados.imagem    || '',
        github:    dados.github    || '',
        site:      dados.site      || '',
        empresa:   dados.empresa   || '',
        professor: dados.professor || '',
        projeto_tecnologias: {
          create: tecnologias.map(t => ({ tecnologia: t }))
        }
      }
    });
    res.status(201).json(await projetoComTecnologias(novo.id));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/projetos/:id',    requireAdmin, async (req, res) => {
  const id    = parseInt(req.params.id);
  const dados = req.body;
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const atual = await prisma.projetos.findUnique({ where: { id } });
    if (!atual) return res.status(404).json({ erro: `Projeto com id ${id} não encontrado.` });

    await prisma.projetos.update({
      where: { id },
      data: {
        nome:      dados.nome?.trim()  ?? atual.nome,
        descricao: dados.descricao     ?? atual.descricao,
        imagem:    dados.imagem        ?? atual.imagem,
        github:    dados.github        ?? atual.github,
        site:      dados.site          ?? atual.site,
        empresa:   dados.empresa       ?? atual.empresa,
        professor: dados.professor     ?? atual.professor
      }
    });

    if (Array.isArray(dados.tecnologias)) {
      await prisma.projeto_tecnologias.deleteMany({ where: { projeto_id: id } });
      await prisma.projeto_tecnologias.createMany({
        data: dados.tecnologias.map(t => ({ projeto_id: id, tecnologia: t }))
      });
    }

    res.status(200).json(await projetoComTecnologias(id));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/projetos/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    // Deleta tecnologias relacionadas antes (evita erro de FK se cascade não estiver no schema)
    await prisma.projeto_tecnologias.deleteMany({ where: { projeto_id: id } });
    await prisma.projetos.delete({ where: { id } });
    res.status(200).json({ mensagem: `Projeto ${id} removido com sucesso.` });
  } catch (err) {
    if (err.code === 'P2025')
      return res.status(404).json({ erro: `Projeto com id ${id} não encontrado.` });
    res.status(500).json({ erro: err.message });
  }
});

// ── FORMAÇÕES ─────────────────────────────────────────────────────────────────

app.get('/formacoes', async (req, res) => {
  try {
    const rows = await prisma.formacoes.findMany({ orderBy: { id: 'asc' } });
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/formacoes/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const formacao = await prisma.formacoes.findUnique({ where: { id } });
    if (!formacao) return res.status(404).json({ erro: `Formação com id ${id} não encontrada.` });
    res.status(200).json(formacao);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/formacoes',      requireAdmin, async (req, res) => {
  const dados = req.body;
  if (!dados?.instituicao?.trim())
    return res.status(400).json({ erro: "O campo 'instituicao' é obrigatório." });
  try {
    const nova = await prisma.formacoes.create({
      data: {
        instituicao: dados.instituicao.trim(),
        curso:       dados.curso   || '',
        status:      dados.status  || ''
      }
    });
    res.status(201).json(nova);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/formacoes/:id',    requireAdmin, async (req, res) => {
  const id    = parseInt(req.params.id);
  const dados = req.body;
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const atual = await prisma.formacoes.findUnique({ where: { id } });
    if (!atual) return res.status(404).json({ erro: `Formação com id ${id} não encontrada.` });
    const atualizada = await prisma.formacoes.update({
      where: { id },
      data: {
        instituicao: dados.instituicao ?? atual.instituicao,
        curso:       dados.curso       ?? atual.curso,
        status:      dados.status      ?? atual.status
      }
    });
    res.status(200).json(atualizada);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/formacoes/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    await prisma.formacoes.delete({ where: { id } });
    res.status(200).json({ mensagem: `Formação ${id} removida com sucesso.` });
  } catch (err) {
    if (err.code === 'P2025')
      return res.status(404).json({ erro: `Formação com id ${id} não encontrada.` });
    res.status(500).json({ erro: err.message });
  }
});

// ── CERTIFICADOS ──────────────────────────────────────────────────────────────

app.get('/certificados', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || null;
    const limit = parseInt(req.query.limit) || null;

    const options = { orderBy: { id: 'asc' } };
    if (page && limit) {
      options.skip = (page - 1) * limit;
      options.take = limit;
    }

    const [rows, total] = await Promise.all([
      prisma.certificados.findMany(options),
      prisma.certificados.count()
    ]);

    res.status(200).json({ total, certificados: rows });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/certificados/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const cert = await prisma.certificados.findUnique({ where: { id } });
    if (!cert) return res.status(404).json({ erro: `Certificado com id ${id} não encontrado.` });
    res.status(200).json(cert);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/certificados',      requireAdmin, async (req, res) => {
  const dados = req.body;
  if (!dados?.nome?.trim()) return res.status(400).json({ erro: "O campo 'nome' é obrigatório." });

  const cargaHoraria = dados.carga_horaria ?? 0;
  const ano          = dados.ano ?? 2025;

  if (!validarCargaHoraria(cargaHoraria))
    return res.status(400).json({ erro: 'Carga horária deve ser um número inteiro positivo.' });
  if (!validarAno(ano))
    return res.status(400).json({ erro: 'Ano inválido. Deve ser entre 1900 e 2100.' });

  try {
    const novo = await prisma.certificados.create({
      data: {
        nome:          dados.nome.trim(),
        carga_horaria: cargaHoraria,
        ano,
        instituicao:   dados.instituicao || ''
      }
    });
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/certificados/:id',    requireAdmin, async (req, res) => {
  const id    = parseInt(req.params.id);
  const dados = req.body;
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });

  if (dados.carga_horaria !== undefined && !validarCargaHoraria(dados.carga_horaria))
    return res.status(400).json({ erro: 'Carga horária deve ser um número inteiro positivo.' });
  if (dados.ano !== undefined && !validarAno(dados.ano))
    return res.status(400).json({ erro: 'Ano inválido. Deve ser entre 1900 e 2100.' });

  try {
    const atual = await prisma.certificados.findUnique({ where: { id } });
    if (!atual) return res.status(404).json({ erro: `Certificado com id ${id} não encontrado.` });

    const atualizado = await prisma.certificados.update({
      where: { id },
      data: {
        nome:          dados.nome          ?? atual.nome,
        carga_horaria: dados.carga_horaria ?? atual.carga_horaria,
        ano:           dados.ano           ?? atual.ano,
        instituicao:   dados.instituicao   ?? atual.instituicao
      }
    });
    res.status(200).json(atualizado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/certificados/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!validarId(id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    await prisma.certificados.delete({ where: { id } });
    res.status(200).json({ mensagem: `Certificado ${id} removido com sucesso.` });
  } catch (err) {
    if (err.code === 'P2025')
      return res.status(404).json({ erro: `Certificado com id ${id} não encontrado.` });
    res.status(500).json({ erro: err.message });
  }
});

// ── COMPETÊNCIAS ──────────────────────────────────────────────────────────────

app.get('/competencias', async (req, res) => {
  try {
    res.status(200).json(await getCompetencias());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/competencias',           requireAdmin, async (req, res) => {
  const { tipo, nome } = req.body || {};
  // aceita tanto o formato plural (frontend) quanto singular (direto)
  const tiposValidos = ['tecnicas', 'interpessoais', 'tecnica', 'interpessoal'];
  if (!tipo || !tiposValidos.includes(tipo))
    return res.status(400).json({ erro: "O campo 'tipo' deve ser 'tecnicas' ou 'interpessoais'." });
  if (!nome?.trim()) return res.status(400).json({ erro: "O campo 'nome' é obrigatório." });

  const tipoDb = (tipo === 'tecnicas' || tipo === 'tecnica') ? 'tecnica' : 'interpessoal';
  try {
    await prisma.competencias.create({ data: { tipo: tipoDb, nome: nome.trim() } });
    res.status(201).json(await getCompetencias());
  } catch (err) {
    if (err.code === 'P2002')
      return res.status(409).json({ erro: `'${nome}' já existe em ${tipo}.` });
    res.status(500).json({ erro: err.message });
  }
});

app.put('/competencias',            requireAdmin, async (req, res) => {
  const { tecnicas, interpessoais } = req.body || {};
  if (!tecnicas && !interpessoais)
    return res.status(400).json({ erro: "Envie 'tecnicas' e/ou 'interpessoais' para atualizar." });
  if (tecnicas      && !Array.isArray(tecnicas))
    return res.status(400).json({ erro: "'tecnicas' deve ser um array." });
  if (interpessoais && !Array.isArray(interpessoais))
    return res.status(400).json({ erro: "'interpessoais' deve ser um array." });

  try {
    await prisma.$transaction(async (tx) => {
      if (tecnicas) {
        await tx.competencias.deleteMany({ where: { tipo: 'tecnica' } });
        await tx.competencias.createMany({
          data: tecnicas.map(n => ({ tipo: 'tecnica', nome: n }))
        });
      }
      if (interpessoais) {
        await tx.competencias.deleteMany({ where: { tipo: 'interpessoal' } });
        await tx.competencias.createMany({
          data: interpessoais.map(n => ({ tipo: 'interpessoal', nome: n }))
        });
      }
    });
    res.status(200).json(await getCompetencias());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/competencias/:tipo/:nome', requireAdmin, async (req, res) => {
  const { tipo, nome } = req.params;
  if (!['tecnicas', 'interpessoais'].includes(tipo))
    return res.status(400).json({ erro: "Tipo deve ser 'tecnicas' ou 'interpessoais'." });

  const tipoDb = tipo === 'tecnicas' ? 'tecnica' : 'interpessoal';
  try {
    await prisma.competencias.deleteMany({ where: { tipo: tipoDb, nome } });
    res.status(200).json(await getCompetencias());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── CURRÍCULO PDF ─────────────────────────────────────────────────────────────

app.get('/curriculo', async (req, res) => {
  try {
    const row = await prisma.configuracoes.findUnique({ where: { chave: 'curriculo_url' } });
    res.status(200).json({ url: row ? row.valor : null });
  } catch (err) {
    // Se a tabela ainda não existir, devolve null sem quebrar
    res.status(200).json({ url: null });
  }
});

app.put('/curriculo', requireAdmin, async (req, res) => {
  const { url } = req.body || {};
  if (!url?.trim()) return res.status(400).json({ erro: "Campo 'url' é obrigatório." });
  try {
    await prisma.configuracoes.upsert({
      where:  { chave: 'curriculo_url' },
      update: { valor: url.trim() },
      create: { chave: 'curriculo_url', valor: url.trim() }
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── START ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});