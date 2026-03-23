import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

/**
 * Zod schemas for API route input validation (C1).
 * Validates POST bodies at route boundaries where TypeScript types are erased at runtime.
 */

// --- Auth route schemas ---

export const PasscodeSchema = z.object({
  passcode: z.string().min(1, 'Passcode is required').max(256),
});

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required').max(8192),
});

export const RevokeTokenSchema = z.object({
  token: z.string().min(1, 'Token is required').max(8192),
});

// --- Export route schemas ---

export const ClassicExportSchema = z.object({
  data: z.record(z.string(), z.array(z.unknown())).optional(),
  accountName: z.string().max(256).optional(),
  // Allow passthrough of full CollectedData objects (e.g. from import)
  collectionTimestamp: z.string().optional(),
}).passthrough();

export const VpcExportSchema = z.object({
  data: z.record(z.string(), z.array(z.unknown())),
  accountName: z.string().max(256).optional(),
});

export const PowerVsExportSchema = z.object({
  data: z.record(z.string(), z.array(z.unknown())),
  accountName: z.string().max(256).optional(),
});

// --- Middleware factory ---

/**
 * Express middleware that validates req.body against a Zod schema.
 * Returns 400 with structured error details on validation failure.
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Request body failed validation.',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }
    // Replace req.body with parsed (and coerced) data
    req.body = result.data;
    next();
  };
}
