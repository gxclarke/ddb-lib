# Design Document

## Overview

This design implements a comprehensive documentation website for the ddb-lib monorepo using Hugo static site generator and GitHub Pages. The site will feature a modern, responsive design with rich visual content including diagrams, code examples, and interactive elements. The documentation will be organized into clear sections covering everything from getting started to advanced patterns and API reference.

The architecture follows Hugo's content organization model with a focus on maintainability, performance, and user experience. We'll use a documentation-focused theme (likely Docsy or similar) and extend it with custom shortcodes for specialized content like pattern diagrams, comparison tables, and code examples.

## Architecture

### Site Structure

```
docs/
├── config.toml                 # Hugo configuration
├── content/                    # All documentation content
│   ├── _index.md              # Homepage
│   ├── overview/              # Library overview
│   │   ├── _index.md
│   │   ├── architecture.md
│   │   ├── packages.md
│   │   └── comparison.md
│   ├── getting-started/       # Getting started guides
│   │   ├── _index.md
│   │   ├── installation.md
│   │   ├── standalone.md
│   │   ├── amplify.md
│   │   └── first-app.md
│   ├── guides/                # Usage guides
│   │   ├── _index.md
│   │   ├── core-operations/
│   │   ├── batch-operations/
│   │   ├── transactions/
│   │   ├── access-patterns/
│   │   ├── monitoring/
│   │   └── multi-attribute-keys/
│   ├── patterns/              # DynamoDB patterns
│   │   ├── _index.md
│   │   ├── entity-keys.md
│   │   ├── composite-keys.md
│   │   ├── time-series.md
│   │   ├── hierarchical.md
│   │   ├── adjacency-list.md
│   │   ├── hot-partition-distribution.md
│   │   ├── sparse-indexes.md
│   │   └── multi-attribute-keys.md
│   ├── best-practices/        # Best practices
│   │   ├── _index.md
│   │   ├── query-vs-scan.md
│   │   ├── projection-expressions.md
│   │   ├── batch-operations.md
│   │   ├── conditional-writes.md
│   │   ├── capacity-planning.md
│   │   └── key-design.md
│   ├── anti-patterns/         # Anti-patterns
│   │   ├── _index.md
│   │   ├── table-scans.md
│   │   ├── hot-partitions.md
│   │   ├── string-concatenation.md
│   │   ├── read-before-write.md
│   │   ├── missing-projections.md
│   │   └── inefficient-batching.md
│   ├── api/                   # API reference
│   │   ├── _index.md
│   │   ├── core/
│   │   ├── stats/
│   │   ├── client/
│   │   └── amplify/
│   ├── examples/              # Code examples
│   │   ├── _index.md
│   │   ├── standalone/
│   │   └── amplify/
│   └── contributing/          # Contributing guide
│       ├── _index.md
│       ├── setup.md
│       ├── documentation.md
│       └── guidelines.md
├── static/                    # Static assets
│   ├── images/
│   │   ├── architecture/
│   │   ├── patterns/
│   │   ├── diagrams/
│   │   └── screenshots/
│   ├── css/
│   └── js/
├── layouts/                   # Custom layouts
│   ├── shortcodes/           # Custom shortcodes
│   │   ├── pattern-diagram.html
│   │   ├── comparison-table.html
│   │   ├── code-example.html
│   │   ├── api-method.html
│   │   └── warning-box.html
│   └── partials/             # Partial templates
└── themes/                    # Hugo theme
    └── docsy/                # Documentation theme
```

### Technology Stack

- **Hugo**: v0.120+ (static site generator)
- **Theme**: Docsy (or similar documentation-focused theme)
- **Diagrams**: Mermaid.js for inline diagrams
- **Search**: Algolia DocSearch or Lunr.js
- **Syntax Highlighting**: Prism.js or Hugo's built-in Chroma
- **Icons**: Font Awesome or Feather Icons
- **Deployment**: GitHub Actions + GitHub Pages

## Components and Interfaces

### 1. Hugo Configuration

