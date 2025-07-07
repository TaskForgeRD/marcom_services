import fs from "fs";
import path from "path";
import crypto from "crypto";

const uploadDir = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Valid image MIME types
const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
];

// File signatures for validation (magic numbers)
const FILE_SIGNATURES = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/gif": [0x47, 0x49, 0x46, 0x38],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF
  "image/bmp": [0x42, 0x4d],
};

/**
 * Validates file mimetype against file signature
 */
function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  const signature = FILE_SIGNATURES[mimeType as keyof typeof FILE_SIGNATURES];
  if (!signature) return false;

  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }
  return true;
}

/**
 * Basic malware detection by checking for suspicious patterns
 */
function detectSuspiciousContent(buffer: Buffer): boolean {
  const content = buffer.toString("utf8", 0, Math.min(buffer.length, 1024));

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /<%/,
    /<\?php/i,
    /eval\(/i,
    /exec\(/i,
    /system\(/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(content));
}

/**
 * Saves an uploaded file to the uploads directory with comprehensive validation
 * @param file The file to save
 * @returns The filename of the saved file
 */
export async function saveFile(file: any): Promise<string> {
  if (!file || !file.name) {
    throw new Error("File tidak valid");
  }

  // 1. Validate file size (15MB max)
  const maxSize = 15 * 1024 * 1024; // 15MB
  if (file.size > maxSize) {
    throw new Error(
      `File terlalu besar. Maksimal 15MB, ukuran file: ${(
        file.size /
        1024 /
        1024
      ).toFixed(2)}MB`
    );
  }

  // 2. Validate MIME type
  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      `Tipe file tidak valid. Hanya menerima: ${VALID_IMAGE_TYPES.join(", ")}`
    );
  }

  // 3. Get file buffer for signature validation
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // 4. Validate file signature (magic numbers)
  if (!validateFileSignature(fileBuffer, file.type)) {
    throw new Error(
      "File signature tidak sesuai dengan MIME type. Kemungkinan file rusak atau berbahaya."
    );
  }

  // 5. Basic malware detection
  if (detectSuspiciousContent(fileBuffer)) {
    throw new Error(
      "File mengandung konten yang mencurigakan dan tidak dapat diunggah."
    );
  }

  // 6. Generate secure filename
  const fileExtension = file.name.split(".").pop()?.toLowerCase();
  const allowedExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "bmp",
    "tiff",
  ];

  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    throw new Error(
      `Ekstensi file tidak valid. Hanya menerima: ${allowedExtensions.join(
        ", "
      )}`
    );
  }

  const fileName = `${crypto.randomUUID()}.${fileExtension}`;
  const filePath = path.join(uploadDir, fileName);

  try {
    await fs.promises.writeFile(filePath, fileBuffer);
    console.log(
      `✅ File berhasil disimpan: ${fileName} (${(
        file.size /
        1024 /
        1024
      ).toFixed(2)}MB)`
    );
    return fileName;
  } catch (error) {
    throw new Error(`Gagal menyimpan file`);
  }
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
