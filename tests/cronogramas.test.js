const request = require('supertest');
const app = require('../server');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Cronogramas API Endpoints', () => {
  let token;
  let testUser;
  let cronogramaId;

  // Setup: Cria um usuário e obtém o token antes de todos os testes
  beforeAll(async () => {
    testUser = {
      email: `cronograma-user-${Date.now()}@example.com`,
      password: 'password123',
      nome: 'Cronograma Test User'
    };

    // Registrar
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    testUser.id = registerRes.body.id;

    // Login para obter o token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    
    token = loginRes.body.token;
  });

  // Teardown: Limpa os dados de teste (usuário e cronograma)
  afterAll(async () => {
    if (cronogramaId) {
      await prisma.cronograma.delete({ where: { id: cronogramaId } }).catch(() => {});
    }
    if (testUser.id) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('Protected Cronograma Routes', () => {
    it('should NOT allow access to GET /api/cronogramas without a token', async () => {
      const res = await request(app).get('/api/cronogramas');
      expect(res.statusCode).toEqual(401); // Ou 403 dependendo da sua implementação
    });

    it('should NOT allow access to POST /api/cronogramas without a token', async () => {
        const res = await request(app)
            .post('/api/cronogramas')
            .send({ mes: 1, ano: 2025, nomeUBSF: "Teste" });
        expect(res.statusCode).toEqual(401);
    });

    it('should allow creating a new cronograma with a valid token', async () => {
        const cronogramaData = {
            mes: 1,
            ano: 2025,
            nomeUBSF: "UBSF de Teste",
            enfermeiro: "Enf. Teste",
            medico: "Dr. Teste"
        };
        const res = await request(app)
            .post('/api/cronogramas')
            .set('Authorization', `Bearer ${token}`)
            .send(cronogramaData);
        
        expect(res.statusCode).toEqual(201); // Supondo que a resposta seja JSON
        expect(res.body.data.mes).toBe(cronogramaData.mes);
        expect(res.body.data.userId).toBe(testUser.id);
        cronogramaId = res.body.data.id; // Salva para cleanup
    });

    it('should list cronogramas for the authenticated user', async () => {
        const res = await request(app)
            .get('/api/cronogramas')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body.data.cronogramas)).toBe(true);
        expect(res.body.data.cronogramas.length).toBe(1);
        expect(res.body.data.cronogramas[0].id).toBe(cronogramaId);
    });

    it('should not allow a user to see cronogramas of another user', async () => {
        // Criar um segundo usuário e seu token
        const anotherUser = {
            email: `another-user-${Date.now()}@example.com`,
            password: 'password123'
        };
        await request(app).post('/api/auth/register').send(anotherUser);
        const anotherLoginRes = await request(app).post('/api/auth/login').send(anotherUser);
        const anotherToken = anotherLoginRes.body.token;

        // Tentar acessar o cronograma do primeiro usuário com o token do segundo
        const res = await request(app)
            .get(`/api/cronogramas/${cronogramaId}`)
            .set('Authorization', `Bearer ${anotherToken}`);
        
        expect(res.statusCode).toEqual(403); // Forbidden

        // Cleanup do segundo usuário
        const createdAnotherUser = await prisma.user.findUnique({where: {email: anotherUser.email}});
        if(createdAnotherUser) {
            await prisma.user.delete({ where: { id: createdAnotherUser.id } });
        }
    });
  });
}); 