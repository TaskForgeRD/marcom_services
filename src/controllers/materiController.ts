import { Elysia } from 'elysia';
import * as materiService from '../services/materiService';

export const materiController = new Elysia()
  .get('/api/materi', async () => {
    return await materiService.getAllMateri();
  })
  .get('/api/materi/:id', async ({ params: { id } }) => {
    const materi = await materiService.getMateriById(parseInt(id));
    
    if (!materi) {
      return { status: 404, message: 'Materi tidak ditemukan' };
    }
    
    return materi;
  })
  .post('/api/materi', async ({ request, set }) => {
    try {
      const formData = await request.formData();
      return await materiService.createMateri(formData);
    } catch (error) {
      console.error('Error creating materi:', error);
      set.status = 500;
      return { success: false, message: error instanceof Error ? error.message : 'Gagal menyimpan data' };
    }
  })
  .put('/api/materi/:id', async ({ params: { id }, request, set }) => {
    try {
      const formData = await request.formData();
      return await materiService.updateMateri(parseInt(id), formData);
    } catch (error) {
      console.error('Error updating materi:', error);
      set.status = 500;
      return { success: false, message: error instanceof Error ? error.message : 'Gagal memperbarui data' };
    }
  })
  .delete('/api/materi/:id', async ({ params: { id }, set }) => {
    try {
      return await materiService.deleteMateri(parseInt(id));
    } catch (error) {
      console.error('Error deleting materi:', error);
      set.status = 500;
      return { success: false, message: 'Gagal menghapus data' };
    }
  });