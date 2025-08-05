# Documento de Planejamento: Cronograma UBSF App (Nova Arquitetura)

## 1. Visão Geral do Projeto

*   **Nome do Projeto:** Cronograma UBSF App
*   **Objetivo:** Desenvolver uma aplicação móvel (React Native com Expo) e web para facilitar a criação, o gerenciamento e a exportação de cronogramas mensais de atividades para Unidades Básicas de Saúde da Família (UBSF).
*   **Público-Alvo:** Enfermeiros, médicos e outros profissionais de saúde responsáveis pela elaboração de cronogramas de atividades em UBSFs.

## 2. Nova Arquitetura (Separação Frontend/Backend)

### Por que mudamos?
Após enfrentar problemas recorrentes com roteamento de APIs no Expo Router, decidimos adotar uma arquitetura mais robusta e tradicional:

**Problemas identificados:**
- Expo Router v2.0.0 tem suporte limitado para API Routes no ambiente web
- Conflitos entre roteamento SPA e endpoints de API
- Dificuldades de debugging e manutenção

**Nova abordagem:**
- **Frontend:** Expo Router apenas para UI/UX
- **Backend:** Express.js separado e independente
- **Comunicação:** APIs REST tradicionais

### Estrutura da Nova Arquitetura

```
Cronograma-UBSF-App/
├── frontend/                 # Expo Router App
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── index.tsx        # Lista de cronogramas
│   │   ├── create.tsx       # Criar cronograma
│   │   ├── edit/[id].tsx    # Editar cronograma
│   │   └── preview/[id].tsx # Preview/PDF
│   ├── components/
│   ├── lib/
│   └── assets/
├── backend/                  # Express.js API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── cronogramas.js
│   │   │   └── atividades.js
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── utils/
│   ├── prisma/
│   │   └── schema.prisma
│   └── server.js
└── shared/                   # Tipos e utilitários compartilhados
    └── types/
```

## 3. Tecnologias (Revisadas)

### Frontend
*   **Framework:** React Native com Expo Router
*   **UI Components:** React Native Paper ou NativeBase
*   **Estado:** React Context API ou Zustand
*   **HTTP Client:** Axios ou Fetch API
*   **Navegação:** Expo Router

### Backend
*   **Framework:** Express.js
*   **Banco de Dados:** PostgreSQL (Neon)
*   **ORM:** Prisma
*   **Validação:** Joi ou Zod
*   **CORS:** cors middleware
*   **Logging:** Winston ou Morgan

### Deployment
*   **Frontend:** Vercel (Web) + Expo (Mobile)
*   **Backend:** Vercel (Vercel Functions)
*   **Banco:** Neon (PostgreSQL)
*   **Vantagens do Vercel:**
    - Deploy automático via Git
    - Serverless functions para APIs
    - CDN global integrado
    - HTTPS automático
    - Preview deployments
    - Zero configuração para Next.js/React

### PDF Generation
*   **Biblioteca:** Puppeteer (backend) ou jsPDF (frontend)
*   **Template:** HTML/CSS → PDF

## 4. Estrutura do Banco de Dados (Mantida)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Cronograma {
  id           String   @id @default(cuid())
  mes          Int      // 1-12
  ano          Int
  nomeUBSF     String?
  enfermeiro   String?
  medico       String?
  atividades   Atividade[]
  criadoEm     DateTime @default(now())
  atualizadoEm DateTime @updatedAt
}

model Atividade {
  id           String     @id @default(cuid())
  cronogramaId String
  cronograma   Cronograma @relation(fields: [cronogramaId], references: [id], onDelete: Cascade)
  data         DateTime
  diaSemana    String
  descricao    String
  criadoEm     DateTime   @default(now())
  
  @@unique([cronogramaId, data, diaSemana])
}
```

## 5. APIs REST (Backend)

### Endpoints Principais

```
GET    /api/health              # Health check
GET    /api/cronogramas         # Listar cronogramas
POST   /api/cronogramas         # Criar cronograma
GET    /api/cronogramas/:id     # Buscar cronograma por ID
PUT    /api/cronogramas/:id     # Atualizar cronograma
DELETE /api/cronogramas/:id     # Deletar cronograma

GET    /api/cronogramas/:id/atividades     # Listar atividades
POST   /api/cronogramas/:id/atividades     # Criar atividade
PUT    /api/atividades/:id                 # Atualizar atividade
DELETE /api/atividades/:id                # Deletar atividade

