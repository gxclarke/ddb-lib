#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Validating content completeness...\n');

const contentDir = path.join(__dirname, 'content');
const publicDir = path.join(__dirname, 'public');

let errors = [];
let warnings = [];
let passed = 0;

// Required pages based on requirements
const requiredPages = {
  'Overview': [
    'overview/_index.md',
    'overview/architecture.md',
    'overview/packages.md',
    'overview/comparison.md'
  ],
  'Getting Started': [
    'getting-started/_index.md',
    'getting-started/installation.md',
    'getting-started/standalone.md',
    'getting-started/amplify.md',
    'getting-started/first-app.md'
  ],
  'Guides': [
    'guides/_index.md',
    'guides/core-operations/_index.md',
    'guides/query-and-scan/_index.md',
    'guides/batch-operations/_index.md',
    'guides/transactions/_index.md',
    'guides/access-patterns/_index.md',
    'guides/monitoring/_index.md',
    'guides/multi-attribute-keys/_index.md'
  ],
  'Patterns': [
    'patterns/_index.md',
    'patterns/entity-keys.md',
    'patterns/composite-keys.md',
    'patterns/time-series.md',
    'patterns/hierarchical.md',
    'patterns/adjacency-list.md',
    'patterns/hot-partition-distribution.md',
    'patterns/sparse-indexes.md',
    'patterns/multi-attribute-keys.md'
  ],
  'Best Practices': [
    'best-practices/_index.md',
    'best-practices/query-vs-scan.md',
    'best-practices/projection-expressions.md',
    'best-practices/batch-operations.md',
    'best-practices/conditional-writes.md',
    'best-practices/capacity-planning.md',
    'best-practices/key-design.md'
  ],
  'Anti-Patterns': [
    'anti-patterns/_index.md',
    'anti-patterns/table-scans.md',
    'anti-patterns/hot-partitions.md',
    'anti-patterns/string-concatenation.md',
    'anti-patterns/read-before-write.md',
    'anti-patterns/missing-projections.md',
    'anti-patterns/inefficient-batching.md'
  ],
  'API Reference': [
    'api/_index.md',
    'api/core/_index.md',
    'api/stats/_index.md',
    'api/client/_index.md',
    'api/amplify/_index.md'
  ],
  'Examples': [
    'examples/_index.md',
    'examples/standalone/_index.md',
    'examples/amplify/_index.md'
  ],
  'Contributing': [
    'contributing/_index.md',
    'contributing/setup.md',
    'contributing/documentation.md'
  ]
};

// Check if required pages exist
console.log('Checking required pages...\n');
for (const [section, pages] of Object.entries(requiredPages)) {
  console.log(`${section}:`);
  for (const page of pages) {
    const filePath = path.join(contentDir, page);
    if (fs.existsSync(filePath)) {
      console.log(`  ✓ ${page}`);
      passed++;
    } else {
      console.log(`  ✗ ${page} - MISSING`);
      errors.push(`Missing required page: ${page}`);
    }
  }
  console.log();
}

// Check if pages have required front matter
console.log('\nChecking front matter...\n');
function checkFrontMatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  
  if (!frontMatterMatch) {
    return { hasTitle: false, hasDescription: false };
  }
  
  const frontMatter = frontMatterMatch[1];
  const hasTitle = /^title:/m.test(frontMatter);
  const hasDescription = /^description:/m.test(frontMatter);
  
  return { hasTitle, hasDescription };
}

let frontMatterIssues = 0;
for (const [section, pages] of Object.entries(requiredPages)) {
  for (const page of pages) {
    const filePath = path.join(contentDir, page);
    if (fs.existsSync(filePath)) {
      const { hasTitle, hasDescription } = checkFrontMatter(filePath);
      if (!hasTitle) {
        warnings.push(`${page} missing title in front matter`);
        frontMatterIssues++;
      }
      if (!hasDescription) {
        warnings.push(`${page} missing description in front matter`);
        frontMatterIssues++;
      }
    }
  }
}

if (frontMatterIssues === 0) {
  console.log('✓ All pages have required front matter (title and description)');
} else {
  console.log(`⚠ ${frontMatterIssues} front matter issue(s) found`);
}

// Check if images exist
console.log('\n\nChecking images...\n');
const staticDir = path.join(__dirname, 'static');
const imagePatterns = [
  'static/images/architecture/',
  'static/images/patterns/',
  'static/images/workflows/',
  'static/images/comparisons/'
];

let imageCount = 0;
for (const pattern of imagePatterns) {
  const dir = path.join(__dirname, pattern);
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    const images = files.filter(f => /\.(png|jpg|jpeg|svg|gif)$/i.test(f));
    imageCount += images.length;
    console.log(`  ${pattern}: ${images.length} image(s)`);
  } else {
    console.log(`  ${pattern}: directory not found`);
  }
}
console.log(`\nTotal images: ${imageCount}`);

// Check if site builds
console.log('\n\nChecking build output...\n');
if (fs.existsSync(publicDir)) {
  const htmlFiles = [];
  function findHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        findHtmlFiles(filePath);
      } else if (file.endsWith('.html')) {
        htmlFiles.push(filePath);
      }
    }
  }
  findHtmlFiles(publicDir);
  console.log(`✓ Site built successfully with ${htmlFiles.length} HTML pages`);
} else {
  errors.push('Build output directory (public/) not found');
  console.log('✗ Build output directory not found');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('Content Validation Summary');
console.log('='.repeat(60));
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Errors: ${errors.length}`);
console.log(`⚠ Warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
}

if (warnings.length > 0) {
  console.log('\nWarnings:');
  warnings.slice(0, 10).forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
  if (warnings.length > 10) {
    console.log(`  ... and ${warnings.length - 10} more`);
  }
}

if (errors.length === 0) {
  console.log('\n✅ Content validation passed!');
  process.exit(0);
} else {
  console.log('\n❌ Content validation failed!');
  process.exit(1);
}
