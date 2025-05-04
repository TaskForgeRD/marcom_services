import * as clusterModel from '../models/clusterModel';

export async function getAllClusters() {
  return await clusterModel.getAllClusters();
}

export async function getClusterIdByName(name: string) {
  const cluster = await clusterModel.getClusterByName(name);
  return cluster?.id;
}