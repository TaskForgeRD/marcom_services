import { Elysia } from 'elysia';
import { ClusterRepository, Cluster } from '../repositories/clusterRepository';

const clusterRepository = new ClusterRepository();

const clusterRoutes = new Elysia({ prefix: '/api/clusters' })
  // Get all clusters
  .get('/', async () => {
    try {
      const clusters = await clusterRepository.findAll();
      return { success: true, data: clusters };
    } catch (error) {
      console.error('Error fetching clusters:', error);
      return { success: false, message: 'Failed to fetch clusters', error: (error as Error).message };
    }
  })

  // Get cluster by ID
  .get('/:id', async ({ params }) => {
    try {
      const id = parseInt(params.id);
      const cluster = await clusterRepository.findById(id);
      
      if (!cluster) {
        return { success: false, message: `Cluster with ID ${id} not found` };
      }
      
      return { success: true, data: cluster };
    } catch (error) {
      console.error(`Error fetching cluster with ID ${params.id}:`, error);
      return { success: false, message: 'Failed to fetch cluster', error: (error as Error).message };
    }
  })

  // Create cluster
  .post('/', async ({ body }) => {
    try {
      const clusterData = body as Cluster;
      const newCluster = await clusterRepository.create(clusterData);
      return { success: true, data: newCluster, message: 'Cluster created successfully' };
    } catch (error) {
      console.error('Error creating cluster:', error);
      return { success: false, message: 'Failed to create cluster', error: (error as Error).message };
    }
  })

  // Update cluster
  .put('/:id', async ({ params, body }) => {
    try {
      const id = parseInt(params.id);
      const clusterData = body as Cluster;
      const updated = await clusterRepository.update(id, clusterData);
      
      if (!updated) {
        return { success: false, message: `Cluster with ID ${id} not found` };
      }
      
      return { success: true, message: 'Cluster updated successfully' };
    } catch (error) {
      console.error(`Error updating cluster with ID ${params.id}:`, error);
      return { success: false, message: 'Failed to update cluster', error: (error as Error).message };
    }
  })

  // Delete cluster
  .delete('/:id', async ({ params }) => {
    try {
      const id = parseInt(params.id);
      const deleted = await clusterRepository.delete(id);
      
      if (!deleted) {
        return { success: false, message: `Cluster with ID ${id} not found` };
      }
      
      return { success: true, message: 'Cluster deleted successfully' };
    } catch (error) {
      console.error(`Error deleting cluster with ID ${params.id}:`, error);
      return { success: false, message: 'Failed to delete cluster', error: (error as Error).message };
    }
  });

export default clusterRoutes;