#!/usr/bin/env node

const { SiteChecker } = require('broken-link-checker');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const brokenLinks = [];
const checkedUrls = new Set();

console.log('Starting link check...\n');

// Check if public directory exists
if (!fs.existsSync(publicDir)) {
  console.error('Error: public/ directory not found. Please build the site first with "npm run build"');
  process.exit(1);
}

const options = {
  excludeExternalLinks: false,
  excludeInternalLinks: false,
  filterLevel: 3,
  honorRobotExclusions: false,
  maxSocketsPerHost: 10,
  rateLimit: 100
};

const siteChecker = new SiteChecker(options, {
  link: (result) => {
    if (result.broken) {
      const linkInfo = {
        url: result.url.resolved,
        base: result.base.resolved,
        status: result.brokenReason || result.http?.statusCode || 'Unknown',
        text: result.html?.text || ''
      };
      
      if (!checkedUrls.has(result.url.resolved)) {
        brokenLinks.push(linkInfo);
        checkedUrls.add(result.url.resolved);
        console.log(`❌ Broken: ${linkInfo.url}`);
        console.log(`   Found in: ${linkInfo.base}`);
        console.log(`   Status: ${linkInfo.status}\n`);
      }
    }
  },
  page: (error, pageUrl) => {
    if (error) {
      console.error(`Error checking page ${pageUrl}:`, error.message);
    } else {
      console.log(`✓ Checked: ${pageUrl}`);
    }
  },
  site: (error, siteUrl) => {
    if (error) {
      console.error('Site check error:', error.message);
    }
  },
  end: () => {
    console.log('\n' + '='.repeat(60));
    console.log('Link Check Complete');
    console.log('='.repeat(60));
    
    if (brokenLinks.length === 0) {
      console.log('\n✅ No broken links found!');
      process.exit(0);
    } else {
      console.log(`\n❌ Found ${brokenLinks.length} broken link(s):\n`);
      
      brokenLinks.forEach((link, index) => {
        console.log(`${index + 1}. ${link.url}`);
        console.log(`   Found in: ${link.base}`);
        console.log(`   Status: ${link.status}\n`);
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
  }
});

// Start checking from the index.html file
const indexPath = `file://${path.join(publicDir, 'index.html')}`;
console.log(`Starting from: ${indexPath}\n`);
siteChecker.enqueue(indexPath);
