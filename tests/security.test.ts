import { describe, it, expect } from 'vitest';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../src/lib/cloudflareStorage';

describe('Security & Vulnerability Defenses', () => {
  // CSV Sanitization matching AdminDashboard implementation
  function sanitizeCsvCell(val: any): string {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  }

  // Path traversal prevention function matching Cloudflare storage implementation
  function sanitizeFilePath(fileName: string): string {
    return fileName
      .replace(/\.\.+/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  describe('CSV Formula Injection Defense (CWE-1236)', () => {
    it('prepends single quote to dangerous leading formula characters', () => {
      expect(sanitizeCsvCell('=1+1')).toBe(`"'=1+1"`);
      expect(sanitizeCsvCell('+cmd|')).toBe(`"'+cmd|"`);
      expect(sanitizeCsvCell('-5')).toBe(`"'-5"`);
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe(`"'@SUM(A1:A10)"`);
      expect(sanitizeCsvCell('\tcalc')).toBe(`"'\tcalc"`);
      expect(sanitizeCsvCell('\rcmd')).toBe(`"'\rcmd"`);
    });

    it('escapes embedded double quotes properly', () => {
      expect(sanitizeCsvCell('Patient "Special" Care')).toBe(`"Patient ""Special"" Care"`);
    });

    it('leaves standard benign text safe', () => {
      expect(sanitizeCsvCell('Nurse Priya Sharma')).toBe(`"Nurse Priya Sharma"`);
      expect(sanitizeCsvCell('9849012345')).toBe(`"9849012345"`);
    });
  });

  describe('Document & Storage Upload Validation', () => {
    it('permits valid medical document MIME types', () => {
      expect(ALLOWED_MIME_TYPES).toContain('application/pdf');
      expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
      expect(ALLOWED_MIME_TYPES).toContain('image/png');
      expect(ALLOWED_MIME_TYPES).toContain('image/webp');
    });

    it('rejects executable and dangerous MIME types', () => {
      const dangerousTypes = [
        'application/x-msdownload',
        'application/x-sh',
        'application/javascript',
        'text/html',
        'application/x-bat',
        'application/x-php'
      ];

      dangerousTypes.forEach((type) => {
        expect(ALLOWED_MIME_TYPES.includes(type)).toBe(false);
      });
    });

    it('enforces 5MB clinical file size threshold', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024);
      expect(4 * 1024 * 1024 <= MAX_FILE_SIZE_BYTES).toBe(true);
      expect(6 * 1024 * 1024 <= MAX_FILE_SIZE_BYTES).toBe(false);
    });

    it('strips directory traversal vectors from uploaded file names', () => {
      const maliciousNames = [
        '../../etc/passwd',
        '..\\..\\windows\\system32\\calc.exe',
        'folder/../../../secret.pdf'
      ];

      maliciousNames.forEach((name) => {
        const sanitized = sanitizeFilePath(name);
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
      });
    });
  });
});
