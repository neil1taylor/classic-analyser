import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { execFile } from 'child_process';
import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for temp file storage (500MB limit for large accounts)
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

// Resolve the converter script path
function getScriptPath(): string {
  // In dev: scripts/mdl-to-json.py (relative to project root)
  // In prod: scripts/mdl-to-json.py (copied into Docker image)
  const projectRoot = path.resolve(__dirname, '../../..');
  return path.join(projectRoot, 'scripts', 'mdl-to-json.py');
}

/**
 * POST /api/convert/mdl
 * Accepts a .mdl file upload, converts it to JSON using Python, and returns the result.
 */
router.post('/mdl', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  const uploadedFile = req.file;

  if (!uploadedFile) {
    res.status(400).json({ error: 'No file uploaded. Expected a .mdl file.' });
    return;
  }

  const tempMdl = uploadedFile.path;
  const tempJson = `${tempMdl}.json`;

  try {
    logger.info('Starting .mdl conversion', {
      originalName: uploadedFile.originalname,
      size: `${(uploadedFile.size / 1024 / 1024).toFixed(1)} MB`,
    });

    const scriptPath = getScriptPath();

    // Verify script exists
    try {
      await fs.access(scriptPath);
    } catch {
      logger.error('Converter script not found', { scriptPath });
      res.status(500).json({ error: 'Converter script not found on server.' });
      return;
    }

    // Run the Python converter using execFile (safe — no shell injection)
    await new Promise<void>((resolve, reject) => {
      const proc = execFile(
        'python3',
        [scriptPath, tempMdl, tempJson],
        { timeout: 5 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            logger.error('mdl-to-json.py failed', { stderr, code: error.code });
            reject(new Error(stderr || error.message));
          } else {
            logger.info('mdl-to-json.py completed', { stdout: stdout.trim() });
            resolve();
          }
        }
      );

      // Log if the process is killed
      proc.on('error', (err) => {
        logger.error('Failed to spawn python3', { error: err.message });
        reject(err);
      });
    });

    // Verify output exists
    const stat = await fs.stat(tempJson);
    logger.info('Conversion output ready', { size: `${(stat.size / 1024 / 1024).toFixed(1)} MB` });

    // Stream the JSON file back as the response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', stat.size);

    const stream = createReadStream(tempJson);

    // Clean up temp files only after stream completes (not before)
    const cleanup = () => {
      fs.unlink(tempMdl).catch(() => {});
      fs.unlink(tempJson).catch(() => {});
    };

    stream.on('end', cleanup);
    stream.on('error', (err) => {
      logger.error('Error streaming response', { error: err.message });
      cleanup();
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to read converted file.' });
      }
    });

    stream.pipe(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Conversion failed';
    logger.error('MDL conversion error', { error: message });
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
    // Clean up on error
    fs.unlink(tempMdl).catch(() => {});
    fs.unlink(tempJson).catch(() => {});
  }
});

export default router;
