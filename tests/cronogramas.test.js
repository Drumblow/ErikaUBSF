const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../server');
const { hashSenha } = require('../api/utils/auth');

const prisma = new PrismaClient();

describe('Cronogramas API Endpoints', () => {
  let testUser;
  let testToken;
  let cronogramaId;

  beforeAll(async () => {
    // Criar usuário de teste
    const response = await request(app)
      .post('/api/auth/cadastro')
      .send({
        email: `test-cronogramas-${Date.now()}@example.com`,
        nome: 'Usuário Teste Cronogramas',
        senha: 'senha123',
        cargo: 'enfermeiro'
      });

    testUser = response.body.data.usuario;
    testToken = response.body.data.token;
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (cronogramaId) {
      await prisma.atividade.deleteMany({
        where: {
          cronogramaId
        }
      });
      await prisma.cronograma.delete({
        where: {
          id: cronogramaId
        }
      }).catch(() => {});
    }
    
    if (testUser?.id) {
      await prisma.usuario.delete({
        where: {
          id: testUser.id
        }
      }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  describe('Protected Cronograma Routes', () => {
    it('não deve permitir acesso a GET /api/cronogramas sem token', async () => {
      const res = await request(app).get('/api/cronogramas');
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Token');
    });

    it('não deve permitir acesso a POST /api/cronogramas sem token', async () => {
      const res = await request(app)
        .post('/api/cronogramas')
        .send({ 
          mes: 1, 
          ano: 2025, 
          nomeUBSF: "UBSF Teste",
          enfermeiro: "Enf. Teste",
          medico: "Dr. Teste"
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Token');
    });

    it('deve permitir criar um novo cronograma com token válido', async () => {
      const cronogramaData = {
        mes: 1,
        ano: 2025,
        nomeUBSF: "UBSF de Teste",
        enfermeiro: "Enf. Teste",
        medico: "Dr. Teste"
      };
      const res = await request(app)
        .post('/api/cronogramas')
        .set('Authorization', `Bearer ${testToken}`)
        .send(cronogramaData);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mes).toBe(cronogramaData.mes);
      expect(res.body.data.usuarioId).toBe(testUser.id);
      cronogramaId = res.body.data.id;
    });

    it('deve listar cronogramas do usuário autenticado', async () => {
      const res = await request(app)
        .get('/api/cronogramas')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.cronogramas)).toBe(true);
      expect(res.body.data.cronogramas.length).toBeGreaterThan(0);
      expect(res.body.data.cronogramas[0].id).toBe(cronogramaId);
    });

    it('não deve permitir acesso ao cronograma de outro usuário', async () => {
      // Criar outro usuário
      const outroUsuario = await request(app)
        .post('/api/auth/cadastro')
        .send({
          email: `outro-user-${Date.now()}@example.com`,
          nome: 'Outro Usuário',
          senha: 'senha123',
          cargo: 'enfermeiro'
        });

      const outroToken = outroUsuario.body.data.token;

      // Tentar acessar cronograma do primeiro usuário
      const res = await request(app)
        .get(`/api/cronogramas/${cronogramaId}`)
        .set('Authorization', `Bearer ${outroToken}`);
      
      expect(res.statusCode).toEqual(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('permissão');

      // Limpar outro usuário
      await prisma.usuario.delete({
        where: {
          id: outroUsuario.body.data.usuario.id
        }
      }).catch(() => {});
    });
  });
}); 