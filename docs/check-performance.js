#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const publicDir = path.join(__dirname, 'public');

console.log('Running performance audit...\n');

// Check if public directory exists
if (!fs.existsSync(publicDir)) {
  console.error('Error: public/ directory not found. Please build the site first with "npm run build"');
  process.exit(1);
}

const metrics = {
  totalFiles: 0,
  totalSize: 0,
  htmlFiles: 0,
  htmlSize: 0,
  cssFiles: 0,
  cssSize: 0,
  jsFiles: 0,
  jsSize: 0,
  imageFiles: 0,
  imageSize: 0,
  largeFiles: [],
  unminifiedFiles: [],
  missingCompression: []
};

// Get file size in KB
function getFileSizeKB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024).toFixed(2);
}

// Check if file is minified
function isMinified(content, ext) {
  if (ext === '.html') {
    // HTML is minified if it has very few newlines relative to content
    const lines = content.split('\n').length;
    const chars = content.length;
    // If average line length > 500 chars, it's likely minified
    return (chars / lines) > 500;
  } else if (ext === '.css' || ext === '.js') {
    // CSS/JS is minified if it has no newlines or very few
    const lines = content.split('\n').length;
    const chars = content.length;
    return lines < 10 || (chars / lines) > 100;
  }
  return true;
}

// Recursively analyze files
function analyzeFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      analyzeFiles(filePath);
    } else {
      const ext = path.extname(file).toLowerCase();
      const sizeKB = parseFloat(getFileSizeKB(filePath));
      const relativePath = path.relative(publicDir, filePath);
      
      metrics.totalFiles++;
      metrics.totalSize += sizeKB;
      
      // Categorize by type
      if (ext === '.html') {
        metrics.htmlFiles++;
        metrics.htmlSize += sizeKB;
        
        // Check if minified
        const content = fs.readFileSync(filePath, 'utf-8');
        if (!isMinified(content, ext)) {
          metrics.unminifiedFiles.push({
            file: relativePath,
            size: sizeKB,
            type: 'HTML'
          });
        }
      } else if (ext === '.css') {
        metrics.cssFiles++;
        metrics.cssSize += sizeKB;
        
        const content = fs.readFileSync(filePath, 'utf-8');
        if (!isMinified(content, ext)) {
          metrics.unminifiedFiles.push({
            file: relativePath,
            size: sizeKB,
            type: 'CSS'
          });
        }
      } else if (ext === '.js') {
        metrics.jsFiles++;
        metrics.jsSize += sizeKB;
        
        const content = fs.readFileSync(filePath, 'utf-8');
        if (!isMinified(content, ext)) {
          metrics.unminifiedFiles.push({
            file: relativePath,
            size: sizeKB,
            type: 'JavaScript'
          });
        }
      } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
        metrics.imageFiles++;
        metrics.imageSize += sizeKB;
      }
      
      // Flag large files (>500KB)
      if (sizeKB > 500) {
        metrics.largeFiles.push({
          file: relativePath,
          size: sizeKB,
          type: ext
        });
      }
    }
  });
}

// Analyze HTML pages for performance issues
function analyzeHtmlPerformance(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(content);
  const doc = dom.window.document;
  
  const issues = [];
  
  // Check for render-blocking resources
  const stylesheets = doc.querySelectorAll('link[rel="stylesheet"]');
  const blockingStyles = Array.from(stylesheets).filter(link => {
    return !link.hasAttribute('media') || link.getAttribute('media') === 'all';
  });
  
  if (blockingStyles.length > 3) {
    issues.push({
      type: 'render-blocking-css',
      message: `${blockingStyles.length} render-blocking stylesheets`,
      impact: 'medium'
    });
  }
  
  // Check for synchronous scripts
  const scripts = doc.querySelectorAll('script[src]');
  const blockingScripts = Array.from(scripts).filter(script => {
    return !script.hasAttribute('async') && !script.hasAttribute('defer');
  });
  
  if (blockingScripts.length > 0) {
    issues.push({
      type: 'render-blocking-js',
      message: `${blockingScripts.length} render-blocking scripts`,
      impact: 'high'
    });
  }
  
  // Check for large images without lazy loading
  const images = doc.querySelectorAll('img');
  const nonLazyImages = Array.from(images).filter(img => {
    return !img.hasAttribute('loading') || img.getAttribute('loading') !== 'lazy';
  });
  
  if (nonLazyImages.length > 10) {
    issues.push({
      type: 'missing-lazy-loading',
      message: `${nonLazyImages.length} images without lazy loading`,
      impact: 'medium'
    });
  }
  
  // Check for missing preconnect/dns-prefetch
  const preconnects = doc.querySelectorAll('link[rel="preconnect"], link[rel="dns-prefetch"]');
  const externalLinks = Array.from(doc.querySelectorAll('link[href^="http"], script[src^="http"]'));
  
  if (externalLinks.length > 0 && preconnects.length === 0) {
    issues.push({
      type: 'missing-preconnect',
      message: 'No preconnect hints for external resources',
      impact: 'low'
    });
  }
  
  return issues;
}

// Main execution
console.log('Analyzing files...\n');
analyzeFiles(publicDir);

console.log('Analyzing HTML performance...\n');
const htmlFiles = [];
function findHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findHtmlFiles(filePath);
    } else if (file.endsWith('.html')) {
      htmlFiles.push(filePath);
    }
  });
}
findHtmlFiles(publicDir);

const performanceIssues = [];
// Sample a few HTML files
const samplesToCheck = htmlFiles.slice(0, Math.min(5, htmlFiles.length));
samplesToCheck.forEach(file => {
  const issues = analyzeHtmlPerformance(file);
  if (issues.length > 0) {
    performanceIssues.push({
      file: path.relative(publicDir, file),
      issues
    });
  }
});

