# Portfólio — Kathelyn Zanin

Portfólio pessoal com painel administrativo para gerenciar projetos, formações, certificados e competências.

🔗 **Acesse online:** [portifolio-uyqy.onrender.com](https://portifolio-uyqy.onrender.com)

> ⚠️ O site está hospedado no plano gratuito do Render, que pode **demorar alguns segundos para carregar** na primeira visita (o servidor "hiberna" quando fica sem acesso). Aguarde um momento e a página abrirá normalmente.

---

## Seções do Portfólio

- **Início** — apresentação e foto de perfil
- **Sobre Mim** — texto de apresentação e destaques
- **Formação Acadêmica & Cursos** — formações e certificados
- **Competências** — habilidades técnicas e soft skills
- **Projetos** — cards com descrição, tecnologias e links
- **Contato** — GitHub, Email, LinkedIn e currículo

---

##  Como rodar o portfólio na sua máquina

Se preferir rodar localmente em vez de acessar o link online, siga este tutorial:

### 1. Clone o repositório

Abra o terminal e execute:

```bash
git clone https://github.com/KathelynZanin/Portifolio.git
cd Portifolio
```

### 2. Instale as dependências

```bash
npm install
npx prisma generate
```

### 5. Configure o arquivo `.env`

Crie um arquivo chamado `.env` na raiz do projeto com o seguinte conteúdo:

```env
DB_HOST=66.33.22.227
DB_USER=root
DB_PASS=xOzGnKcidVrGEgGCIpdAgyPGiAVFMXhp
DB_NAME=railway
DB_PORT=39254

DATABASE_URL="mysql://root:xOzGnKcidVrGEgGCIpdAgyPGiAVFMXhp@66.33.22.227:39254/railway"
ADMIN_TOKEN="1234"
```

> O banco de dados já está na nuvem — não é necessário instalar MySQL na sua máquina.

### 6. Suba o servidor

```bash
node server.js
```

### 7. Acesse no navegador

Abra: [http://localhost:5000](http://localhost:5000)

---

##  Tecnologias utilizadas

- **Node.js + Express** — servidor backend
- **Prisma ORM + MySQL (Railway)** — banco de dados na nuvem
- **Cloudinary** — upload de imagens e certificados
- **dotenv, cors** — configuração e segurança

---

## Painel Administrativo

Clique no botão **Admin** no canto inferior direito da página e digite a senha para acessar o painel. Por lá é possível:

- Editar nome, foto, título e descrição do portfólio
- Fazer upload do currículo em PDF
- Adicionar, editar e remover projetos (com imagem)
- Adicionar, editar e remover formações e certificados (com imagem clicável)
- Editar competências técnicas e soft skills
