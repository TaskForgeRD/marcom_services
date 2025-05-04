import { Database } from '../database';

export interface Brand {
  id?: number;
  name: string;
}

export class BrandRepository {
  private db: Database;

  constructor() {
    this.db = new Database();
  }

  async findAll(): Promise<Brand[]> {
    return this.db.query<Brand[]>('SELECT * FROM brand');
  }

  async findById(id: number): Promise<Brand | null> {
    const results = await this.db.query<Brand[]>('SELECT * FROM brand WHERE id = ?', [id]);
    return results.length > 0 ? results[0] : null;
  }

  async create(brand: Brand): Promise<Brand> {
    const result = await this.db.query<{ insertId: number }>(
      'INSERT INTO brand (name) VALUES (?)',
      [brand.name]
    );
    return { ...brand, id: result.insertId };
  }

  async update(id: number, brand: Brand): Promise<boolean> {
    const result = await this.db.query<{ affectedRows: number }>(
      'UPDATE brand SET name = ? WHERE id = ?',
      [brand.name, id]
    );
    return result.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.query<{ affectedRows: number }>(
      'DELETE FROM brand WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}