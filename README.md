# Portfólio
 
## Tecnologias

- Node.js + Express
- Prisma ORM + MySQL (Railway)
- Cloudinary (upload de imagens)
- dotenv, cors

## Como rodar

**1. Instale as dependências:**
```bash
npm install
npx prisma generate
```

**2. Configure o `.env`:**
```
DB_HOST=66.33.22.227
DB_USER=root
DB_PASS=sua_senha
DB_NAME=railway
DB_PORT=39254

DATABASE_URL="mysql://root:sua_senha@host:porta/railway"

ADMIN_TOKEN="1234"
```

> O banco já está na nuvem, não precisa instalar MySQL na sua máquina

**3. Suba o servidor:**
```bash
node server.js
```

Acesse em `http://localhost:5000` 


## Rotas disponíveis

Todas as rotas seguem o padrão REST: `GET`, `POST`, `PUT`, `DELETE`.  
Rotas de escrita exigem o header `X-Admin-Token: 1234`.

| Recurso      | Rotas                                       |
|--------------|---------------------------------------------|
| Projetos     | `/projetos` `/projetos/:id`                 |
| Formações    | `/formacoes` `/formacoes/:id`               |
| Certificados | `/certificados` `/certificados/:id`         |
| Competências | `/competencias` `/competencias/:tipo/:nome` |
| Login        | `/login`                                    |

Projetos e certificados aceitam paginação: `?page=1&limit=5`


## Painel Admin

Clique no botão **Admin** no canto inferior direito e digite a senha para gerenciar projetos, formações, certificados e competências diretamente pelo site.

Para o upload de imagens funcionar, crie um **Upload Preset** chamado `portfolio_upload` (Unsigned) no [Cloudinary](https://cloudinary.com).
