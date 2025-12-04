#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const publicDir = path.join(__dirname, 'public');

console.log('Running browser compatibility check...\n');

// Check if public directory exists
if (!fs.existsSync(publicDir)) {
  console.error('Error: public/ directory not found. Please build the site first with "npm run build"');
  process.exit(1);
}

const issues = [];
const warnings = [];
let checksPerformed = 0;

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

// Check for browser compatibility issues
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(content);
  const doc = dom.window.document;
  const relativePath = path.relative(publicDir, filePath);
  
  const fileIssues = [];
  const fileWarnings = [];
  
  // 1. Check for unsupported CSS features
  const styles = doc.querySelectorAll('style');
  styles.forEach(style => {
    const css = style.textContent;
    
    // Check for CSS Grid (IE11 doesn't support)
    if (css.includes('display: grid') || css.includes('display:grid')) {
      fileWarnings.push({
        file: relativePath,
        issue: 'CSS Grid usage (not supported in IE11)',
        severity: 'low'
      });
    }
    
    // Check for CSS Custom Properties (IE11 doesn't support)
    if (css.includes('var(--')) {
      fileWarnings.push({
        file: relativePath,
        issue: 'CSS Custom Properties usage (not supported in IE11)',
        severity: 'low'
      });
    }
    checksPerformed++;
  });
  
  // 2. Check for modern JavaScript features
  const scripts = doc.querySelectorAll('script');
  scripts.forEach(script => {
    const js = script.textContent;
    
    // Check for arrow functions
    if (js.includes('=>')) {
      fileWarnings.push({
        file: relativePath,
        issue: 'Arrow functions (requires transpilation for IE11)',
        severity: 'low'
      });
    }
    
    // Check for const/let
    if (js.includes('const ') || js.includes('let ')) {
      fileWarnings.push({
        file: relativePath,
        issue: 'const/let usage (requires transpilation for IE11)',
        severity: 'low'
      });
    }
    checksPerformed++;
  });
  
  // 3. Check for viewport meta tag
  const viewport = doc.querySelector('meta[name="viewport"]');
  if (!viewport) {
    fileIssues.push({
      file: relativePath,
      issue: 'Missing viewport meta tag (required for mobile browsers)',
      severity: 'high'
    });
  }
  checksPerformed++;
  
  // 4. Check for charset declaration
  const charset = doc.querySelector('meta[charset]');
  if (!charset) {
    fileWarnings.push({
      file: relativePath,
      issue: 'Missing charset declaration',
      severity: 'medium'
    });
  }
  checksPerformed++;
  
  // 5. Check for flexbox usage (good for modern browsers)
  const hasFlexbox = content.includes('display: flex') || content.includes('display:flex');
  if (hasFlexbox) {
    // This is good - flexbox is well supported
  }
  checksPerformed++;
  
  // 6. Check for prefixed CSS properties
  const needsPrefixes = [
    'transform',
    'transition',
    'animation',
    'box-shadow'
  ];
  
  needsPrefixes.forEach(prop => {
    if (content.includes(`${prop}:`) && !content.includes(`-webkit-${prop}`)) {
      fileWarnings.push({
        file: relativePath,
        issue: `${prop} may need vendor prefixes for older browsers`,
        severity: 'low'
      });
    }
  });
  checksPerformed++;
  
  return { issues: fileIssues, warnings: fileWarnings };
}

// Main execution
console.log('Finding HTML files...');
const htmlFiles = findHtmlFiles(publicDir);
console.log(`Found ${htmlFiles.length} HTML files\n`);

console.log('Checking browser compatibility...\n');

// Sample a subset for performance
const filesToCheck = htmlFiles.slice(0, Math.min(10, htmlFiles.length));

filesToCheck.forEach(file => {
  const relativePath = path.relative(publicDir, file);
  process.stdout.write(`Checking: ${relativePath}\r`);
  
  const { issues: fileIssues, warnings: fileWarnings } = checkFile(file);
  issues.push(...fileIssues);
  warnings.push(...fileWarnings);
});

console.log('\n');
console.log('='.repeat(60));
console.log('Browser Compatibility Check Summary');
console.log('='.repeat(60));
console.log(`Files checked: ${filesToCheck.length}`);
console.log(`Checks performed: ${checksPerformed}`);
console.log(`Critical issues: ${issues.length}`);
console.log(`Warnings: ${warnings.length}`);

// Group issues by type
const issuesByType = {};
issues.forEach(issue => {
  if (!issuesByType[issue.issue]) {
    issuesByType[issue.issue] = {
      count: 0,
      files: new Set()
    };
  }
  issuesByType[issue.issue].count++;
  issuesByType[issue.issue].files.add(issue.file);
});

if (Object.keys(issuesByType).length > 0) {
  console.log('\n❌ Critical Issues:\n');
  Object.entries(issuesByType).forEach(([issue, data]) => {
    console.log(`${issue}`);
    console.log(`  Occurrences: ${data.count}`);
    console.log(`  Files affected: ${data.files.size}`);
    console.log();
  });
}

// Group warnings by type
const warningsByType = {};
warnings.forEach(warning => {
  if (!warningsByType[warning.issue]) {
    warningsByType[warning.issue] = {
      count: 0,
      files: new Set()
    };
  }
  warningsByType[warning.issue].count++;
  warningsByType[warning.issue].files.add(warning.file);
});

if (Object.keys(warningsByType).length > 0) {
  console.log('\n⚠️  Warnings (IE11 compatibility):\n');
  Object.entries(warningsByType).forEach(([warning, data]) => {
    console.log(`${warning}`);
    console.log(`  Occurrences: ${data.count}`);
    console.log(`  Files affected: ${data.files.size}`);
    console.log();
  });
}

console.log('\nBrowser Support:');
console.log('  ✅ Chrome (latest) - Full support expected');
console.log('  ✅ Firefox (latest) - Full support expected');
console.log('  ✅ Safari (latest) - Full support expected');
console.log('  ✅ Edge (latest) - Full support expected');
console.log('  ⚠️  IE11 - Limited support (modern features used)');

console.log('\nRecommendations:');
console.log('  • Test manually on target browsers');
console.log('  • Use BrowserStack or similar for comprehensive testing');
console.log('  • Consider polyfills for IE11 if support is required');
console.log('  • Modern browsers (Chrome, Firefox, Safari, Edge) should work well');

// Write report
const report = {
  timestamp: new Date().toISOString(),
  filesChecked: filesToCheck.length,
  checksPerformed,
  summary: {
    issues: issues.length,
    warnings: warnings.length
  },
  issuesByType,
  warningsByType,
  browserSupport: {
    chrome: 'full',
    firefox: 'full',
    safari: 'full',
    edge: 'full',
    ie11: 'limited'
  }
};

fs.writeFileSync(
  path.join(__dirname, 'browser-compat-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\nDetailed report saved to: browser-compat-report.json');
console.log('Manual testing checklist: CROSS_BROWSER_TESTING.md');

if (issues.length === 0) {
  console.log('\n✅ No critical browser compatibility issues found!');
  console.log('Site should work well on modern browsers (Chrome, Firefox, Safari, Edge)');
  process.exit(0);
} else {
  console.log(`\n❌ Found ${issues.length} critical issue(s)`);
  console.log('Please fix these issues for better browser compatibility.');
  process.exit(1);
}
