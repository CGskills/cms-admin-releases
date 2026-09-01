async function runImportTest() {
  const button = document.getElementById('runTest');
  const output = document.getElementById('output');

  button.disabled = true;
  output.innerHTML = '';

  function log(message, type = '') {
    const line = document.createElement('div');
    if (type) line.className = type;
    line.textContent = message;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  try {
    log('=== CODE BLOCKS IMPORT TEST ===\n', 'loading');

    // Step 1: Check existing blocks before import
    log('Step 1: Checking existing blocks in DB...', 'loading');
    const beforeResponse = await fetch('/api/debug-code-blocks');
    const beforeData = await beforeResponse.json();
    log(`Found ${beforeData.blocks?.length || 0} existing blocks:`, 'success');
    beforeData.blocks?.forEach(block => {
      log(`  - ${block.name} (id: ${block.id})`);
    });
    log('');

    // Step 2: Run the import
    log('Step 2: Running import via /api/seed-code-blocks...', 'loading');
    const response = await fetch('/api/seed-code-blocks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      log(`Import failed with status ${response.status}`, 'error');
      const text = await response.text();
      log('Response: ' + text, 'error');
      button.disabled = false;
      return;
    }

    const importResult = await response.json();
    log('Import Response:', 'success');
    log(JSON.stringify(importResult, null, 2));
    log('');

    // Step 3: Check results for each block
    log('Step 3: Analyzing import results...', 'loading');
    if (importResult.results) {
      importResult.results.forEach(result => {
        log(`\nBlock: ${result.name}`);
        log(`  Source file: ${result.sourceFile}`);
        log(`  Action: ${result.action || 'ERROR'}`, result.error ? 'error' : 'success');
        if (result.error) {
          log(`  ❌ Error: ${result.error}`, 'error');
        } else {
          log(`  ✓ HTML length: ${result.htmlLength || 0} chars`, 'success');
          log(`  ✓ CSS length: ${result.cssLength || 0} chars`, 'success');
          log(`  ✓ JS length: ${result.javascriptLength || 0} chars`, 'success');
          log(`  ✓ Dependencies: ${result.dependenciesCount || 0}`, 'success');
        }
      });
    }
    log('');

    // Step 4: Verify data in DB after import
    log('Step 4: Verifying data in DB after import...', 'loading');
    const afterResponse = await fetch('/api/debug-code-blocks');
    const afterData = await afterResponse.json();

    log(`\nTotal blocks in DB: ${afterData.blocks?.length || 0}\n`, 'success');

    afterData.blocks?.forEach(block => {
      log(`Block: ${block.name}`);
      log(`  HTML length: ${block.html?.length || 0} chars`);
      log(`  CSS length: ${block.css?.length || 0} chars`);
      log(`  JS length: ${block.javascript?.length || 0} chars`);
      log(`  Dependencies: ${block.dependencies?.length || 0}`);
      if (block.dependencies && block.dependencies.length > 0) {
        block.dependencies.forEach(dep => {
          log(`    - ${dep.name}`);
        });
      }
      log('');
    });

    // Step 5: Check that blocks were not deleted
    log('Step 5: Verifying no blocks were deleted...', 'loading');
    const beforeCount = beforeData.blocks?.length || 0;
    const afterCount = afterData.blocks?.length || 0;

    if (afterCount >= beforeCount) {
      log(`✓ No blocks deleted (before: ${beforeCount}, after: ${afterCount})`, 'success');
    } else {
      log(`❌ WARNING: Blocks were deleted! (before: ${beforeCount}, after: ${afterCount})`, 'error');
    }
    log('');

    // Step 6: Compare with expected sizes
    log('Step 6: Comparing with expected sizes...', 'loading');
    const expected = {
      'employees.html': { html: 9551, css: 10931, js: 0 },
      'reviews.html': { html: 3780, css: 12062, js: 7071 },
      'portfolio.html': { html: 1939, css: 9292, js: 7151 },
      'tilda-table-block.html': { html: 1891, css: 15008, js: 10151 },
    };

    importResult.results?.forEach(result => {
      const exp = expected[result.sourceFile];
      if (exp && !result.error) {
        log(`\n${result.sourceFile}:`);
        const htmlDiff = Math.abs(result.htmlLength - exp.html);
        const cssDiff = Math.abs(result.cssLength - exp.css);
        const jsDiff = Math.abs(result.javascriptLength - exp.js);

        const htmlStatus = htmlDiff < 500 ? '✓' : `⚠ (diff: ${htmlDiff})`;
        const cssStatus = cssDiff < 500 ? '✓' : `⚠ (diff: ${cssDiff})`;
        const jsStatus = jsDiff < 500 ? '✓' : `⚠ (diff: ${jsDiff})`;

        log(`  HTML: ${result.htmlLength} vs expected ~${exp.html} ${htmlStatus}`, htmlDiff < 500 ? 'success' : 'warning');
        log(`  CSS: ${result.cssLength} vs expected ~${exp.css} ${cssStatus}`, cssDiff < 500 ? 'success' : 'warning');
        log(`  JS: ${result.javascriptLength} vs expected ~${exp.js} ${jsStatus}`, jsDiff < 500 ? 'success' : 'warning');
      }
    });
    log('');

    // Step 7: Check dependencies
    log('Step 7: Checking dependencies...', 'loading');
    afterData.blocks?.forEach(block => {
      const deps = block.dependencies || [];
      const hasSupabase = deps.some(d => d.name?.toLowerCase().includes('supabase'));
      const hasMontserrat = deps.some(d => d.name?.toLowerCase().includes('montserrat'));

      log(`${block.name}:`);
      log(`  ${hasSupabase ? '✓' : '❌'} Supabase SDK`, hasSupabase ? 'success' : 'error');
      log(`  ${hasMontserrat ? '✓' : '❌'} Montserrat Font`, hasMontserrat ? 'success' : 'error');
    });

    log('\n=== TEST COMPLETE ===', 'success');

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'error');
    console.error(error);
  } finally {
    button.disabled = false;
  }
}
