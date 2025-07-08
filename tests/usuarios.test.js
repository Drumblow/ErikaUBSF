const request = require('supertest');
const app = require('../server');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Sistema de Usuários', () => {
  let testUser;
  let testToken;
  let adminUser;
  let adminToken;
  let testCronograma;

  // -- Setup: Criar usuários (normal e admin) --
  beforeAll(async () => {
    // Criar usuário normal
    const userRes = await request(app)
      .post('/api/auth/cadastro')
      .send({
        email: `user-${Date.now()}@test.com`,
        nome: 'Usuário Teste',
        senha: 'password123',
        cargo: 'enfermeiro',
      });
    testUser = userRes.body.data.usuario;
    testToken = userRes.body.data.token;

    // Criar usuário admin
    const adminRes = await request(app)
      .post('/api/auth/cadastro')
      .send({
        email: `admin-${Date.now()}@test.com`,
        nome: 'Admin Teste',
        senha: 'password123',
        cargo: 'admin',
      });
    adminUser = adminRes.body.data.usuario;
    adminToken = adminRes.body.data.token;
  });

  // -- Teardown: Limpar dados de teste --
  afterAll(async () => {
    const userIds = [testUser?.id, adminUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.usuario.deleteMany({ where: { id: { in: userIds } } });
    }
    if (testCronograma?.id) {
        await prisma.cronograma.delete({ where: { id: testCronograma.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  // --- Testes ---

  describe('Cadastro de Usuário', () => {
    it('deve criar um novo usuário com sucesso', async () => {
      const newUserEmail = `new-user-${Date.now()}@test.com`;
      const response = await request(app)
        .post('/api/auth/cadastro')
        .send({
          email: newUserEmail,
          nome: 'Novo Usuário',
          senha: 'password123',
          cargo: 'medico',
        });
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.usuario.email).toBe(newUserEmail);
      await prisma.usuario.delete({ where: { email: newUserEmail } });
    });

    it('não deve permitir cadastro com email duplicado', async () => {
        const response = await request(app)
          .post('/api/auth/cadastro')
          .send({
            email: testUser.email, // Email já existente
            nome: 'Outro Usuário',
            senha: 'password123',
            cargo: 'medico',
          });
        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
      });
  });

  describe('Login de Usuário', () => {
    it('deve fazer login com sucesso', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          senha: 'password123',
        });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });
  });

  describe('Atualização de Usuário', () => {
    it('deve atualizar dados do usuário com sucesso', async () => {
      const response = await request(app)
        .put(`/api/auth/usuarios/${testUser.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          nome: 'Usuário Teste Atualizado',
        });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nome).toBe('Usuário Teste Atualizado');
    });

    it('não deve permitir atualização sem autenticação', async () => {
        const response = await request(app)
          .put(`/api/auth/usuarios/${testUser.id}`)
          .send({
            nome: 'Falha',
          });
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
  });

  describe('Integração com Cronogramas', () => {
    it('deve criar cronograma associado ao usuário', async () => {
      const response = await request(app)
        .post('/api/cronogramas')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
            mes: 5,
            ano: 2025,
            nomeUBSF: "UBSF Teste",
            enfermeiro: "Enf. Teste",
            medico: "Dr. Teste"
        });
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.usuarioId).toBe(testUser.id);
      testCronograma = response.body.data;
    });

    it('deve listar apenas cronogramas do usuário', async () => {
        const response = await request(app)
          .get('/api/cronogramas')
          .set('Authorization', `Bearer ${testToken}`);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.cronogramas).toHaveLength(1);
        expect(response.body.data.cronogramas[0].id).toBe(testCronograma.id);
      });

      it('não deve permitir acesso ao cronograma de outro usuário', async () => {
        const response = await request(app)
          .get(`/api/cronogramas/${testCronograma.id}`)
          .set('Authorization', `Bearer ${adminToken}`); // Usa token do admin
        expect(response.status).toBe(403);
      });
  });

  describe('Exclusão de Usuário', () => {
    it('deve excluir usuário com sucesso', async () => {
      // Criar usuário para deletar
      const userToDeleteRes = await request(app)
        .post('/api/auth/cadastro')
        .send({
          email: `delete-${Date.now()}@test.com`,
          nome: 'Para Deletar',
          senha: 'password123',
          cargo: 'enfermeiro',
        });
      const userToDeleteId = userToDeleteRes.body.data.usuario.id;
      const userToDeleteToken = userToDeleteRes.body.data.token;
      
      const response = await request(app)
        .delete(`/api/auth/usuarios/${userToDeleteId}`)
        .set('Authorization', `Bearer ${userToDeleteToken}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
}); 