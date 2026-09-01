import { describe, expect, it } from 'vitest';
import { isFullDocument, isCompleteBlock, buildExportCode, appendCodeToDocument } from '@/lib/code-blocks/export';

describe('Full document detection and export logic', () => {
  describe('isFullDocument', () => {
    it('detects doctype declaration (lowercase)', () => {
      expect(isFullDocument('<!doctype html><html><body></body></html>')).toBe(true);
    });

    it('detects doctype declaration (uppercase)', () => {
      expect(isFullDocument('<!DOCTYPE html><html><body></body></html>')).toBe(true);
    });

    it('detects html tag without doctype', () => {
      expect(isFullDocument('<html><head></head><body></body></html>')).toBe(true);
    });

    it('detects html tag with attributes', () => {
      expect(isFullDocument('<html lang="en"><body></body></html>')).toBe(true);
    });

    it('returns false for fragment with div', () => {
      expect(isFullDocument('<div><h1>Title</h1></div>')).toBe(false);
    });

    it('returns false for fragment with style tag', () => {
      expect(isFullDocument('<style>.test{}</style><div>Content</div>')).toBe(false);
    });
  });

  describe('isCompleteBlock', () => {
    it('returns true for full document', () => {
      expect(isCompleteBlock('<!doctype html><html></html>')).toBe(true);
    });

    it('returns false for fragment with embedded style', () => {
      const html = '<div><style>.test{}</style><p>Content</p></div>';
      expect(isCompleteBlock(html)).toBe(false); // Updated: only full documents are complete
    });

    it('returns false for fragment with embedded script', () => {
      const html = '<div><script>console.log("ok")</script><p>Content</p></div>';
      expect(isCompleteBlock(html)).toBe(false); // Updated: only full documents are complete
    });

    it('returns false for fragment without style/script tags', () => {
      expect(isCompleteBlock('<div><p>Content</p></div>')).toBe(false);
    });
  });

  describe('buildExportCode with imported full documents', () => {
    it('preserves full document byte-for-byte when css and js are empty', () => {
      const original = '<!doctype html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>';
      const result = buildExportCode(original, '', '', [], 'Test');
      expect(result).toBe(original);
    });

    it('appends missing dependencies to full document', () => {
      const html = '<!doctype html><html><body><h1>Test</h1></body></html>';
      const deps = [{ name: 'lib', cdnUrl: 'https://cdn.example/lib.js' }];
      const result = buildExportCode(html, '', '', deps, 'Test');
      expect(result).toContain('https://cdn.example/lib.js');
      expect(result).toContain('<script src="https://cdn.example/lib.js"></script>');
      expect(result).toContain('</body>');
    });

    it('does not duplicate existing dependencies', () => {
      const html = '<!doctype html><html><body><script src="https://cdn.example/lib.js"></script></body></html>';
      const deps = [{ name: 'lib', cdnUrl: 'https://cdn.example/lib.js' }];
      const result = buildExportCode(html, '', '', deps, 'Test');
      const matches = result.match(/https:\/\/cdn\.example\/lib\.js/g);
      expect(matches?.length).toBe(1);
    });

    it('allows user to extend imported document with additional css', () => {
      const html = '<!doctype html><html><head></head><body><h1>Test</h1></body></html>';
      const userCss = '.custom { color: red; }';
      const result = buildExportCode(html, userCss, '', [], 'Test');
      expect(result).toContain('<style>');
      expect(result).toContain('.custom { color: red; }');
      expect(result).toContain('</style>');
      expect(result).toContain('</head>');
    });

    it('allows user to extend imported document with additional javascript', () => {
      const html = '<!doctype html><html><body><h1>Test</h1></body></html>';
      const userJs = 'console.log("user code");';
      const result = buildExportCode(html, '', userJs, [], 'Test');
      expect(result).toContain('<script>');
      expect(result).toContain('console.log("user code");');
      expect(result).toContain('</script>');
      expect(result).toContain('</body>');
    });
  });

  describe('buildExportCode with complete blocks (fragments with embedded style/script)', () => {
    it('extracts embedded styles and wraps fragment with namespace', () => {
      const html = '<div><style>.widget{color:blue}</style><p>Content</p></div>';
      const result = buildExportCode(html, '', '', [], 'Widget');
      // Now extracts embedded code and wraps with namespace
      expect(result).toContain('<div class="tilda-widget">');
      expect(result).toContain('.tilda-widget'); // CSS should be namespaced
    });

    it('wraps and namespaces plain fragment without embedded code', () => {
      const html = '<button class="cta">Click</button>';
      const css = '.cta { background: red; }';
      const result = buildExportCode(html, css, '', [], 'CTA Button');
      expect(result).toContain('<div class="tilda-cta-button">');
      expect(result).toContain('.tilda-cta-button .cta');
      expect(result).toContain('<button class="cta">Click</button>');
    });
  });

  describe('appendCodeToDocument edge cases', () => {
    it('inserts style in head when head tag exists', () => {
      const html = '<!doctype html><html><head><title>Test</title></head><body></body></html>';
      const css = 'body { margin: 0; }';
      const result = appendCodeToDocument(html, css, '', []);
      expect(result).toMatch(/<style>[\s\S]*body { margin: 0; }[\s\S]*<\/style>[\s\S]*<\/head>/);
    });

    it('prepends style when no head tag exists', () => {
      const html = '<!doctype html><html><body>Content</body></html>';
      const css = 'body { margin: 0; }';
      const result = appendCodeToDocument(html, css, '', []);
      expect(result).toMatch(/^<style>/);
    });

    it('inserts script before closing body tag', () => {
      const html = '<!doctype html><html><body><h1>Test</h1></body></html>';
      const js = 'console.log("ready");';
      const result = appendCodeToDocument(html, '', js, []);
      expect(result).toMatch(/<script>[\s\S]*console\.log\("ready"\);[\s\S]*<\/script>[\s\S]*<\/body>/);
    });

    it('appends script when no body tag exists', () => {
      const html = '<!doctype html><html><div>Content</div></html>';
      const js = 'console.log("ready");';
      const result = appendCodeToDocument(html, '', js, []);
      expect(result).toMatch(/<\/html>[\s\S]*<script>/);
    });
  });
});
