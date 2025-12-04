#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const publicDir = path.join(__dirname, 'public');

console.log('Running accessibility audit...\n');

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

// Check accessibility for a single file
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(content);
  const doc = dom.window.document;
  const relativePath = path.relative(publicDir, filePath);
  
  const fileIssues = [];
  const fileWarnings = [];
  
  // 1. Check for lang attribute on html element
  const html = doc.querySelector('html');
  if (!html || !html.getAttribute('lang')) {
    fileIssues.push({
      file: relativePath,
      rule: 'html-has-lang',
      message: 'HTML element must have a lang attribute',
      wcag: 'WCAG 3.1.1 (A)'
    });
  }
  checksPerformed++;
  
  // 2. Check for page title
  const title = doc.querySelector('title');
  if (!title || !title.textContent.trim()) {
    fileIssues.push({
      file: relativePath,
      rule: 'document-title',
      message: 'Document must have a non-empty title',
      wcag: 'WCAG 2.4.2 (A)'
    });
  }
  checksPerformed++;
  
  // 3. Check images for alt text
  const images = doc.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.hasAttribute('alt')) {
      fileIssues.push({
        file: relativePath,
        rule: 'image-alt',
        message: `Image ${index + 1} missing alt attribute`,
        wcag: 'WCAG 1.1.1 (A)',
        element: img.outerHTML.substring(0, 100)
      });
    }
    checksPerformed++;
  });
  
  // 4. Check links for accessible names
  const links = doc.querySelectorAll('a[href]');
  links.forEach((link, index) => {
    const text = link.textContent.trim();
    const ariaLabel = link.getAttribute('aria-label');
    const title = link.getAttribute('title');
    
    if (!text && !ariaLabel && !title) {
      fileIssues.push({
        file: relativePath,
        rule: 'link-name',
        message: `Link ${index + 1} has no accessible name`,
        wcag: 'WCAG 2.4.4 (A)',
        href: link.getAttribute('href')
      });
    }
    checksPerformed++;
  });
  
  // 5. Check buttons for accessible names
  const buttons = doc.querySelectorAll('button');
  buttons.forEach((button, index) => {
    const text = button.textContent.trim();
    const ariaLabel = button.getAttribute('aria-label');
    const title = button.getAttribute('title');
    
    if (!text && !ariaLabel && !title) {
      fileIssues.push({
        file: relativePath,
        rule: 'button-name',
        message: `Button ${index + 1} has no accessible name`,
        wcag: 'WCAG 4.1.2 (A)'
      });
    }
    checksPerformed++;
  });
  
  // 6. Check form inputs for labels
  const inputs = doc.querySelectorAll('input:not([type="hidden"]), textarea, select');
  inputs.forEach((input, index) => {
    const id = input.getAttribute('id');
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledby = input.getAttribute('aria-labelledby');
    const title = input.getAttribute('title');
    
    let hasLabel = false;
    if (id) {
      const label = doc.querySelector(`label[for="${id}"]`);
      if (label) hasLabel = true;
    }
    
    if (!hasLabel && !ariaLabel && !ariaLabelledby && !title) {
      fileWarnings.push({
        file: relativePath,
        rule: 'label',
        message: `Form input ${index + 1} may be missing a label`,
        wcag: 'WCAG 3.3.2 (A)'
      });
    }
    checksPerformed++;
  });
  
  // 7. Check heading hierarchy
  const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  if (headings.length > 0) {
    const levels = headings.map(h => parseInt(h.tagName.substring(1)));
    
    // Check for h1
    if (!levels.includes(1)) {
      fileWarnings.push({
        file: relativePath,
        rule: 'page-has-heading-one',
        message: 'Page should have an h1 heading',
        wcag: 'Best Practice'
      });
    }
    
    // Check for skipped levels
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i-1] > 1) {
        fileWarnings.push({
          file: relativePath,
          rule: 'heading-order',
          message: `Heading level skipped from h${levels[i-1]} to h${levels[i]}`,
          wcag: 'Best Practice'
        });
        break;
      }
    }
  }
  checksPerformed++;
  
  // 8. Check for viewport meta tag
  const viewport = doc.querySelector('meta[name="viewport"]');
  if (!viewport) {
    fileWarnings.push({
      file: relativePath,
      rule: 'meta-viewport',
      message: 'Page should have a viewport meta tag for responsive design',
      wcag: 'Best Practice'
    });
  }
  checksPerformed++;
  
  return { issues: fileIssues, warnings: fileWarnings };
}

