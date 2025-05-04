import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const uploadDir = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Saves an uploaded file to the uploads directory with a unique filename
 * @param file The file to save
 * @returns The filename of the saved file
 */
export async function saveFile(file: any): Promise<string> {
  if (!file || !file.name) return '';
  
  const fileExtension = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExtension}`;
  const filePath = path.join(uploadDir, fileName);
  
  await fs.promises.writeFile(filePath, await file.arrayBuffer());
  return fileName;
}

/**
 * Gets the full path to a file in the uploads directory
 */
export function getFilePath(fileName: string): string {
  return path.join(uploadDir, fileName);
}

/**
 * Checks if a file exists in the uploads directory
 */
export function fileExists(fileName: string): boolean {
  return fs.existsSync(getFilePath(fileName));
}