import { Elysia } from 'elysia';
import * as clusterService from '../services/clusterService';

export const clusterController = new Elysia()
  .get('/api/clusters', async () => {
    return await clusterService.getAllClusters();
  });