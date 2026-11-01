import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Simple File Storage E2E Full Workflow', () => {
  let app: INestApplication;
  let server: any;

  let tokenA: string;
  let userAId: number;
  let tokenB: string;
  let userBId: number;
  let fileId: number;
  let shareId: number;
  let publicToken: string;
  let linkId: number;

  const userAEmail = `user_a_${Date.now()}@test.com`;
  const userBEmail = `user_b_${Date.now()}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');

    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // 1. Authentication & Registration
  describe('Authentication Module', () => {
    it('POST /api/auth/register -> should register User A', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          email: userAEmail,
          password: 'Password123!',
          fullName: 'User Alice',
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe(userAEmail);
      tokenA = res.body.data.accessToken;
      userAId = res.body.data.user.id;
    });

    it('POST /api/auth/register -> should register User B', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          email: userBEmail,
          password: 'Password123!',
          fullName: 'User Bob',
        })
        .expect(201);

      tokenB = res.body.data.accessToken;
      userBId = res.body.data.user.id;
      expect(userBId).toBeDefined();
    });

    it('POST /api/auth/login -> should authenticate User A', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({
          email: userAEmail,
          password: 'Password123!',
        })
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('GET /api/auth/me -> should get current profile', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.data.id).toBe(userAId);
      expect(res.body.data.email).toBe(userAEmail);
    });
  });

  // 2. Users Module
  describe('Users Module', () => {
    it('GET /api/users/me -> should return profile', async () => {
      const res = await request(server)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.data.email).toBe(userAEmail);
    });

    it('PATCH /api/users/me -> should update profile', async () => {
      const res = await request(server)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ fullName: 'Alice Updated' })
        .expect(200);

      expect(res.body.data.fullName).toBe('Alice Updated');
    });

    it('GET /api/users/search?email= -> should find user by email', async () => {
      const res = await request(server)
        .get(`/api/users/search?email=${encodeURIComponent(userBEmail)}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((u: any) => u.email === userBEmail)).toBe(true);
    });
  });

  // 3. Files Module: Upload, List, Details, Download, Access Control
  describe('Files Module', () => {
    it('POST /api/files/upload -> should upload a file as User A', async () => {
      const res = await request(server)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('file', Buffer.from('Antigravity storage test content'), 'test_doc.txt')
        .expect(201);

      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.originalName).toBe('test_doc.txt');
      expect(res.body.data.visibility).toBe('PRIVATE');
      fileId = res.body.data.id;
    });

    it('GET /api/files -> should list user files with statistics', async () => {
      const res = await request(server)
        .get('/api/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.statistics.totalFiles).toBe(1);
      expect(res.body.data.statistics.totalStorageBytes).toBeGreaterThan(0);
    });

    it('GET /api/files/:id -> User A (owner) can view file details', async () => {
      const res = await request(server)
        .get(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.data.id).toBe(fileId);
    });

    it('GET /api/files/:id -> User B CANNOT view PRIVATE file (403 Forbidden)', async () => {
      await request(server)
        .get(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);
    });

    it('GET /api/files/:id/download -> User A can download own file', async () => {
      const res = await request(server)
        .get(`/api/files/${fileId}/download`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.text).toBe('Antigravity storage test content');
    });
  });

  // 4. File Sharing Module
  describe('File Sharing Module', () => {
    it('POST /api/files/:id/shares -> User A shares file with User B (VIEW permission)', async () => {
      const res = await request(server)
        .post(`/api/files/${fileId}/shares`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          email: userBEmail,
          permission: 'VIEW',
        })
        .expect(201);

      expect(res.body.data.permission).toBe('VIEW');
      shareId = res.body.data.id;
    });

    it('GET /api/files/:id/shares -> User A can list shares', async () => {
      const res = await request(server)
        .get(`/api/files/${fileId}/shares`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].sharedWithUser.email).toBe(userBEmail);
    });

    it('GET /api/files/shared-with-me -> User B sees file shared with them', async () => {
      const res = await request(server)
        .get('/api/files/shared-with-me')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].file.id).toBe(fileId);
      expect(res.body.data[0].permission).toBe('VIEW');
    });

    it('GET /api/files/:id -> User B CAN now view file details', async () => {
      const res = await request(server)
        .get(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body.data.id).toBe(fileId);
    });

    it('GET /api/files/:id/download -> User B CANNOT download with VIEW permission (403 Forbidden)', async () => {
      await request(server)
        .get(`/api/files/${fileId}/download`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);
    });

    it('PATCH /api/files/:id/shares/:shareId -> User A updates permission to DOWNLOAD', async () => {
      const res = await request(server)
        .patch(`/api/files/${fileId}/shares/${shareId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ permission: 'DOWNLOAD' })
        .expect(200);

      expect(res.body.data.permission).toBe('DOWNLOAD');
    });

    it('GET /api/files/:id/download -> User B CAN now download file', async () => {
      const res = await request(server)
        .get(`/api/files/${fileId}/download`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.text).toBe('Antigravity storage test content');
    });

    it('GET /api/files/shared-by-me -> User A can see files shared by them', async () => {
      const res = await request(server)
        .get('/api/files/shared-by-me')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].id).toBe(fileId);
    });
  });

  // 5. Share Links Module (Public Access)
  describe('Share Links Module', () => {
    it('POST /api/files/:id/share-links -> User A generates public share link', async () => {
      const res = await request(server)
        .post(`/api/files/${fileId}/share-links`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ expiresInHours: 24 })
        .expect(201);

      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.token.length).toBe(64);
      publicToken = res.body.data.token;
      linkId = res.body.data.id;
    });

    it('GET /api/public/files/:token -> Public user can fetch file metadata without token', async () => {
      const res = await request(server)
        .get(`/api/public/files/${publicToken}`)
        .expect(200);

      expect(res.body.data.originalName).toBe('test_doc.txt');
      expect(res.body.data.downloadUrl).toContain(publicToken);
    });

    it('GET /api/public/files/:token/download -> Public user can download file without token', async () => {
      const res = await request(server)
        .get(`/api/public/files/${publicToken}/download`)
        .expect(200);

      expect(res.text).toBe('Antigravity storage test content');
    });

    it('DELETE /api/files/:id/share-links/:linkId -> User A revokes public share link', async () => {
      await request(server)
        .delete(`/api/files/${fileId}/share-links/${linkId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
    });

    it('GET /api/public/files/:token -> Public access is now revoked (404 Not Found)', async () => {
      await request(server)
        .get(`/api/public/files/${publicToken}`)
        .expect(404);
    });
  });

  // 6. Cleanup & File Deletion
  describe('Cleanup & Delete', () => {
    it('DELETE /api/files/:id -> User B cannot delete User A file (403 Forbidden)', async () => {
      await request(server)
        .delete(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);
    });

    it('DELETE /api/files/:id -> User A deletes file', async () => {
      await request(server)
        .delete(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
    });

    it('GET /api/files/:id -> Deleted file is no longer accessible (404 Not Found)', async () => {
      await request(server)
        .get(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });
  });
});