// Main execution
console.log('Finding HTML files...');
const htmlFiles = findHtmlFiles(publicDir);
console.log(`Found ${htmlFiles.length} HTML files\n`);

console.log('Checking accessibility...\n');
htmlFiles.forEach(file => {
  const relativePath = path.relative(publicDir, file);
  process.stdout.write(`Checking: ${relativePath}\r`);
  
  const { issues: fileIssues, warnings: fileWarnings } = checkFile(file);
  issues.push(...fileIssues);
  warnings.push(...fileWarnings);
});

console.log('\n');
console.log('='.repeat(60));
console.log('Accessibility Audit Summary');
console.log('='.repeat(60));
console.log(`Files checked: ${htmlFiles.length}`);
console.log(`Checks performed: ${checksPerformed}`);
console.log(`Issues (WCAG violations): ${issues.length}`);
console.log(`Warnings (Best practices): ${warnings.length}`);

// Group issues by rule
const issuesByRule = {};
issues.forEach(issue => {
  if (!issuesByRule[issue.rule]) {
    issuesByRule[issue.rule] = {
      wcag: issue.wcag,
      count: 0,
      files: new Set()
    };
  }
  issuesByRule[issue.rule].count++;
  issuesByRule[issue.rule].files.add(issue.file);
});

if (Object.keys(issuesByRule).length > 0) {
  console.log('\n❌ Issues by rule:\n');
  Object.entries(issuesByRule).forEach(([rule, data]) => {
    console.log(`${rule} (${data.wcag})`);
    console.log(`  Occurrences: ${data.count}`);
    console.log(`  Files affected: ${data.files.size}`);
    console.log();
  });
  
  // Show first few issues
  console.log('First 10 issues:');
  issues.slice(0, 10).forEach((issue, i) => {
    console.log(`\n${i + 1}. ${issue.rule} in ${issue.file}`);
    console.log(`   ${issue.message}`);
    if (issue.element) console.log(`   Element: ${issue.element}`);
    if (issue.href) console.log(`   href: ${issue.href}`);
  });
}

// Group warnings by rule
const warningsByRule = {};
warnings.forEach(warning => {
  if (!warningsByRule[warning.rule]) {
    warningsByRule[warning.rule] = {
      count: 0,
      files: new Set()
    };
  }
  warningsByRule[warning.rule].count++;
  warningsByRule[warning.rule].files.add(warning.file);
});

if (Object.keys(warningsByRule).length > 0) {
  console.log('\n\n⚠️  Warnings by rule:\n');
  Object.entries(warningsByRule).forEach(([rule, data]) => {
    console.log(`${rule}`);
    console.log(`  Occurrences: ${data.count}`);
    console.log(`  Files affected: ${data.files.size}`);
    console.log();
  });
}

// Write report
const report = {
  timestamp: new Date().toISOString(),
  filesChecked: htmlFiles.length,
  checksPerformed,
  summary: {
    issues: issues.length,
    warnings: warnings.length
  },
  issuesByRule,
  warningsByRule,
  issues: issues.slice(0, 100),
  warnings: warnings.slice(0, 100)
};

fs.writeFileSync(
  path.join(__dirname, 'accessibility-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n\nDetailed report saved to: accessibility-report.json');

if (issues.length === 0) {
  console.log('\n✅ No WCAG violations found!');
  if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} best practice warning(s) - review recommended`);
  }
  process.exit(0);
} else {
  console.log(`\n❌ Found ${issues.length} WCAG violation(s)`);
  console.log('Please fix these issues for WCAG 2.1 AA compliance.');
  process.exit(1);
}
