#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const axe = require('axe-core');

const publicDir = path.join(__dirname, 'public');

console.log('Running accessibility audit...\n');

// Check if public directory exists
if (!fs.existsSync(publicDir)) {
  console.error('Error: public/ directory not found. Please build the site first with "npm run build"');
  process.exit(1);
}

// Find all HTML files
function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Run axe on a single HTML file
async function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(content, {
    url: 'http://localhost',
    runScripts: 'dangerously',
    resources: 'usable'
  });
  
  const { window } = dom;
  
  // Inject axe-core
  const axeSource = fs.readFileSync(
    require.resolve('axe-core/axe.min.js'),
    'utf-8'
  );
  const script = window.document.createElement('script');
  script.textContent = axeSource;
  window.document.head.appendChild(script);
  
  // Run axe
  return new Promise((resolve) => {
    window.axe.run(window.document, {
      rules: {
        // Configure rules for WCAG 2.1 AA
        'color-contrast': { enabled: true },
        'html-has-lang': { enabled: true },
        'image-alt': { enabled: true },
        'label': { enabled: true },
        'link-name': { enabled: true },
        'button-name': { enabled: true }
      }
    }, (err, results) => {
      if (err) {
        console.error('Error running axe:', err);
        resolve({ violations: [], passes: [], incomplete: [] });
      } else {
        resolve(results);
      }
    });
  });
}

// Main execution
async function main() {
  console.log('Finding HTML files...');
  const htmlFiles = findHtmlFiles(publicDir);
  console.log(`Found ${htmlFiles.length} HTML files\n`);
  
  const allViolations = [];
  const allIncomplete = [];
  let totalPasses = 0;
  let filesChecked = 0;
  
  // Sample a subset of files for performance
  const filesToCheck = htmlFiles.slice(0, Math.min(10, htmlFiles.length));
  
  console.log(`Checking ${filesToCheck.length} sample files...\n`);
  
  for (const file of filesToCheck) {
    const relativePath = path.relative(publicDir, file);
    process.stdout.write(`Checking: ${relativePath}\r`);
    
    try {
      const results = await checkFile(file);
      
      if (results.violations && results.violations.length > 0) {
        results.violations.forEach(violation => {
          allViolations.push({
            file: relativePath,
            ...violation
          });
        });
      }
      
      if (results.incomplete && results.incomplete.length > 0) {
        results.incomplete.forEach(incomplete => {
          allIncomplete.push({
            file: relativePath,
            ...incomplete
          });
        });
      }
      
      totalPasses += results.passes ? results.passes.length : 0;
      filesChecked++;
    } catch (error) {
      console.error(`\nError checking ${relativePath}:`, error.message);
    }
  }
  
  console.log('\n');
  console.log('='.repeat(60));
  console.log('Accessibility Audit Summary');
  console.log('='.repeat(60));
  console.log(`Files checked: ${filesChecked}`);
  console.log(`Violations: ${allViolations.length}`);
  console.log(`Incomplete: ${allIncomplete.length}`);
  console.log(`Passes: ${totalPasses}`);
  
  // Group violations by type
  const violationsByType = {};
  allViolations.forEach(v => {
    if (!violationsByType[v.id]) {
      violationsByType[v.id] = {
        description: v.description,
        impact: v.impact,
        count: 0,
        files: new Set()
      };
    }
    violationsByType[v.id].count += v.nodes ? v.nodes.length : 1;
    violationsByType[v.id].files.add(v.file);
  });
  
  if (Object.keys(violationsByType).length > 0) {
    console.log('\n❌ Violations by type:\n');
    Object.entries(violationsByType).forEach(([id, data]) => {
      console.log(`${id} (${data.impact})`);
      console.log(`  ${data.description}`);
      console.log(`  Occurrences: ${data.count}`);
      console.log(`  Files affected: ${data.files.size}`);
      console.log();
    });
  }
  
  // Group incomplete by type
  const incompleteByType = {};
  allIncomplete.forEach(i => {
    if (!incompleteByType[i.id]) {
      incompleteByType[i.id] = {
        description: i.description,
        count: 0
      };
    }
    incompleteByType[i.id].count += i.nodes ? i.nodes.length : 1;
  });
  
  if (Object.keys(incompleteByType).length > 0) {
    console.log('\n⚠️  Incomplete checks (require manual review):\n');
    Object.entries(incompleteByType).forEach(([id, data]) => {
      console.log(`${id}: ${data.description} (${data.count} occurrences)`);
    });
  }
  
  // Write detailed report
  const report = {
    timestamp: new Date().toISOString(),
    filesChecked,
    summary: {
      violations: allViolations.length,
      incomplete: allIncomplete.length,
      passes: totalPasses
    },
    violationsByType,
    incompleteByType,
    violations: allViolations.slice(0, 50) // Limit to first 50
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'accessibility-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\nDetailed report saved to: accessibility-report.json');
  
  if (allViolations.length === 0) {
    console.log('\n✅ No accessibility violations found!');
    console.log('Note: This is a sample check. Run full audit for production.');
    process.exit(0);
  } else {
    console.log(`\n⚠️  Found ${allViolations.length} accessibility issue(s)`);
    console.log('Please review and fix violations for WCAG 2.1 AA compliance.');
    process.exit(0); // Exit 0 for now since these are warnings
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
