#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const publicDir = path.join(__dirname, 'public');
const brokenLinks = [];
const allFiles = new Set();
const allAnchors = new Map(); // Map of file -> Set of anchor IDs

// Read Hugo config to get baseURL
let baseURLPath = '';
try {
  const configContent = fs.readFileSync(path.join(__dirname, 'hugo.toml'), 'utf-8');
  const baseURLMatch = configContent.match(/baseURL\s*=\s*"([^"]+)"/);
  if (baseURLMatch) {
    const baseURL = new URL(baseURLMatch[1]);
    baseURLPath = baseURL.pathname;
    console.log(`Detected baseURL path: ${baseURLPath}\n`);
  }
} catch (e) {
  console.log('Could not read baseURL from hugo.toml, assuming root path\n');
}

console.log('Starting link check...\n');

// Check if public directory exists
if (!fs.existsSync(publicDir)) {
  console.error('Error: public/ directory not found. Please build the site first with "npm run build"');
  process.exit(1);
}

// Recursively find all HTML files
function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      const relativePath = path.relative(publicDir, filePath);
      fileList.push(relativePath);
      allFiles.add('/' + relativePath.replace(/\\/g, '/'));
      
      // Also add without index.html
      if (file === 'index.html') {
        const dirPath = '/' + path.dirname(relativePath).replace(/\\/g, '/');
        allFiles.add(dirPath === '/.' ? '/' : dirPath + '/');
      }
    }
  });
  
  return fileList;
}

// Extract all anchor IDs from an HTML file
function extractAnchors(htmlPath) {
  const content = fs.readFileSync(path.join(publicDir, htmlPath), 'utf-8');
  const dom = new JSDOM(content);
  const anchors = new Set();
  
  // Find all elements with id attribute
  const elementsWithId = dom.window.document.querySelectorAll('[id]');
  elementsWithId.forEach(el => {
    anchors.add(el.id);
  });
  
  return anchors;
}

// Check links in an HTML file
function checkLinks(htmlPath) {
  const fullPath = path.join(publicDir, htmlPath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const dom = new JSDOM(content);
  const links = dom.window.document.querySelectorAll('a[href]');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    
    // Skip external links, mailto, tel, javascript, and empty hrefs
    if (!href || 
        href.startsWith('http://') || 
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        href.startsWith('#')) {
      return;
    }
    
    // Parse the link
    let targetPath = href;
    let anchor = '';
    
    if (href.includes('#')) {
      [targetPath, anchor] = href.split('#');
    }
    
    // Remove baseURL prefix if present
    if (baseURLPath && targetPath.startsWith(baseURLPath)) {
      targetPath = targetPath.substring(baseURLPath.length - 1); // Keep leading slash
    }
    
    // Resolve relative paths
    if (!targetPath.startsWith('/')) {
      const currentDir = '/' + path.dirname(htmlPath).replace(/\\/g, '/');
      targetPath = path.join(currentDir, targetPath).replace(/\\/g, '/');
    }
    
    // Normalize path
    if (!targetPath.endsWith('/') && !targetPath.endsWith('.html')) {
      targetPath += '/';
    }
    
    // Check if target exists
    let exists = allFiles.has(targetPath);
    
    // Try alternative paths
    if (!exists && targetPath.endsWith('/')) {
      exists = allFiles.has(targetPath + 'index.html');
    }
    if (!exists && !targetPath.endsWith('.html')) {
      exists = allFiles.has(targetPath + '.html');
    }
    
    if (!exists) {
      brokenLinks.push({
        file: htmlPath,
        link: href,
        target: targetPath,
        text: link.textContent.trim().substring(0, 50)
      });
    } else if (anchor) {
      // Check if anchor exists in target file
      const targetFile = targetPath.endsWith('/') ? targetPath + 'index.html' : targetPath;
      const targetFileNormalized = targetFile.startsWith('/') ? targetFile.substring(1) : targetFile;
      
      if (!allAnchors.has(targetFileNormalized)) {
        allAnchors.set(targetFileNormalized, extractAnchors(targetFileNormalized));
      }
      
      const anchors = allAnchors.get(targetFileNormalized);
      if (!anchors.has(anchor)) {
        brokenLinks.push({
          file: htmlPath,
          link: href,
          target: targetPath + '#' + anchor,
          text: link.textContent.trim().substring(0, 50),
          reason: 'Anchor not found'
        });
      }
    }
  });
}

// Main execution
console.log('Finding HTML files...');
const htmlFiles = findHtmlFiles(publicDir);
console.log(`Found ${htmlFiles.length} HTML files\n`);

console.log('Extracting anchors...');
htmlFiles.forEach(file => {
  allAnchors.set(file, extractAnchors(file));
});

console.log('Checking links...\n');
htmlFiles.forEach(file => {
  process.stdout.write(`Checking: ${file}\r`);
  checkLinks(file);
});

console.log('\n\n' + '='.repeat(60));
console.log('Link Check Complete');
console.log('='.repeat(60));

if (brokenLinks.length === 0) {
  console.log('\n✅ No broken internal links found!');
  process.exit(0);
} else {
  console.log(`\n❌ Found ${brokenLinks.length} broken link(s):\n`);
  
  brokenLinks.forEach((link, index) => {
    console.log(`${index + 1}. ${link.link}`);
    console.log(`   In file: ${link.file}`);
    console.log(`   Target: ${link.target}`);
    if (link.reason) console.log(`   Reason: ${link.reason}`);
    if (link.text) console.log(`   Link text: "${link.text}"`);
    console.log();
  });
  
  // Write report to file
  const report = {
    timestamp: new Date().toISOString(),
    totalBroken: brokenLinks.length,
    links: brokenLinks
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'link-check-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('Report saved to: link-check-report.json');
  process.exit(1);
}
