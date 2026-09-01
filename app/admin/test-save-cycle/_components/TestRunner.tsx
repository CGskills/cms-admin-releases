'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { normalizeCodeBlock } from '@/lib/code-blocks/normalize';
import Button from '@/components/ui/Button';

interface TestResult {
  test: string;
  passed: boolean;
  message?: string;
  details?: unknown;
}

export default function TestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{ passed: number; failed: number; total: number } | null>(null);

  const supabase = createClient();

  function log(test: string, passed: boolean, message?: string, details?: unknown) {
    const result = { test, passed, message, details };
    setResults(prev => [...prev, result]);
    return result;
  }

  async function cleanup(blockId: string) {
    await supabase.from('code_blocks').delete().eq('id', blockId);
  }

  async function test1CreateTestBlock() {
    const testBlock = {
      name: 'Test Block - Save Cycle',
      description: 'Test block for save cycle validation',
      category: 'other' as const,
      html: '<div class="test">Original HTML</div>',
      css: '.test { color: red; }',
      javascript: 'console.log("Original JS");',
      dependencies: [],
      status: 'draft' as const,
      version: '1.0.0',
    };

    const { data, error } = await supabase
      .from('code_blocks')
      .insert(testBlock)
      .select('*')
      .single();

    if (error || !data) {
      log('1. Create test block', false, error?.message || 'No data returned');
      return null;
    }

    log('1. Create test block', true, `Block created with ID: ${data.id}`);
    return data;
  }

  async function test2UpdateBlock(blockId: string) {
    const editedContent = {
      html: '<div class="test edited">Edited HTML Content</div><p>New paragraph</p>',
      css: '.test { color: blue; font-size: 20px; }\n.edited { font-weight: bold; }',
      javascript: 'console.log("Edited JS");\nalert("Test alert");',
    };

    const { error } = await supabase
      .from('code_blocks')
      .update({
        html: editedContent.html,
        css: editedContent.css,
        javascript: editedContent.javascript,
        version: '1.0.1',
      })
      .eq('id', blockId);

    if (error) {
      log('2. Update block', false, error.message);
      return null;
    }

    log('2. Update block', true, 'Block updated successfully');
    return editedContent;
  }

  async function test3VerifySave(blockId: string, expected: { html: string; css: string; javascript: string }) {
    const { data, error } = await supabase
      .from('code_blocks')
      .select('*')
      .eq('id', blockId)
      .single();

    if (error || !data) {
      log('3. Read saved block', false, error?.message || 'No data');
      return false;
    }

    const htmlMatches = data.html === expected.html;
    const cssMatches = data.css === expected.css;
    const jsMatches = data.javascript === expected.javascript;

    log('3.1 HTML saved correctly', htmlMatches,
      htmlMatches ? 'Match' : `Expected length ${expected.html.length}, got ${data.html?.length || 0}`);
    log('3.2 CSS saved correctly', cssMatches,
      cssMatches ? 'Match' : `Expected length ${expected.css.length}, got ${data.css?.length || 0}`);
    log('3.3 JavaScript saved correctly', jsMatches,
      jsMatches ? 'Match' : `Expected length ${expected.javascript.length}, got ${data.javascript?.length || 0}`);

    return htmlMatches && cssMatches && jsMatches;
  }

  async function test4SimulateReload(blockId: string, expected: { html: string; css: string; javascript: string }) {
    const { data, error } = await supabase
      .from('code_blocks')
      .select('*')
      .eq('id', blockId)
      .single();

    if (error || !data) {
      log('4. Reload block', false, error?.message || 'No data');
      return false;
    }

    const normalized = normalizeCodeBlock(data);
    if (!normalized) {
      log('4.1 Normalize after reload', false, 'Normalization failed');
      return false;
    }

    const htmlMatches = normalized.html === expected.html;
    const cssMatches = normalized.css === expected.css;
    const jsMatches = normalized.javascript === expected.javascript;

    log('4.1 HTML persists after reload', htmlMatches);
    log('4.2 CSS persists after reload', cssMatches);
    log('4.3 JavaScript persists after reload', jsMatches);
    log('4.4 All fields remain filled', htmlMatches && cssMatches && jsMatches);

    return htmlMatches && cssMatches && jsMatches;
  }

  async function test5LegacyBlock() {
    const legacyBlock = {
      name: 'Legacy Test Block',
      description: 'Tests legacy block normalization',
      category: 'other' as const,
      html: `<style>.legacy { color: green; font-size: 16px; }</style>
<div class="legacy">Legacy content in HTML field</div>
<script>console.log("legacy script"); alert("legacy");</script>`,
      css: '',
      javascript: '',
      dependencies: [],
      status: 'draft' as const,
      version: '1.0.0',
    };

    const { data: created, error: createError } = await supabase
      .from('code_blocks')
      .insert(legacyBlock)
      .select('*')
      .single();

    if (createError || !created) {
      log('5. Create legacy block', false, createError?.message);
      return null;
    }

    log('5. Create legacy block', true);

    const { data: raw, error: readError } = await supabase
      .from('code_blocks')
      .select('*')
      .eq('id', created.id)
      .single();

    if (readError || !raw) {
      log('5.1 Read legacy block', false, readError?.message);
      await cleanup(created.id);
      return null;
    }

    const normalized = normalizeCodeBlock(raw);
    if (!normalized) {
      log('5.2 Normalize legacy block', false, 'Normalization returned null');
      await cleanup(created.id);
      return null;
    }

    const cssExtracted = normalized.css.includes('.legacy') && normalized.css.includes('color: green');
    const jsExtracted = normalized.javascript.includes('console.log') && normalized.javascript.includes('legacy');
    const htmlClean = !normalized.html.includes('<style') && !normalized.html.includes('<script>');

    log('5.1 CSS extracted from HTML', cssExtracted, cssExtracted ? 'Found .legacy styles' : 'CSS not extracted');
    log('5.2 JavaScript extracted from HTML', jsExtracted, jsExtracted ? 'Found legacy script' : 'JS not extracted');
    log('5.3 HTML cleaned (no style/script tags)', htmlClean, htmlClean ? 'Clean HTML' : 'Still contains tags');

    await cleanup(created.id);
    return cssExtracted && jsExtracted && htmlClean;
  }

  async function test6MultipleUpdates(blockId: string) {
    const updates = [
      { html: '<div>Update 1</div>', css: '.u1 { color: red; }', javascript: 'console.log(1);' },
      { html: '<div>Update 2</div>', css: '.u2 { color: blue; }', javascript: 'console.log(2);' },
      { html: '<div>Update 3</div>', css: '.u3 { color: green; }', javascript: 'console.log(3);' },
    ];

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      const version = `1.${i + 1}.0`;

      const { error } = await supabase
        .from('code_blocks')
        .update({
          html: update.html,
          css: update.css,
          javascript: update.javascript,
          version,
        })
        .eq('id', blockId);

      if (error) {
        log(`6.${i + 1} Multiple update ${i + 1}`, false, error.message);
        return false;
      }

      const { data, error: readError } = await supabase
        .from('code_blocks')
        .select('*')
        .eq('id', blockId)
        .single();

      if (readError || !data) {
        log(`6.${i + 1} Verify update ${i + 1}`, false, readError?.message || 'No data');
        return false;
      }

      const matches = data.html === update.html &&
                     data.css === update.css &&
                     data.javascript === update.javascript;

      log(`6.${i + 1} Multiple update ${i + 1} verified`, matches, matches ? 'All fields correct' : 'Data mismatch');

      if (!matches) {
        return false;
      }
    }

    return true;
  }

  async function runAllTests() {
    setIsRunning(true);
    setResults([]);
    setSummary(null);

    let testBlockId: string | null = null;
    let expectedContent: { html: string; css: string; javascript: string } | null = null;

    try {
      const created = await test1CreateTestBlock();
      if (!created) {
        return;
      }
      testBlockId = created.id;

      if (!testBlockId) {
        log('ERROR', false, 'Failed to get block ID');
        return;
      }

      expectedContent = await test2UpdateBlock(testBlockId);
      if (!expectedContent) {
        return;
      }

      await test3VerifySave(testBlockId, expectedContent);
      await test4SimulateReload(testBlockId, expectedContent);
      await test5LegacyBlock();
      if (testBlockId) {
        await test6MultipleUpdates(testBlockId);
      }

    } catch (error) {
      log('ERROR', false, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      if (testBlockId) {
        await cleanup(testBlockId);
        log('Cleanup', true, `Cleaned up test block: ${testBlockId}`);
      }

      setIsRunning(false);
    }
  }

  // Calculate summary when results change
  if (results.length > 0 && !isRunning && !summary) {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    setSummary({ passed, failed, total });
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          onClick={runAllTests}
          disabled={isRunning}
          isLoading={isRunning}
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">Test Results</h2>
            <div className="space-y-2">
              {results.map((result, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    result.passed
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}
                >
                  <span className="text-xl">
                    {result.passed ? '✅' : '❌'}
                  </span>
                  <div className="flex-1">
                    <div className={`font-medium ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                      {result.test}
                    </div>
                    {result.message && (
                      <div className="text-sm text-slate-400 mt-1">
                        {result.message}
                      </div>
                    )}
                    {result.details ? (
                      <pre className="text-xs text-slate-500 mt-2 overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {summary && (
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-3">Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{summary.total}</div>
                  <div className="text-sm text-slate-400">Total Tests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{summary.passed}</div>
                  <div className="text-sm text-slate-400">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{summary.failed}</div>
                  <div className="text-sm text-slate-400">Failed</div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-lg font-semibold text-[#DB9844]">
                  Success Rate: {((summary.passed / summary.total) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
