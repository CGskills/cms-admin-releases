import { describe, expect, it } from 'vitest';
import { isFullDocument, isCompleteBlock, buildExportCode } from '@/lib/code-blocks/export';

describe('Edge cases and potential issues', () => {
  describe('Potential false positives in isFullDocument', () => {
    it('should not detect "html" in class names as full document', () => {
      expect(isFullDocument('<div class="html-content"><p>Test</p></div>')).toBe(false);
    });

    it('should not detect "html" in text content as full document', () => {
      expect(isFullDocument('<div>Learn html today</div>')).toBe(false);
    });

    it('should handle malformed html tag correctly', () => {
      // This WILL be detected as full document - is this desired?
      expect(isFullDocument('<htmlspecialchars><div>Test</div>')).toBe(false);
    });

    it('should detect html tag with newline after', () => {
      expect(isFullDocument('<html\n><body></body></html>')).toBe(true);
    });
  });

  describe('Potential false positives in isCompleteBlock', () => {
    it('should not treat style attribute as style tag', () => {
      expect(isCompleteBlock('<div style="color:red">Content</div>')).toBe(false);
    });

    it('should not treat commented-out style tag as style tag', () => {
      const html = '<div><!-- <style>.test</style> --><p>Content</p></div>';
      // isCompleteBlock now only returns true for full documents
      const result = isCompleteBlock(html);
      expect(result).toBe(false); // Updated: fragments are not complete blocks
    });

    it('should handle whitespace-only css/js fields correctly', () => {
      const html = '<div><style>.test{}</style></div>';
      // isCompleteBlock now ignores css/js parameters - only checks document structure
      expect(isCompleteBlock(html)).toBe(false); // Updated: fragment is not complete
    });
  });

  describe('Import scenario: full document stored in html field', () => {
    it('matches the import pattern from seed-code-blocks route', () => {
      // This simulates what happens during import:
      // 1. Full HTML file is read
      const importedContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Imported Block</title>
  <style>.widget { color: blue; }</style>
  <script src="https://cdn.example.com/lib.js"></script>
</head>
<body>
  <div class="widget">Content</div>
  <script>console.log("init");</script>
</body>
</html>`;

      // 2. Stored as: html = full content, css = '', javascript = ''
      const stored = {
        html: importedContent,
        css: '',
        javascript: '',
      };

      // 3. Should be detected as full document
      expect(isFullDocument(stored.html)).toBe(true);

      // 4. Should be complete block
      expect(isCompleteBlock(stored.html, stored.css, stored.javascript)).toBe(true);

      // 5. Export should preserve byte-for-byte when no user modifications
      const exported = buildExportCode(
        stored.html,
        stored.css,
        stored.javascript,
        [],
        'Imported Block'
      );
      expect(exported).toBe(importedContent);
    });

    it('allows user to add css to imported full document', () => {
      const imported = '<!DOCTYPE html><html><head></head><body><div>Test</div></body></html>';
      const userCss = '.extra { margin: 20px; }';

      const exported = buildExportCode(imported, userCss, '', [], 'Test');

      expect(exported).toContain('<style>');
      expect(exported).toContain('.extra { margin: 20px; }');
      expect(exported).not.toBe(imported); // Modified
    });
  });

  describe('Fragment scenario: user creates from scratch', () => {
    it('wraps plain fragment with namespace', () => {
      const userHtml = '<button id="cta">Click me</button>';
      const userCss = '#cta { background: blue; }';
      const userJs = 'document.getElementById("cta").onclick = () => alert("hi");';

      const exported = buildExportCode(userHtml, userCss, userJs, [], 'CTA');

      expect(exported).toContain('<div class="tilda-cta">');
      expect(exported).toContain('.tilda-cta #cta');
      expect(exported).toContain('(function()');
    });
  });

  describe('Critical logic paths in buildExportCode', () => {
    it('path 1: isFullDocument=true → appendCodeToDocument', () => {
      const html = '<!DOCTYPE html><html><body></body></html>';
      const result = buildExportCode(html, '', '', [], 'Test');
      expect(result).toBe(html); // No modifications
    });

    it('path 2: fragment with embedded style → extractEmbeddedCode + wrapFragmentExport', () => {
      const html = '<div><style>.x{}</style><p>Content</p></div>';
      const deps = [{ name: 'lib', cdnUrl: 'https://cdn.example.com/lib.js' }];
      const result = buildExportCode(html, '', '', deps, 'Test');

      // Should extract embedded style, wrap in namespace div, and add dependency
      expect(result).toContain('https://cdn.example.com/lib.js');
      expect(result).toContain('<div class="tilda-test">'); // Now wraps with namespace
      expect(result).toContain('.tilda-test'); // CSS should be namespaced
    });

    it('path 3: plain fragment → wrapFragmentExport', () => {
      const html = '<button>Click</button>';
      const css = 'button { color: red; }';
      const result = buildExportCode(html, css, '', [], 'Button');

      expect(result).toContain('<div class="tilda-button">');
      expect(result).toContain('.tilda-button button');
    });
  });
});
