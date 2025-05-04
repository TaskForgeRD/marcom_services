import { Elysia } from 'elysia';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

// Static file serving middleware
const staticRoutes = new Elysia({ prefix: '/uploads' })
  .get('/:filename', async ({ params, set }) => {
    try {
      const uploadDir = join(process.cwd(), 'uploads');
      const filePath = join(uploadDir, params.filename);
      
      if (!existsSync(filePath)) {
        set.status = 404;
        return { success: false, message: 'File not found' };
      }
      
      const fileData = await readFile(filePath);
      
      // Set content type based on file extension
      const ext = params.filename.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'jpg':
        case 'jpeg':
          set.headers['Content-Type'] = 'image/jpeg';
          break;
        case 'png':
          set.headers['Content-Type'] = 'image/png';
          break;
        case 'gif':
          set.headers['Content-Type'] = 'image/gif';
          break;
        case 'svg':
          set.headers['Content-Type'] = 'image/svg+xml';
          break;
        default:
          set.headers['Content-Type'] = 'application/octet-stream';
      }
      
      return fileData;
    } catch (error) {
      console.error(`Error serving file ${params.filename}:`, error);
      set.status = 500;
      return { success: false, message: 'Failed to serve file', error: (error as Error).message };
    }
  });

export default staticRoutes;