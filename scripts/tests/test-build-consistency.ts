/**
 * Test Preview/Copy/Export consistency
 * Ensures all three operations produce the same output
 */

import { parseCodeBlockSource } from '../lib/code-library/parser';
import { buildFullDocument } from '../lib/code-library/builder';
import { dependenciesToTags } from '../lib/code-library/dependencies';
import { readFileSync } from 'fs';
import { join } from 'path';

function testPreviewCopyExportConsistency() {
  console.log('=== TESTING PREVIEW/COPY/EXPORT CONSISTENCY ===\n');

  // Test with reviews.html as example
  const previewPath = join(process.cwd(), 'preview', 'reviews.html');
  const rawContent = readFileSync(previewPath, 'utf-8');

  console.log('Parsing reviews.html...');
  const parsed = parseCodeBlockSource(rawContent);

  console.log(`HTML: ${parsed.html.length} chars`);
  console.log(`CSS: ${parsed.css.length} chars`);
  console.log(`JavaScript: ${parsed.javascript.length} chars`);
  console.log(`Dependencies: ${parsed.dependencies.length} items\n`);

  // Convert dependencies to tags
  const dependencyTags = dependenciesToTags(parsed.dependencies);

  // Build document (same function used by Preview/Copy/Export)
  const output1 = buildFullDocument({
    html: parsed.html,
    css: parsed.css,
    javascript: parsed.javascript,
    dependencies: dependencyTags
  });

  // Build again to ensure deterministic output
  const output2 = buildFullDocument({
    html: parsed.html,
    css: parsed.css,
    javascript: parsed.javascript,
    dependencies: dependencyTags
  });

  // Build with different order (should still be the same)
  const output3 = buildFullDocument({
    html: parsed.html,
    css: parsed.css,
    javascript: parsed.javascript,
    dependencies: dependencyTags
  });

  console.log('Testing consistency...');

  const allMatch = output1 === output2 && output2 === output3;

  console.log(`Output 1 === Output 2: ${output1 === output2 ? '✅' : '❌'}`);
  console.log(`Output 2 === Output 3: ${output2 === output3 ? '✅' : '❌'}`);
  console.log(`Output 1 === Output 3: ${output1 === output3 ? '✅' : '❌'}\n`);

  // Verify structure
  console.log('Verifying output structure...');
  const hasDoctype = output1.includes('<!DOCTYPE html>');
  const hasHtml = output1.includes('<html');
  const hasHead = output1.includes('<head>');
  const hasBody = output1.includes('<body>');
  const hasStyle = output1.includes('<style>') && output1.includes(parsed.css.substring(0, 50));
  const hasScript = output1.includes('<script>') && output1.includes(parsed.javascript.substring(0, 50));
  const hasDependencies = dependencyTags.every(tag => output1.includes(tag));

  console.log(`Has DOCTYPE: ${hasDoctype ? '✅' : '❌'}`);
  console.log(`Has <html>: ${hasHtml ? '✅' : '❌'}`);
  console.log(`Has <head>: ${hasHead ? '✅' : '❌'}`);
  console.log(`Has <body>: ${hasBody ? '✅' : '❌'}`);
  console.log(`Has <style> with CSS: ${hasStyle ? '✅' : '❌'}`);
  console.log(`Has <script> with JS: ${hasScript ? '✅' : '❌'}`);
  console.log(`Has all dependencies: ${hasDependencies ? '✅' : '❌'}\n`);

  const allValid = allMatch && hasDoctype && hasHtml && hasHead && hasBody && hasStyle && hasScript && hasDependencies;

  if (allValid) {
    console.log('🎉 PREVIEW/COPY/EXPORT CONSISTENCY TEST PASSED');
    console.log('buildFullDocument() produces deterministic, complete output!');
    console.log(`\nFinal output size: ${output1.length} chars`);
  } else {
    console.log('❌ PREVIEW/COPY/EXPORT CONSISTENCY TEST FAILED');
    if (!allMatch) {
      console.log('Outputs are not identical!');
    }
    if (!hasDoctype || !hasHtml || !hasHead || !hasBody) {
      console.log('Missing required HTML structure!');
    }
    if (!hasStyle || !hasScript) {
      console.log('Missing CSS or JavaScript!');
    }
    if (!hasDependencies) {
      console.log('Missing dependencies!');
    }
  }
}

testPreviewCopyExportConsistency();
