# Portfólio

API do meu portfólio acadêmico feita com Node.js, Express e MySQL hospedado na nuvem via Railway.


## Como rodar

**1. Instale as dependências:**
```bash
npm install
```

**2. Configure o `.env`** com as credenciais do banco no Railway:
```
DB_HOST=66.33.22.227
DB_USER=root
DB_PASS=xOzGnKcidVrGEgGCIpdAgyPGiAVFMXhp
DB_NAME=railway
DB_PORT=39254
```

> O banco já está na nuvem, não precisa instalar MySQL na sua máquina! 

**3. Suba o servidor:**
```bash
node server.js
```

Acesse em `http://localhost:5000` 🚀

---

## Rotas disponíveis

Todas as rotas seguem o padrão REST: `GET`, `POST`, `PUT`, `DELETE`.

| Recurso       | Rotas                                          |
|---------------|------------------------------------------------|
| Projetos      | `/projetos` `/projetos/:id`                    |
| Formações     | `/formacoes` `/formacoes/:id`                  |
| Certificados  | `/certificados` `/certificados/:id`            |
| Competências  | `/competencias` `/competencias/:tipo/:nome`    |

Projetos e certificados aceitam paginação: `?page=1&limit=5`

---

## Tecnologias usadas

- Node.js + Express
- MySQL2
- dotenv
- Railway (banco na nuvem)