```toml
# config.toml
baseURL = "https://yourusername.github.io/ddb-lib/"
title = "ddb-lib Documentation"
theme = "docsy"
enableGitInfo = true
enableRobotsTXT = true

[params]
  description = "Modular TypeScript library for AWS DynamoDB"
  github_repo = "https://github.com/yourusername/ddb-lib"
  github_branch = "main"
  version = "0.1.0"
  
  [params.ui]
    sidebar_menu_compact = true
    breadcrumb_disable = false
    sidebar_search_disable = false
    navbar_logo = true
    footer_about_disable = false
  
  [params.ui.feedback]
    enable = true
    yes = "Glad to hear it! Please tell us how we can improve."
    no = "Sorry to hear that. Please tell us how we can improve."
  
  [params.links]
    [[params.links.developer]]
      name = "GitHub"
      url = "https://github.com/yourusername/ddb-lib"
      icon = "fab fa-github"
    [[params.links.developer]]
      name = "npm"
      url = "https://www.npmjs.com/org/ddb-lib"
      icon = "fab fa-npm"

[markup]
  [markup.goldmark]
    [markup.goldmark.renderer]
      unsafe = true
  [markup.highlight]
    style = "monokai"
    lineNos = true
    lineNumbersInTable = true

[menu]
  [[menu.main]]
    name = "Overview"
    weight = 10
    url = "/overview/"
  [[menu.main]]
    name = "Getting Started"
    weight = 20
    url = "/getting-started/"
  [[menu.main]]
    name = "Guides"
    weight = 30
    url = "/guides/"
  [[menu.main]]
    name = "Patterns"
    weight = 40
    url = "/patterns/"
  [[menu.main]]
    name = "API Reference"
    weight = 50
    url = "/api/"
```

### 2. Custom Shortcodes

#### Pattern Diagram Shortcode

```html
<!-- layouts/shortcodes/pattern-diagram.html -->
<div class="pattern-diagram">
  <div class="diagram-container">
    {{ if .Get "mermaid" }}
      <div class="mermaid">
        {{ .Inner }}
      </div>
    {{ else }}
      <img src="{{ .Get "src" }}" alt="{{ .Get "alt" }}" />
    {{ end }}
  </div>
  {{ if .Get "caption" }}
    <p class="diagram-caption">{{ .Get "caption" }}</p>
  {{ end }}
</div>
```

Usage in Markdown:
```markdown
{{< pattern-diagram src="/images/patterns/entity-keys.svg" alt="Entity Key Pattern" caption="Entity keys provide type-safe prefixes" >}}
```

#### Comparison Table Shortcode

```html
<!-- layouts/shortcodes/comparison-table.html -->
<div class="comparison-table">
  <table>
    <thead>
      <tr>
        <th>{{ .Get "good-title" | default "✅ Good Practice" }}</th>
        <th>{{ .Get "bad-title" | default "❌ Anti-Pattern" }}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="good-practice">
          {{ .Get "good" | markdownify }}
        </td>
        <td class="bad-practice">
          {{ .Get "bad" | markdownify }}
        </td>
      </tr>
    </tbody>
  </table>
  {{ if .Get "explanation" }}
    <div class="explanation">
      {{ .Get "explanation" | markdownify }}
    </div>
  {{ end }}
</div>
```

#### Code Example Shortcode

```html
<!-- layouts/shortcodes/code-example.html -->
<div class="code-example">
  {{ if .Get "title" }}
    <div class="code-title">{{ .Get "title" }}</div>
  {{ end }}
  <div class="code-container">
    <button class="copy-button" onclick="copyCode(this)">
      <i class="far fa-copy"></i> Copy
    </button>
    {{ highlight (.Inner) (.Get "lang" | default "typescript") "linenos=table" }}
  </div>
  {{ if .Get "description" }}
    <div class="code-description">
      {{ .Get "description" | markdownify }}
    </div>
  {{ end }}
</div>
```

#### API Method Shortcode

```html
<!-- layouts/shortcodes/api-method.html -->
<div class="api-method">
  <div class="method-signature">
    <code>{{ .Get "signature" }}</code>
  </div>
  <div class="method-description">
    {{ .Inner | markdownify }}
  </div>
  {{ if .Get "params" }}
    <div class="method-params">
      <h4>Parameters</h4>
      {{ .Get "params" | markdownify }}
    </div>
  {{ end }}
  {{ if .Get "returns" }}
    <div class="method-returns">
      <h4>Returns</h4>
      {{ .Get "returns" | markdownify }}
    </div>
  {{ end }}
  {{ if .Get "example" }}
    <div class="method-example">
      <h4>Example</h4>
      {{ highlight (.Get "example") "typescript" "" }}
    </div>
  {{ end }}
</div>
```