POST   /api/cronogramas/:id/pdf            # Gerar PDF
```

### Exemplo de Response

```json
{
  "success": true,
  "data": {
    "id": "clx123",
    "mes": 1,
    "ano": 2024,
    "nomeUBSF": "UBSF Centro",
    "enfermeiro": "Maria Silva",
    "medico": "João Santos",
    "atividades": [
      {
        "id": "clx456",
        "data": "2024-01-01T00:00:00Z",
        "diaSemana": "SEGUNDA-MANHÃ",
        "descricao": "Consultas de rotina"
      }
    ]
  }
}
```

## 6. Fluxo de Desenvolvimento

### Fase 1: Setup Backend
1. Criar estrutura Express.js
2. Configurar Prisma + Neon
3. Implementar CRUD básico
4. Testes com Postman/Insomnia

### Fase 2: Frontend Base
1. Configurar Expo Router
2. Criar telas principais
3. Integrar com APIs
4. Implementar navegação

### Fase 3: Funcionalidades Avançadas
1. Geração de PDF
2. Validações robustas
3. Error handling
4. Loading states

### Fase 4: Deploy e Testes
1. Deploy backend
2. Deploy frontend
3. Testes end-to-end
4. Otimizações

## 7. Scripts de Desenvolvimento

```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run web\"",
    "server": "node backend/server.js",
    "web": "expo start --web",
    "mobile": "expo start",
    "db:migrate": "npx prisma migrate dev",
    "db:generate": "npx prisma generate",
    "db:studio": "npx prisma studio"
  }
}
```

## 8. Vantagens da Nova Arquitetura

✅ **Separação clara de responsabilidades**
✅ **APIs REST tradicionais e confiáveis**
✅ **Facilidade de debugging**
✅ **Escalabilidade independente**
✅ **Deploy separado (frontend/backend)**
✅ **Reutilização da API para outros clientes**
✅ **Padrões de mercado estabelecidos**

## 9. Configuração para Deploy no Vercel

### Estrutura Otimizada para Vercel

```
Cronograma-UBSF-App/
├── api/                      # Vercel Functions (Backend)
│   ├── cronogramas/
│   │   ├── index.js         # GET/POST /api/cronogramas
│   │   └── [id].js          # GET/PUT/DELETE /api/cronogramas/[id]
│   ├── atividades/
│   │   └── [id].js          # CRUD atividades
│   └── health.js            # Health check
├── frontend/                 # Expo Router App (Frontend)
│   ├── app/
│   ├── components/
│   └── lib/
├── lib/                      # Shared utilities
│   ├── database.js          # Prisma client
│   └── utils.js
├── prisma/
│   └── schema.prisma
├── vercel.json              # Vercel configuration
└── package.json
```

### Configuração vercel.json

```json
{
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url"
  }
}
```

### Vantagens do Deploy no Vercel

✅ **Infraestrutura Serverless:** Escala automaticamente
✅ **Deploy Contínuo:** Integração com GitHub/GitLab
✅ **Edge Network:** CDN global para performance
✅ **Preview Deployments:** Teste branches antes do merge
✅ **Zero Downtime:** Deploy sem interrupção
✅ **Logs Integrados:** Monitoramento built-in
✅ **Custom Domains:** HTTPS automático
✅ **Environment Variables:** Gestão segura de secrets

### Migração do Express.js para Vercel Functions

**Antes (Express.js):**
```javascript
// server.js
app.get('/api/cronogramas', (req, res) => {
  // lógica aqui
});
```

**Depois (Vercel Function):**
```javascript
// api/cronogramas/index.js
export default async function handler(req, res) {
  if (req.method === 'GET') {
    // lógica aqui
  }
}
```

## 10. Próximos Passos Imediatos

1. **Reestruturar projeto para Vercel:**
   - Criar pasta `api/` para Vercel Functions
   - Mover `server.js` para funções serverless
   - Configurar `vercel.json`

2. **Migrar Backend para Vercel Functions:**
   - Converter rotas Express para handlers Vercel
   - Configurar Prisma para ambiente serverless
   - Implementar CORS e validações

3. **Frontend Expo (mantido):**
   - Atualizar URLs para produção Vercel
   - Configurar variáveis de ambiente
   - Implementar error handling

4. **Deploy e Configuração:**
   - Conectar repositório ao Vercel
   - Configurar environment variables
   - Testar deploy automático

5. **Testes em Produção:**
   - Validar APIs em ambiente Vercel
   - Testar performance e escalabilidade
   - Monitorar logs e métricas

### Comandos Úteis para Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy local para teste
vercel dev

# Deploy para produção
vercel --prod

# Configurar environment variables
vercel env add DATABASE_URL
```

---

**Esta arquitetura com Vercel oferece uma solução completa, escalável e de fácil manutenção, eliminando os problemas de roteamento anteriores e proporcionando uma experiência de desenvolvimento moderna.**