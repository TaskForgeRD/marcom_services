import * as clusterModel from "../models/clusterModel";

export async function getAllClusters() {
  return await clusterModel.getAllClusters();
}

export async function getClusterById(id: number) {
  return await clusterModel.getClusterById(id);
}

export async function getClusterByName(name: string) {
  return await clusterModel.getClusterByName(name);
}

export async function getClusterIdByName(name: string) {
  const cluster = await clusterModel.getClusterByName(name);
  return cluster?.id;
}

export async function createCluster(name: string) {
  return await clusterModel.createCluster(name);
}

export async function updateCluster(id: number, name: string) {
  return await clusterModel.updateCluster(id, name);
}

export async function deleteCluster(id: number) {
  return await clusterModel.deleteCluster(id);
}
