import { Elysia } from 'elysia';
import { BrandRepository, Brand } from '../repositories/brandRepository';

const brandRepository = new BrandRepository();

const brandRoutes = new Elysia({ prefix: '/api/brands' })
  // Get all brands
  .get('/', async () => {
    try {
      const brands = await brandRepository.findAll();
      return { success: true, data: brands };
    } catch (error) {
      console.error('Error fetching brands:', error);
      return { success: false, message: 'Failed to fetch brands', error: (error as Error).message };
    }
  })

  // Get brand by ID
  .get('/:id', async ({ params }) => {
    try {
      const id = parseInt(params.id);
      const brand = await brandRepository.findById(id);
      
      if (!brand) {
        return { success: false, message: `Brand with ID ${id} not found` };
      }
      
      return { success: true, data: brand };
    } catch (error) {
      console.error(`Error fetching brand with ID ${params.id}:`, error);
      return { success: false, message: 'Failed to fetch brand', error: (error as Error).message };
    }
  })

  // Create brand
  .post('/', async ({ body }) => {
    try {
      const brandData = body as Brand;
      const newBrand = await brandRepository.create(brandData);
      return { success: true, data: newBrand, message: 'Brand created successfully' };
    } catch (error) {
      console.error('Error creating brand:', error);
      return { success: false, message: 'Failed to create brand', error: (error as Error).message };
    }
  })

  // Update brand
  .put('/:id', async ({ params, body }) => {
    try {
      const id = parseInt(params.id);
      const brandData = body as Brand;
      const updated = await brandRepository.update(id, brandData);
      
      if (!updated) {
        return { success: false, message: `Brand with ID ${id} not found` };
      }
      
      return { success: true, message: 'Brand updated successfully' };
    } catch (error) {
      console.error(`Error updating brand with ID ${params.id}:`, error);
      return { success: false, message: 'Failed to update brand', error: (error as Error).message };
    }
  })

  // Delete brand
  .delete('/:id', async ({ params }) => {
    try {
      const id = parseInt(params.id);
      const deleted = await brandRepository.delete(id);
      
      if (!deleted) {
        return { success: false, message: `Brand with ID ${id} not found` };
      }
      
      return { success: true, message: 'Brand deleted successfully' };
    } catch (error) {
      console.error(`Error deleting brand with ID ${params.id}:`, error);
      return { success: false, message: 'Failed to delete brand', error: (error as Error).message };
    }
  });

export default brandRoutes;