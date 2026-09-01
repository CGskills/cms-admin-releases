import { describe, expect, it } from 'vitest';
import { normalizeCodeBlock, normalizeDependencies } from '@/lib/code-blocks/normalize';
import { buildExportCode, wrapFragmentExport } from '@/lib/code-blocks/export';

describe('code block normalization', () => {
  it('always returns safe defaults for nullable database fields', () => {
    const block = normalizeCodeBlock({ id: '1', name: null, html: null, dependencies: null });
    expect(block).toMatchObject({
      id: '1', name: 'Untitled', description: '', html: '', css: '', javascript: '',
      category: 'other', status: 'draft', version: '1.0.0', dependencies: [],
      validation_status: 'unchecked', responsive_status: 'unchecked',
    });
  });

  it('filters malformed dependency entries without breaking the whole list', () => {
    expect(normalizeDependencies([
      { name: 'alpinejs', cdnUrl: 'https://cdn.example/alpine.js' },
      null,
      { name: '' },
      'invalid',
    ])).toEqual([{ name: 'alpinejs', cdnUrl: 'https://cdn.example/alpine.js' }]);
  });

  it('exports complete imported documents byte-for-byte and adds missing dependencies', () => {
    const source = '<!doctype html><html><body><h1>Demo</h1></body></html>';
    const result = buildExportCode(source, '.demo { color: red; }', 'window.ready = true;', [{ name: 'lib', cdnUrl: 'https://cdn.example/lib.js' }], 'Demo');
    expect(result).toContain('<!doctype html><html><body><h1>Demo</h1><script src="https://cdn.example/lib.js"></script>');
    expect(result).toContain('https://cdn.example/lib.js');
    expect(result).toContain('.demo { color: red; }');
    expect(result).toContain('window.ready = true;');
  });

  it('keeps fragment HTML, namespaced CSS and executable JS together', () => {
    const result = wrapFragmentExport('<button class="cta">Go</button>', '.cta { color: red; }', 'console.log("ok")', [], 'tilda-demo');
    expect(result).toContain('<div class="tilda-demo">');
    expect(result).toContain('.tilda-demo .cta');
    expect(result).toContain('console.log("ok")');
  });
});
