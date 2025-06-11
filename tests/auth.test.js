const request = require('supertest');
const app = require('../server'); // Importa a aplicação Express
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Auth API Endpoints', () => {
  const testUser = {
    email: `test-user-${Date.now()}@example.com`,
    password: 'password123',
    nome: 'Test User'
  };
  let createdUserId;

  // Limpa o usuário de teste do banco de dados após todos os testes
  afterAll(async () => {
    if (createdUserId) {
      await prisma.user.delete({
        where: { id: createdUserId }
      }).catch(e => console.log('Cleanup failed for user, may already be deleted.'));
    }
    await prisma.$disconnect();
  });

  // Teste de Registro
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          nome: testUser.nome
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(testUser.email);
      expect(res.body).not.toHaveProperty('password'); // Garante que a senha não é retornada
      createdUserId = res.body.id; // Salva o ID para o cleanup
    });

    it('should return 400 if email or password are not provided', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({ nome: 'Missing Fields' });
        
        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toContain('Email e senha são obrigatórios');
      });

    it('should not register a user with an existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
            email: testUser.email, // Email já usado no teste anterior
            password: 'anotherpassword',
            nome: 'Another User'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Usuário com este email já existe');
    });
  });

  // Teste de Login
  describe('POST /api/auth/login', () => {
    it('should login the user and return a token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password,
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });

    it('should not login with an incorrect password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: 'wrongpassword',
            });
        
        expect(res.statusCode).toEqual(401);
        expect(res.body.error).toContain('Credenciais inválidas');
    });

    it('should not login with a non-existent email', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'nonexistent@example.com',
                password: 'somepassword',
            });
        
        expect(res.statusCode).toEqual(401);
        expect(res.body.error).toContain('Credenciais inválidas');
    });
  });
}); 