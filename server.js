const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ── DADOS INICIAIS ────────────────────────────────────────

let projetos = [
  {
    id: 1,
    nome: "API de Censo 2022",
    descricao: "Projeto em grupo com dados do censo 2022.",
    tecnologias: ["Python", "Flask", "MySQL"],
    imagem: "img/api.webp",
    github: "https://github.com/KathelynZanin",
    site: "https://api-censo-2022.vercel.app"
  },
  {
    id: 2,
    nome: "Doces Simples",
    descricao: "Site com receitas simples de doces.",
    tecnologias: ["HTML", "CSS", "JavaScript"],
    imagem: "img/doces.webp",
    github: "https://github.com/KathelynZanin",
    site: "https://doces-simples.vercel.app"
  }
];

let formacoes = [
  {
    id: 1,
    instituicao: "FATEC",
    curso: "Desenvolvimento de Software Multiplataforma",
    status: "Em andamento - 2º semestre"
  }
];

let certificados = [
  {
    id: 1,
    nome: "Escola de Inovadores",
    carga_horaria: 40,
    ano: 2025,
    instituicao: "INOVA CPS"
  },
  {
    id: 2,
    nome: "Técnico em Administração",
    carga_horaria: 800,
    ano: 2024,
    instituicao: "ETEC"
  }
];

let competencias = {
  tecnicas: ["HTML5", "CSS3", "JavaScript", "Python", "Flask", "MySQL", "Git", "GitHub", "Bootstrap", "AWS", "Docker", "Vercel"],
  interpessoais: ["Comunicação", "Organização", "Trabalho em equipe", "Pensamento analítico", "Aprendizado rápido"]
};

const proximoId = { projetos: 3, formacoes: 2, certificados: 3 };

// ── ROTA RAIZ ─────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    mensagem: "API do Portfólio da Kathelyn está funcionando!",
    rotas_disponíveis: [
      "GET    /projetos",
      "POST   /projetos",
      "PUT    /projetos/:id",
      "DELETE /projetos/:id",
      "GET    /formacoes",
      "POST   /formacoes",
      "PUT    /formacoes/:id",
      "DELETE /formacoes/:id",
      "GET    /certificados",
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

// ── PROJETOS ──────────────────────────────────────────────

app.get('/projetos', (req, res) => {
  res.status(200).json(projetos);
});

app.post('/projetos', (req, res) => {
  const dados = req.body;
  if (!dados || !dados.nome) {
    return res.status(400).json({ erro: "O campo 'nome' é obrigatório." });
  }
  const novo = {
    id: proximoId.projetos++,
    nome: dados.nome,
    descricao: dados.descricao || "",
    tecnologias: dados.tecnologias || [],
    imagem: dados.imagem || "",
    github: dados.github || "",
    site: dados.site || ""
  };
  projetos.push(novo);
  res.status(201).json(novo);
});

app.put('/projetos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const projeto = projetos.find(p => p.id === id);
  if (!projeto) {
    return res.status(404).json({ erro: `Projeto com id ${id} não encontrado.` });
  }
  const dados = req.body;
  projeto.nome        = dados.nome        ?? projeto.nome;
  projeto.descricao   = dados.descricao   ?? projeto.descricao;
  projeto.tecnologias = dados.tecnologias ?? projeto.tecnologias;
  projeto.imagem      = dados.imagem      ?? projeto.imagem;
  projeto.github      = dados.github      ?? projeto.github;
  projeto.site        = dados.site        ?? projeto.site;
  res.status(200).json(projeto);
});

app.delete('/projetos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const antes = projetos.length;
  projetos = projetos.filter(p => p.id !== id);
  if (projetos.length === antes) {
    return res.status(404).json({ erro: `Projeto com id ${id} não encontrado.` });
  }
  res.status(200).json({ mensagem: `Projeto ${id} removido com sucesso.` });
});

// ── FORMAÇÕES ─────────────────────────────────────────────

app.get('/formacoes', (req, res) => {
  res.status(200).json(formacoes);
});

app.post('/formacoes', (req, res) => {
  const dados = req.body;
  if (!dados || !dados.instituicao) {
    return res.status(400).json({ erro: "O campo 'instituicao' é obrigatório." });
  }
  const nova = {
    id: proximoId.formacoes++,
    instituicao: dados.instituicao,
    curso: dados.curso || "",
    status: dados.status || ""
  };
  formacoes.push(nova);
  res.status(201).json(nova);
});