console.log('='.repeat(60));
console.log('Performance Audit Summary');
console.log('='.repeat(60));
console.log('\nFile Statistics:');
console.log(`  Total files: ${metrics.totalFiles}`);
console.log(`  Total size: ${metrics.totalSize.toFixed(2)} KB (${(metrics.totalSize / 1024).toFixed(2)} MB)`);
console.log();
console.log(`  HTML: ${metrics.htmlFiles} files, ${metrics.htmlSize.toFixed(2)} KB`);
console.log(`  CSS: ${metrics.cssFiles} files, ${metrics.cssSize.toFixed(2)} KB`);
console.log(`  JavaScript: ${metrics.jsFiles} files, ${metrics.jsSize.toFixed(2)} KB`);
console.log(`  Images: ${metrics.imageFiles} files, ${metrics.imageSize.toFixed(2)} KB`);

// Calculate average page size
const avgPageSize = metrics.htmlSize / metrics.htmlFiles;
console.log(`\nAverage HTML page size: ${avgPageSize.toFixed(2)} KB`);

// Performance score estimation
let score = 100;
let issues = [];

// Deduct points for large files (but exclude expected large files)
const problematicLargeFiles = metrics.largeFiles.filter(f => 
  !f.file.includes('.xml') && !f.file.includes('.map')
);
if (problematicLargeFiles.length > 0) {
  score -= problematicLargeFiles.length * 10;
  issues.push(`${problematicLargeFiles.length} unexpectedly large file(s)`);
}

// Deduct points for unminified files (but be lenient for HTML and static assets)
const unminifiedNonHtml = metrics.unminifiedFiles.filter(f => 
  f.type !== 'HTML' && !f.file.startsWith('static/')
);
if (unminifiedNonHtml.length > 0) {
  score -= unminifiedNonHtml.length * 3;
  issues.push(`${unminifiedNonHtml.length} unminified CSS/JS file(s)`);
}

// Deduct points for large average page size
if (avgPageSize > 150) {
  score -= 10;
  issues.push('Average page size over 150KB');
} else if (avgPageSize > 100) {
  score -= 5;
  issues.push('Average page size over 100KB (acceptable for docs)');
}

// Deduct points for critical performance issues only
if (performanceIssues.length > 0) {
  const criticalIssues = performanceIssues.reduce((sum, p) => 
    sum + p.issues.filter(i => i.impact === 'high').length, 0
  );
  if (criticalIssues > 0) {
    score -= criticalIssues * 3;
    issues.push(`${criticalIssues} critical performance issue(s)`);
  }
}

score = Math.max(0, Math.min(100, score));

console.log('\n' + '='.repeat(60));
console.log(`Estimated Performance Score: ${score}/100`);
console.log('='.repeat(60));

if (score >= 90) {
  console.log('✅ Excellent performance!');
} else if (score >= 75) {
  console.log('✓ Good performance');
} else if (score >= 50) {
  console.log('⚠️  Fair performance - optimization recommended');
} else {
  console.log('❌ Poor performance - optimization needed');
}

if (issues.length > 0) {
  console.log('\nIssues found:');
  issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
}

// Show large files
if (metrics.largeFiles.length > 0) {
  console.log('\n\nLarge files (>500KB):');
  metrics.largeFiles.forEach(file => {
    console.log(`  ${file.file}: ${file.size} KB`);
  });
}

// Show unminified files
if (metrics.unminifiedFiles.length > 0) {
  console.log('\n\nUnminified files:');
  metrics.unminifiedFiles.slice(0, 10).forEach(file => {
    console.log(`  ${file.file} (${file.type}): ${file.size} KB`);
  });
  if (metrics.unminifiedFiles.length > 10) {
    console.log(`  ... and ${metrics.unminifiedFiles.length - 10} more`);
  }
}

// Show HTML performance issues
if (performanceIssues.length > 0) {
  console.log('\n\nHTML Performance Issues:');
  performanceIssues.forEach(p => {
    console.log(`\n  ${p.file}:`);
    p.issues.forEach(issue => {
      console.log(`    - [${issue.impact}] ${issue.message}`);
    });
  });
}

// Recommendations
console.log('\n\nRecommendations:');
if (avgPageSize > 100) {
  console.log('  • Consider reducing HTML page size (target: <100KB)');
}
if (metrics.unminifiedFiles.length > 0) {
  console.log('  • Minify all CSS, JS, and HTML files');
}
if (metrics.largeFiles.length > 0) {
  console.log('  • Optimize or split large files');
}
if (metrics.imageSize / metrics.totalSize > 0.5) {
  console.log('  • Optimize images (use WebP, compress, resize)');
}
console.log('  • Enable gzip/brotli compression on server');
console.log('  • Use CDN for static assets');
console.log('  • Implement HTTP/2 or HTTP/3');

// Write report
const report = {
  timestamp: new Date().toISOString(),
  score,
  metrics,
  issues,
  performanceIssues,
  largeFiles: metrics.largeFiles,
  unminifiedFiles: metrics.unminifiedFiles
};

fs.writeFileSync(
  path.join(__dirname, 'performance-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n\nDetailed report saved to: performance-report.json');

if (score >= 90) {
  console.log('\n✅ Performance audit passed!');
  process.exit(0);
} else {
  console.log(`\n⚠️  Performance score: ${score}/100`);
  console.log('Consider optimizations to reach 90+');
  process.exit(0); // Exit 0 for now since this is informational
}
