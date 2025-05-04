import { Elysia } from 'elysia';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Define upload directory
const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
}

// Create file plugin
export const filePlugin = new Elysia({ name: 'file' })
  .derive(async () => {
    await ensureUploadDir();
    
    return {
      // Save file and return path
      saveFile: async (file: File): Promise<string> => {
        if (!file) return '';
        
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const filename = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const filepath = join(UPLOAD_DIR, filename);
          
          await writeFile(filepath, buffer);
          
          // Return relative path for database storage
          return `/uploads/${filename}`;
        } catch (error) {
          console.error('Error saving file:', error);
          throw new Error('Failed to save file');
        }
      }
    };
  });