#### Warning/Info Box Shortcode

```html
<!-- layouts/shortcodes/alert.html -->
<div class="alert alert-{{ .Get "type" | default "info" }}">
  {{ if .Get "icon" }}
    <i class="{{ .Get "icon" }}"></i>
  {{ end }}
  {{ if .Get "title" }}
    <div class="alert-title">{{ .Get "title" }}</div>
  {{ end }}
  <div class="alert-content">
    {{ .Inner | markdownify }}
  </div>
</div>
```

### 3. Content Templates

#### Pattern Page Template

```markdown
---
title: "Entity Keys Pattern"
weight: 10
description: "Type-safe entity identification with prefixed keys"
---

## What is it?

Entity keys are a pattern for creating type-safe, self-documenting partition and sort keys by prefixing them with the entity type.

## Why is it important?

- **Type Safety**: Prevents mixing different entity types
- **Debugging**: Keys are human-readable and self-documenting
- **Querying**: Easy to query all entities of a specific type
- **Single-Table Design**: Essential for organizing multiple entity types in one table

## Visual Representation

{{< pattern-diagram mermaid="true" caption="Entity Key Structure" >}}
graph LR
    A[Entity Type] -->|#| B[ID]
    B --> C[USER#123]
    style C fill:#4CAF50
{{< /pattern-diagram >}}

## Implementation

{{< code-example lang="typescript" title="Using Entity Keys" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Create entity key
const userKey = PatternHelpers.entityKey('USER', '123')
// Returns: 'USER#123'

// Parse entity key
const { entityType, id } = PatternHelpers.parseEntityKey('USER#123')
// Returns: { entityType: 'USER', id: '123' }
{{< /code-example >}}

## When to Use

- ✅ Single-table design with multiple entity types
- ✅ When you need human-readable keys
- ✅ When debugging and monitoring operations
- ❌ When using DynamoDB Streams (consider using UUIDs)

## Related Patterns

- [Composite Keys](/patterns/composite-keys/)
- [Hierarchical Keys](/patterns/hierarchical/)
```

#### Best Practice Page Template

```markdown
---
title: "Query vs Scan"
weight: 10
description: "Always prefer queries over scans for better performance"
---

## The Practice

Always use Query operations with proper key conditions instead of Scan operations.

## Why It Matters

**Performance**: Queries are O(log n) while scans are O(n)
**Cost**: Scans consume RCU for every item examined, not just returned
**Scalability**: Scans don't scale well as tables grow

## Visual Comparison

{{< comparison-table 
  good-title="✅ Query with Key Condition"
  bad-title="❌ Scan with Filter"
  good="Examines only relevant partition\nReturns results immediately\nConsumes minimal RCU"
  bad="Examines entire table\nFilters after reading\nConsumes RCU for all items"
>}}

## Code Example

{{< code-example lang="typescript" title="Good: Using Query" >}}
// Query specific partition
const result = await table.query({
  keyCondition: {
    pk: 'USER#123',
    sk: { beginsWith: 'ORDER#' }
  }
})
// Only reads items in USER#123 partition
{{< /code-example >}}

{{< code-example lang="typescript" title="Bad: Using Scan" >}}
// Scan entire table
const result = await table.scan({
  filter: {
    userId: { eq: '123' },
    type: { eq: 'ORDER' }
  }
})
// Reads EVERY item in the table!
{{< /code-example >}}

## Performance Impact

{{< alert type="warning" title="Cost Impact" >}}
A scan on a 1 million item table consumes 1 million RCU even if it returns only 10 items!
{{< /alert >}}

## When Scans Are Acceptable

- One-time data migrations
- Analytics on small tables (<1000 items)
- Admin operations during low-traffic periods

## How to Fix

1. Add a GSI with the attributes you're filtering on
2. Redesign your keys to support the access pattern
3. Use composite keys to group related items
```

#### Anti-Pattern Page Template