app.put('/formacoes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const formacao = formacoes.find(f => f.id === id);
  if (!formacao) {
    return res.status(404).json({ erro: `Formação com id ${id} não encontrada.` });
  }
  const dados = req.body;
  formacao.instituicao = dados.instituicao ?? formacao.instituicao;
  formacao.curso       = dados.curso       ?? formacao.curso;
  formacao.status      = dados.status      ?? formacao.status;
  res.status(200).json(formacao);
});

app.delete('/formacoes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const antes = formacoes.length;
  formacoes = formacoes.filter(f => f.id !== id);
  if (formacoes.length === antes) {
    return res.status(404).json({ erro: `Formação com id ${id} não encontrada.` });
  }
  res.status(200).json({ mensagem: `Formação ${id} removida com sucesso.` });
});

// ── CERTIFICADOS ──────────────────────────────────────────

app.get('/certificados', (req, res) => {
  res.status(200).json(certificados);
});

app.post('/certificados', (req, res) => {
  const dados = req.body;
  if (!dados || !dados.nome) {
    return res.status(400).json({ erro: "O campo 'nome' é obrigatório." });
  }
  const novo = {
    id: proximoId.certificados++,
    nome: dados.nome,
    carga_horaria: dados.carga_horaria ?? 0,
    ano: dados.ano ?? 2025,
    instituicao: dados.instituicao || ""
  };
  certificados.push(novo);
  res.status(201).json(novo);
});

app.put('/certificados/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const cert = certificados.find(c => c.id === id);
  if (!cert) {
    return res.status(404).json({ erro: `Certificado com id ${id} não encontrado.` });
  }
  const dados = req.body;
  cert.nome          = dados.nome          ?? cert.nome;
  cert.carga_horaria = dados.carga_horaria ?? cert.carga_horaria;
  cert.ano           = dados.ano           ?? cert.ano;
  cert.instituicao   = dados.instituicao   ?? cert.instituicao;
  res.status(200).json(cert);
});

app.delete('/certificados/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const antes = certificados.length;
  certificados = certificados.filter(c => c.id !== id);
  if (certificados.length === antes) {
    return res.status(404).json({ erro: `Certificado com id ${id} não encontrado.` });
  }
  res.status(200).json({ mensagem: `Certificado ${id} removido com sucesso.` });
});

// ── COMPETÊNCIAS ──────────────────────────────────────────

app.get('/competencias', (req, res) => {
  res.status(200).json(competencias);
});

// POST — adiciona uma competência individual
app.post('/competencias', (req, res) => {
  const dados = req.body;
  const tipo = dados?.tipo;
  const nome = dados?.nome;

  if (!tipo || !['tecnicas', 'interpessoais'].includes(tipo)) {
    return res.status(400).json({ erro: "O campo 'tipo' deve ser 'tecnicas' ou 'interpessoais'." });
  }
  if (!nome) {
    return res.status(400).json({ erro: "O campo 'nome' é obrigatório." });
  }
  if (competencias[tipo].includes(nome)) {
    return res.status(409).json({ erro: `'${nome}' já existe em ${tipo}.` });
  }
  competencias[tipo].push(nome);
  res.status(201).json(competencias);
});

// PUT — substitui listas completas
app.put('/competencias', (req, res) => {
  const dados = req.body;
  if (dados.tecnicas)      competencias.tecnicas      = dados.tecnicas;
  if (dados.interpessoais) competencias.interpessoais = dados.interpessoais;
  res.status(200).json(competencias);
});

// DELETE — remove por tipo e nome
app.delete('/competencias/:tipo/:nome', (req, res) => {
  const { tipo, nome } = req.params;
  if (!['tecnicas', 'interpessoais'].includes(tipo)) {
    return res.status(400).json({ erro: "Tipo deve ser 'tecnicas' ou 'interpessoais'." });
  }
  if (!competencias[tipo].includes(nome)) {
    return res.status(404).json({ erro: `'${nome}' não encontrado em ${tipo}.` });
  }
  competencias[tipo] = competencias[tipo].filter(c => c !== nome);
  res.status(200).json(competencias);
});

// ── INICIAR SERVIDOR ──────────────────────────────────────

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});