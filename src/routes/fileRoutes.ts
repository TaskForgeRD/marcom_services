import { Elysia } from 'elysia';
import { getFilePath, fileExists } from '../utils/fileUpload';
import fs from 'fs';
import path from 'path';

export const fileRoutes = new Elysia()
  .get('/uploads/*', async ({ request }) => {
    const url = new URL(request.url);
    const fileName = url.pathname.replace('/uploads/', '');
    const filePath = getFilePath(fileName);
  
    if (fileExists(fileName)) {
      const fileBuffer = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).slice(1).toLowerCase();
      let contentType = 'application/octet-stream';
      
      // Set appropriate content type based on file extension
      switch (ext) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        case 'pdf':
          contentType = 'application/pdf';
          break;
      }
  
      return new Response(fileBuffer, {
        headers: {
          'Content-Type': contentType,
        }
      });
    } else {
      return new Response('Not found', { status: 404 });
    }
  });