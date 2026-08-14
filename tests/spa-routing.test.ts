import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fc from 'fast-check';
import path from 'path';
import fs from 'fs';
import app from '../src/app';

/**
 * Property-based tests for SPA routing and static file serving.
 * Validates: Requirements 7.2, 7.3, 7.4, 7.5
 */

// Path to frontend dist for setup/teardown
const frontendDistPath = path.join(__dirname, '../frontend/dist');
const indexHtmlPath = path.join(frontendDistPath, 'index.html');

// Arbitrary that generates valid URL path segments (no /api prefix)
const nonApiPathSegment = fc.stringOf(
  fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')
  ),
  { minLength: 1, maxLength: 15 }
);

// Generate random non-API paths like /dashboard, /clients/123, /settings/profile
const nonApiPath = fc
  .array(nonApiPathSegment, { minLength: 1, maxLength: 3 })
  .map((segments) => '/' + segments.join('/'));

// Generate random API paths like /api/users, /api/clients/abc
const apiPath = fc
  .array(nonApiPathSegment, { minLength: 1, maxLength: 3 })
  .map((segments) => '/api/' + segments.join('/'));

describe('SPA Routing - Property Based Tests', () => {
  describe('Property 1: SPA Routing — Rutas no-API devuelven index.html', () => {
    /**
     * **Validates: Requirements 7.2, 7.3**
     *
     * For any route that does NOT start with /api/, the server should respond
     * with the index.html file (HTTP 200) when frontend/dist/index.html exists.
     */
    it('any non-API GET route returns index.html with status 200 when frontend exists', async () => {
      // Ensure index.html exists for this test
      expect(fs.existsSync(indexHtmlPath)).toBe(true);

      await fc.assert(
        fc.asyncProperty(nonApiPath, async (routePath) => {
          const response = await request(app).get(routePath);

          // Should return 200 with HTML content
          expect(response.status).toBe(200);
          expect(response.headers['content-type']).toMatch(/html/);
        }),
        { numRuns: 50 }
      );
    });

    /**
     * **Validates: Requirements 7.5**
     *
     * When frontend/dist/index.html does NOT exist, the fallback should
     * return HTTP 500 with an error message.
     */
    it('non-API routes return 500 when index.html does not exist', async () => {
      // Temporarily rename index.html to simulate it not existing
      const backupPath = indexHtmlPath + '.bak';
      const indexExists = fs.existsSync(indexHtmlPath);

      if (indexExists) {
        fs.renameSync(indexHtmlPath, backupPath);
      }

      try {
        await fc.assert(
          fc.asyncProperty(nonApiPath, async (routePath) => {
            const response = await request(app).get(routePath);

            // Should return 500 when index.html doesn't exist
            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Frontend not available');
          }),
          { numRuns: 20 }
        );
      } finally {
        // Restore index.html
        if (indexExists) {
          fs.renameSync(backupPath, indexHtmlPath);
        }
      }
    });
  });

  describe('Property 2: API Routing — Rutas /api/ son procesadas por el backend', () => {
    /**
     * **Validates: Requirements 7.4**
     *
     * For any request to a route starting with /api/, the server must NOT
     * return the SPA index.html file. The SPA fallback explicitly skips
     * /api routes, so they are processed by the backend API controllers.
     * Random /api paths that don't match a registered route will get a 404
     * (not the SPA fallback), while registered routes require authentication.
     */
    it('any /api/ route never returns the SPA index.html content', async () => {
      // Read the actual index.html content to compare
      const indexContent = fs.existsSync(indexHtmlPath)
        ? fs.readFileSync(indexHtmlPath, 'utf-8')
        : null;

      await fc.assert(
        fc.asyncProperty(apiPath, async (routePath) => {
          const response = await request(app).get(routePath);

          // The key property: API routes NEVER return the index.html content
          // (which would indicate the SPA fallback incorrectly handled it)
          if (indexContent) {
            expect(response.text).not.toBe(indexContent);
          }

          // API routes should never return HTTP 200 with HTML content-type
          // (200 + HTML would mean the SPA fallback served index.html)
          if (response.status === 200 && response.headers['content-type']) {
            expect(response.headers['content-type']).not.toMatch(/html/);
          }
        }),
        { numRuns: 50 }
      );
    });

    /**
     * **Validates: Requirements 7.4**
     *
     * Known API routes return appropriate status codes (not index.html).
     * Registered /api/ endpoints should respond with JSON.
     */
    it('known API routes return auth errors, not frontend HTML', async () => {
      // Test known API endpoints without auth token
      const knownApiRoutes = [
        '/api/auth/me',
        '/api/users',
        '/api/clients',
        '/api/pets',
        '/api/appointments',
      ];

      for (const route of knownApiRoutes) {
        const response = await request(app).get(route);

        // Should be an auth error (401) since we're not authenticated
        expect(response.status).toBe(401);
        expect(response.headers['content-type']).toMatch(/json/);
        // Body should be JSON, not HTML
        expect(response.body).toBeDefined();
        expect(response.text).not.toContain('<!DOCTYPE html>');
        expect(response.text).not.toContain('<html');
      }
    });
  });
});
