import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to the alt_input directory */
export const ALT_INPUT_DIR = path.resolve(__dirname, '../../alt_input');

/** Account 3 directory */
export const ACCOUNT3_DIR = path.join(ALT_INPUT_DIR, '3');

/**
 * Read a test file from alt_input as a UTF-8 string.
 */
export function readTestFileText(accountDir: string, filename: string): string {
  return fs.readFileSync(path.join(accountDir, filename), 'utf-8');
}

/**
 * Read a test file from alt_input as a Buffer.
 */
export function readTestFileBuffer(accountDir: string, filename: string): Buffer {
  return fs.readFileSync(path.join(accountDir, filename));
}

/**
 * Create a browser-like File object from a buffer (for XLSX parsers).
 * Works in jsdom environment. Polyfills arrayBuffer() since jsdom's File
 * may not support it.
 */
export function createFileFromBuffer(buffer: Buffer, filename: string, mimeType = 'application/octet-stream'): File {
  // Convert Node Buffer to a clean ArrayBuffer (Buffer.buffer may be a shared pool)
  const ab = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; i++) view[i] = buffer[i];

  const file = new File([ab], filename, { type: mimeType });
  // jsdom's File doesn't implement arrayBuffer() — polyfill it
  if (typeof file.arrayBuffer !== 'function') {
    file.arrayBuffer = () => Promise.resolve(ab);
  }
  return file;
}

/**
 * Create a mock FileList from an array of File objects.
 * Used by classifyReportFiles which expects a FileList.
 */
export function createMockFileList(files: File[]): FileList {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: function* () {
      for (const file of files) yield file;
    },
  } as unknown as FileList;

  // Add numeric indexing
  files.forEach((file, i) => {
    Object.defineProperty(fileList, i, { value: file, enumerable: true });
  });

  return fileList;
}
