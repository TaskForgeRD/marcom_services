import { Elysia } from 'elysia';
import * as materiService from '../services/materiService';
import { requireAuth } from '../middlewares/authMiddleware';

export const materiController = new Elysia()

  .get('/api/materi', requireAuth(async ({ user }) => {
    return await materiService.getAllMateriByUser(user.userId);
  }))

  .get('/api/materi/:id', requireAuth(async ({ params: { id }, user, set }) => {
    const materi = await materiService.getMateriById(parseInt(id), user.userId);
    if (!materi) {
      set.status = 404;
      return { status: 404, message: 'Materi tidak ditemukan' };
    }
    return materi;
  }))

  .post('/api/materi', requireAuth(async ({ request, user, set }) => {
    try {
      const formData = await request.formData();
      return await materiService.createMateri(formData, user.userId);
    } catch (error) {
      console.error('Error creating materi:', error);
      set.status = 500;
      return { success: false, message: error instanceof Error ? error.message : 'Gagal menyimpan data' };
    }
  }))

  .put('/api/materi/:id', requireAuth(async ({ params: { id }, request, user, set }) => {
    try {
      const formData = await request.formData();
      return await materiService.updateMateri(parseInt(id), formData, user.userId);
    } catch (error) {
      console.error('Error updating materi:', error);
      set.status = 500;
      return { success: false, message: error instanceof Error ? error.message : 'Gagal memperbarui data' };
    }
  }))

  .delete('/api/materi/:id', requireAuth(async ({ params: { id }, user, set }) => {
    try {
      return await materiService.deleteMateri(parseInt(id), user.userId);
    } catch (error) {
      console.error('Error deleting materi:', error);
      set.status = 500;
      return { success: false, message: 'Gagal menghapus data' };
    }
  }));
