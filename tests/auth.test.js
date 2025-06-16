const request = require('supertest');
const app = require('../server'); // Importa a aplicação Express
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Auth API Endpoints', () => {
  const testUser = {
    email: `test-user-${Date.now()}@example.com`,
    password: 'password123',
    nome: 'Test User',
    cargo: 'enfermeiro'
  };
  let createdUserId;

  // Limpa o usuário de teste do banco de dados após todos os testes
  afterAll(async () => {
    if (createdUserId) {
      await prisma.usuario.delete({
        where: { id: createdUserId }
      }).catch(e => console.log('Cleanup failed for user, may already be deleted.'));
    }
    await prisma.$disconnect();
  });

  // Teste de Cadastro
  describe('POST /api/auth/cadastro', () => {
    it('deve cadastrar um novo usuário com sucesso', async () => {
      const res = await request(app)
        .post('/api/auth/cadastro')
        .send({
          email: testUser.email,
          senha: testUser.password,
          nome: testUser.nome,
          cargo: testUser.cargo
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.usuario).toHaveProperty('id');
      expect(res.body.data.usuario.email).toBe(testUser.email);
      expect(res.body.data.usuario).not.toHaveProperty('senha');
      expect(res.body.data).toHaveProperty('token');
      createdUserId = res.body.data.usuario.id;
    });

    it('deve retornar 400 se email ou senha não forem fornecidos', async () => {
      const res = await request(app)
        .post('/api/auth/cadastro')
        .send({ nome: 'Missing Fields' });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('obrigatório');
    });

    it('não deve cadastrar usuário com email existente', async () => {
      const res = await request(app)
        .post('/api/auth/cadastro')
        .send({
          email: testUser.email,
          senha: 'anotherpassword',
          nome: 'Another User',
          cargo: 'medico'
        });
      
      expect(res.statusCode).toEqual(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('já existe');
    });
  });

  // Teste de Login
  describe('POST /api/auth/login', () => {
    it('deve fazer login com sucesso e retornar token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          senha: testUser.password
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.usuario.email).toBe(testUser.email);
    });

    it('não deve permitir login com senha incorreta', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          senha: 'wrongpassword'
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('inválida');
    });

    it('não deve permitir login com email inexistente', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          senha: 'somepassword'
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('inválida');
    });
  });
}); 