import { Database } from '../database';

export interface Cluster {
  id?: number;
  name: string;
}

export class ClusterRepository {
  private db: Database;

  constructor() {
    this.db = new Database();
  }

  async findAll(): Promise<Cluster[]> {
    return this.db.query<Cluster[]>('SELECT * FROM cluster');
  }

  async findById(id: number): Promise<Cluster | null> {
    const results = await this.db.query<Cluster[]>('SELECT * FROM cluster WHERE id = ?', [id]);
    return results.length > 0 ? results[0] : null;
  }

  async create(cluster: Cluster): Promise<Cluster> {
    const result = await this.db.query<{ insertId: number }>(
      'INSERT INTO cluster (name) VALUES (?)',
      [cluster.name]
    );
    return { ...cluster, id: result.insertId };
  }

  async update(id: number, cluster: Cluster): Promise<boolean> {
    const result = await this.db.query<{ affectedRows: number }>(
      'UPDATE cluster SET name = ? WHERE id = ?',
      [cluster.name, id]
    );
    return result.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.query<{ affectedRows: number }>(
      'DELETE FROM cluster WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}