```markdown
---
title: "Hot Partitions"
weight: 20
description: "Avoid concentrating traffic on a single partition key"
---

## What is it?

A hot partition occurs when a disproportionate amount of traffic is directed to a single partition key value, causing throttling and poor performance.

## Why is it a problem?

- **Throttling**: DynamoDB partitions have throughput limits
- **Performance**: Requests queue up and slow down
- **Scalability**: Can't scale beyond single partition limits
- **Cost**: Wasted capacity on underutilized partitions

## Visual Representation

{{< pattern-diagram src="/images/anti-patterns/hot-partition.svg" alt="Hot Partition Problem" caption="All traffic hitting one partition" >}}

## Common Causes

1. Using a low-cardinality attribute as partition key (e.g., status, type)
2. Time-based keys without distribution (e.g., current date)
3. Popular items (trending posts, viral content)

## Example of the Problem

{{< code-example lang="typescript" title="❌ Hot Partition Anti-Pattern" >}}
// All "ACTIVE" users in one partition
await table.put({
  pk: 'STATUS#ACTIVE',  // Same for millions of users!
  sk: `USER#${userId}`,
  ...userData
})

// This partition gets ALL the traffic
{{< /code-example >}}

## The Solution

{{< code-example lang="typescript" title="✅ Distributed Keys" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Distribute across 10 shards
const pk = PatternHelpers.distributedKey('STATUS#ACTIVE', 10)
// Returns: 'STATUS#ACTIVE#SHARD#7' (random 0-9)

await table.put({
  pk,
  sk: `USER#${userId}`,
  ...userData
})

// Query all shards when needed
for (let i = 0; i < 10; i++) {
  const results = await table.query({
    keyCondition: { pk: `STATUS#ACTIVE#SHARD#${i}` }
  })
}
{{< /code-example >}}

## Detection

The library's anti-pattern detector can identify hot partitions:

{{< code-example lang="typescript" title="Detecting Hot Partitions" >}}
const detector = new AntiPatternDetector(stats)
const issues = detector.detectHotPartitions()

for (const issue of issues) {
  console.log(issue.message)
  // "Partition USER#123 receiving 80% of traffic"
}
{{< /code-example >}}

## Impact Metrics

| Metric | Hot Partition | Distributed |
|--------|--------------|-------------|
| Max Throughput | 3,000 RCU/WCU | 30,000+ RCU/WCU |
| Latency (p99) | 500ms+ | <50ms |
| Throttling | Frequent | Rare |

## Related Patterns

- [Distributed Keys](/patterns/hot-partition-distribution/)
- [Composite Keys](/patterns/composite-keys/)
```

## Data Models

### Content Front Matter

```yaml
---
title: "Page Title"
description: "Brief description for SEO and cards"
weight: 10                    # Order in navigation
draft: false                  # Published status
toc: true                     # Show table of contents
menu:
  main:
    parent: "section-name"
    weight: 10
tags: ["pattern", "keys", "best-practice"]
categories: ["Patterns"]
---
```

### Diagram Data Structure

```typescript
interface DiagramConfig {
  type: 'mermaid' | 'image' | 'svg'
  source: string
  alt: string
  caption?: string
  width?: string
  height?: string
}
```

### Code Example Structure

```typescript
interface CodeExample {
  title?: string
  language: string
  code: string
  description?: string
  runnable?: boolean
  repoLink?: string
}
```

## Error Handling

### Build Errors

- Invalid front matter: Hugo will report parsing errors
- Missing images: Hugo will warn about broken links
- Invalid shortcode parameters: Hugo will fail the build

### Runtime Errors

- 404 pages: Custom 404 page with search and navigation
- Broken links: Link checker in CI/CD pipeline
- Missing content: Placeholder pages with "Coming Soon"

## Testing Strategy

### Content Testing

- **Link Validation**: Check all internal and external links
- **Image Validation**: Verify all images exist and load
- **Code Examples**: Ensure all code examples are syntactically valid
- **Spelling**: Run spell checker on all content

### Visual Testing

- **Responsive Design**: Test on mobile, tablet, desktop viewports
- **Browser Compatibility**: Test on Chrome, Firefox, Safari, Edge
- **Accessibility**: Run WAVE or axe accessibility checker
- **Performance**: Lighthouse scores >90 for all metrics

### Build Testing

- **Hugo Build**: Ensure site builds without errors
- **Asset Optimization**: Verify images are optimized
- **Link Checking**: Run link checker after build
- **Search Index**: Verify search index is generated

## Deployment Strategy

### GitHub Actions Workflow

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - '.github/workflows/docs.yml'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive
          fetch-depth: 0
      
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: '0.120.0'
          extended: true
      
      - name: Build
        run: |
          cd docs
          hugo --minify
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/public
          cname: docs.ddb-lib.dev  # Optional custom domain
```

### Deployment Process

1. Push to main branch triggers workflow
2. Hugo builds static site
3. Assets are minified and optimized
4. Site is deployed to gh-pages branch
5. GitHub Pages serves the site

## Performance Considerations

### Build Performance

- Use Hugo's fast build times (~100ms for typical site)
- Cache dependencies in CI/CD
- Incremental builds during development

### Runtime Performance

- Static files served from CDN (GitHub Pages)
- Minified CSS and JavaScript
- Optimized images (WebP with fallbacks)
- Lazy loading for images
- Inline critical CSS
- Defer non-critical JavaScript

### SEO Optimization

- Semantic HTML structure
- Meta tags for social sharing
- Sitemap generation
- robots.txt configuration
- Structured data (JSON-LD)

## Security Considerations

- No user input or dynamic content
- Static files only (no server-side code)
- HTTPS enforced by GitHub Pages
- Content Security Policy headers
- No sensitive information in public docs

## Accessibility

- WCAG 2.1 AA compliance
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Screen reader friendly
- Sufficient color contrast
- Alt text for all images
- Skip navigation links

## Future Enhancements

- Interactive code playground (CodeSandbox integration)
- Video tutorials
- Animated diagrams
- Multi-language support (i18n)
- Version switcher for multiple versions
- Community examples gallery
- Performance benchmarks page
- Migration guides from other libraries


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Hugo Site Structure Completeness

*For any* initialized Hugo site, the directory structure should contain all required directories: config file, content/, themes/, static/, and layouts/

**Validates: Requirements 1.1**

### Property 2: Content Page Completeness

*For any* documentation section (overview, getting-started, patterns, best-practices, anti-patterns, api, examples, contributing), there should exist an _index.md file and all required sub-pages as specified in the design

**Validates: Requirements 2.5, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 10.1, 11.1, 18.1**

### Property 3: Pattern Page Structure

*For any* pattern documentation page, the page should contain all required sections: "What is it?", "Why is it important?", "Visual Representation", "Implementation", and "When to Use"

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 4: Best Practice Page Structure

*For any* best practice documentation page, the page should contain all required sections: "The Practice", "Why It Matters", "Visual Comparison", "Code Example", and "Performance Impact"

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 5: Anti-Pattern Page Structure

*For any* anti-pattern documentation page, the page should contain all required sections: "What is it?", "Why is it a problem?", "Visual Representation", "Example of the Problem", "The Solution", and "Impact Metrics"

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 6: Image Accessibility

*For any* image element in the generated HTML, the element should have an alt attribute with non-empty text

**Validates: Requirements 9.5**

### Property 7: Code Block Syntax Highlighting

*For any* code block in the generated HTML, the block should have syntax highlighting classes applied

**Validates: Requirements 11.1**

### Property 8: Navigation Hierarchy

*For any* page in the site, the page should be reachable through the navigation menu hierarchy

**Validates: Requirements 2.2**

### Property 9: Build Output Validity

*For any* Hugo build, the build should complete without errors and generate HTML files in the public/ directory

**Validates: Requirements 1.3**

### Property 10: Link Validity

*For any* internal link in the generated site, the link target should exist as a page in the site

**Validates: Requirements 2.1, 2.2**

### Property 11: Responsive Viewport Meta Tag

*For any* generated HTML page, the page should contain a viewport meta tag for responsive design

**Validates: Requirements 13.1, 13.2, 13.3**

### Property 12: Search Index Generation

*For any* site build with search enabled, the build should generate a search index file

**Validates: Requirements 14.5**

### Property 13: GitHub Actions Workflow Validity

*For any* deployment workflow file, the file should be valid YAML and contain required steps: checkout, setup Hugo, build, and deploy

**Validates: Requirements 12.1, 12.2**

### Property 14: Front Matter Validity

*For any* content file, the front matter should be valid YAML and contain required fields: title and description

**Validates: Requirements 1.4**

### Property 15: Shortcode Parameter Validation

*For any* custom shortcode usage, the shortcode should have all required parameters specified

**Validates: Requirements 6.3, 7.2, 8.3, 9.1**
