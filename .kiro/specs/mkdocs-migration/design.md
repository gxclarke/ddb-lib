# Design Document

## Overview

This design implements a migration from Hugo/Docsy to MkDocs with Material theme for the ddb-lib documentation site. The migration will preserve all existing content while providing a more professional, polished appearance with Material Design principles. MkDocs Material offers superior out-of-the-box styling, better mobile experience, and extensive customization options that will address the presentation issues in the current Hugo implementation.

The architecture follows MkDocs' simple, Python-based approach with a focus on content organization, theme configuration, and deployment automation. We'll leverage Material theme's extensive feature set including instant loading, social cards, code annotations, and advanced search.

## Architecture

### Directory Structure

```
docs/
├── mkdocs.yml                 # MkDocs configuration
├── requirements.txt           # Python dependencies
├── docs/                      # Documentation content (MkDocs convention)
│   ├── index.md              # Homepage
│   ├── overview/             # Library overview
│   │   ├── index.md
│   │   ├── architecture.md
│   │   ├── packages.md
│   │   └── comparison.md
│   ├── getting-started/      # Getting started guides
│   │   ├── index.md
│   │   ├── installation.md
│   │   ├── standalone.md
│   │   ├── amplify.md
│   │   └── first-app.md
│   ├── guides/               # Usage guides
│   │   ├── index.md
│   │   ├── core-operations.md
│   │   ├── query-and-scan.md
│   │   ├── batch-operations.md
│   │   ├── transactions.md
│   │   ├── access-patterns.md
│   │   ├── monitoring.md
│   │   └── multi-attribute-keys.md
│   ├── patterns/             # DynamoDB patterns
│   │   ├── index.md
│   │   ├── entity-keys.md
│   │   ├── composite-keys.md
│   │   ├── time-series.md
│   │   ├── hierarchical.md
│   │   ├── adjacency-list.md
│   │   ├── hot-partition-distribution.md
│   │   ├── sparse-indexes.md
│   │   └── multi-attribute-keys.md
│   ├── best-practices/       # Best practices
│   │   ├── index.md
│   │   ├── query-vs-scan.md
│   │   ├── projection-expressions.md
│   │   ├── batch-operations.md
│   │   ├── conditional-writes.md
│   │   ├── capacity-planning.md
│   │   └── key-design.md
│   ├── anti-patterns/        # Anti-patterns
│   │   ├── index.md
│   │   ├── table-scans.md
│   │   ├── hot-partitions.md
│   │   ├── string-concatenation.md
│   │   ├── read-before-write.md
│   │   ├── missing-projections.md
│   │   └── inefficient-batching.md
│   ├── api/                  # API reference
│   │   ├── index.md
│   │   ├── core.md
│   │   ├── stats.md
│   │   ├── client.md
│   │   └── amplify.md
│   ├── examples/             # Code examples
│   │   ├── index.md
│   │   ├── standalone.md
│   │   └── amplify.md
│   ├── contributing/         # Contributing guide
│   │   ├── index.md
│   │   ├── setup.md
│   │   └── documentation.md
│   ├── stylesheets/          # Custom CSS
│   │   └── extra.css
│   └── javascripts/          # Custom JS
│       └── extra.js
├── overrides/                # Theme overrides
│   └── partials/
└── site/                     # Build output (gitignored)
```

### Technology Stack

- **MkDocs**: v1.5+ (static site generator)
- **Material for MkDocs**: v9.5+ (theme)
- **Python**: 3.8+ (runtime)
- **Plugins**:
  - mkdocs-material
  - mkdocs-minify-plugin
  - mkdocs-git-revision-date-localized-plugin
  - mkdocs-awesome-pages-plugin (optional)
- **Extensions**:
  - pymdown-extensions (enhanced Markdown)
  - markdown-include
- **Deployment**: GitHub Actions + GitHub Pages

## Components and Interfaces

### 1. MkDocs Configuration

```yaml
# mkdocs.yml
site_name: ddb-lib Documentation
site_url: https://gxclarke.github.io/ddb-lib/
site_description: Modular TypeScript library for AWS DynamoDB with best practices
site_author: ddb-lib contributors
repo_url: https://github.com/gxclarke/ddb-lib
repo_name: gxclarke/ddb-lib
edit_uri: edit/main/docs/docs/

# Copyright
copyright: Copyright &copy; 2024 ddb-lib contributors

# Theme configuration
theme:
  name: material
  language: en
  
  # Color scheme
  palette:
    # Light mode
    - media: "(prefers-color-scheme: light)"
      scheme: default
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-7
        name: Switch to dark mode
    
    # Dark mode
    - media: "(prefers-color-scheme: dark)"
      scheme: slate
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-4
        name: Switch to light mode
  
  # Fonts
  font:
    text: Roboto
    code: Roboto Mono
  
  # Logo and favicon
  logo: assets/logo.svg
  favicon: assets/favicon.png
  
  # Features
  features:
    - announce.dismiss
    - content.action.edit
    - content.action.view
    - content.code.annotate
    - content.code.copy
    - content.tabs.link
    - content.tooltips
    - header.autohide
    - navigation.expand
    - navigation.footer
    - navigation.indexes
    - navigation.instant
    - navigation.instant.prefetch
    - navigation.instant.progress
    - navigation.path
    - navigation.sections
    - navigation.tabs
    - navigation.tabs.sticky
    - navigation.top
    - navigation.tracking
    - search.highlight
    - search.share
    - search.suggest
    - toc.follow
    - toc.integrate

# Navigation structure
nav:
  - Home: index.md
  - Overview:
      - overview/index.md
      - Architecture: overview/architecture.md
      - Packages: overview/packages.md
      - Comparison: overview/comparison.md
  - Getting Started:
      - getting-started/index.md
      - Installation: getting-started/installation.md
      - Standalone: getting-started/standalone.md
      - Amplify: getting-started/amplify.md
      - First pp: getting-started/first-app.md
  - Guides:
      - guides/index.md
      - Core Operations: guides/core-operations.md
      - Query & Scan: guides/query-and-scan.md
      - Batch Operations: guides/batch-operations.md
      - Transactions: guides/transactions.md
      - Access Patterns: guides/access-patterns.md
      - Monitoring: guides/monitoring.md
      - Multi-Attribute Keys: guides/multi-attribute-keys.md
  - Patterns:
      - patterns/index.md
      - Entity Keys: patterns/entity-keys.md
      - Composite Keys: patterns/composite-keys.md
      - Time-Series: patterns/time-series.md
      - Hierarchical: patterns/hierarchical.md
      - Adjacency List: patterns/adjacency-list.md
      - Hot Partition Distribution: patterns/hot-partition-distribution.md
      - Sparse Indexes: patterns/sparse-indexes.md
      - Multi-Attribute Keys: patterns/multi-attribute-keys.md
  - Best Practices:
      - best-practices/index.md
      - Query vs Scan: best-practices/query-vs-scan.md
      - Projection Expressions: best-practices/projection-expressions.md
      - Batch Operations: best-practices/batch-operations.md
      - Conditional Writes: best-practices/conditional-writes.md
      - Capacity Planning: best-practices/capacity-planning.md
      - Key Design: best-practices/key-design.md
  - Anti-Patterns:
      - anti-patterns/index.md
      - Table Scans: anti-patterns/table-scans.md
      - Hot Partitions: anti-patterns/hot-partitions.md
      - String Concatenation: anti-patterns/string-concatenation.md
      - Read-Before-Write: anti-patterns/read-before-write.md
      - Missing Projections: anti-patterns/missing-projections.md
      - Inefficient Batching: anti-patterns/inefficient-batching.md
  - API Reference:
      - api/index.md
      - "@ddb-lib/core": api/core.md
      - "@ddb-lib/stats": api/stats.md
      - "@ddb-lib/client": api/client.md
      - "@ddb-lib/amplify": api/amplify.md
  - Examples:
      - examples/index.md
      - Standalone: examples/standalone.md
      - Amplify: examples/amplify.md
  - Contributing:
      - contributing/index.md
      - Setup: contributing/setup.md
      - Documentation: contributing/documentation.md

# Plugins
plugins:
  - search:
      separator: '[\s\-,:!=\[\]()"`/]+|\.(?!\d)|&[lg]t;|(?!\b)(?=[A-Z][a-z])'
  - minify:
      minify_html: true
      minify_js: true
      minify_css: true
      htmlmin_opts:
        remove_comments: true
      cache_safe: true
  - git-revision-date-localized:
      enable_creation_date: true
      type: timeago

# Markdown extensions
markdown_extensions:
  # Python Markdown
  - abbr
  - admonition
  - attr_list
  - def_list
  - footnotes
  - md_in_html
  - toc:
      permalink: true
      toc_depth: 3
  
  # PyMdown Extensions
  - pymdownx.arithmatex:
      generic: true
  - pymdownx.betterem:
      smart_enable: all
  - pymdownx.caret
  - pymdownx.details
  - pymdownx.emoji:
      emoji_index: !!python/name:material.extensions.emoji.twemoji
      emoji_generator: !!python/name:material.extensions.emoji.to_svg
  - pymdownx.highlight:
      anchor_linenums: true
      line_spans: __span
      pygments_lang_class: true
  - pymdownx.inlinehilite
  - pymdownx.keys
  - pymdownx.mark
  - pymdownx.smartsymbols
  - pymdownx.snippets
  - pymdownx.superfences:
      custom_fences:
        - name: mermaid
          class: mermaid
          format: !!python/name:pymdownx.superfences.fence_code_format
  - pymdownx.tabbed:
      alternate_style: true
  - pymdownx.tasklist:
      custom_checkbox: true
  - pymdownx.tilde

# Extra configuration
extra:
  version:
    provider: mike
  social:
    - icon: fontawesome/brands/github
      link: https://github.com/gxclarke/ddb-lib
      name: GitHub Repository
    - icon: fontawesome/brands/npm
      link: https://www.npmjs.com/org/ddb-lib
      name: npm Packages
  analytics:
    provider: google
    property: G-XXXXXXXXXX  # Replace with actual GA4 ID
  consent:
    title: Cookie consent
    description: >-
      We use cookies to recognize your repeated visits and preferences, as well
      as to measure the effectiveness of our documentation and whether users
      find what they're searching for. With your consent, you're helping us to
      make our documentation better.

# Custom CSS and JavaScript
extra_css:
  - stylesheets/extra.css

extra_javascript:
  - javascripts/extra.js
```

### 2. Python Dependencies

```txt
# requirements.txt
mkdocs>=1.5.0
mkdocs-material>=9.5.0
mkdocs-minify-plugin>=0.7.0
mkdocs-git-revision-date-localized-plugin>=1.2.0
pymdown-extensions>=10.0
```

### 3. Content Migration Strategy

#### Front Matter Conversion

**Hugo Format:**
```yaml
---
title: "Entity Keys Pattern"
linkTitle: "Entity Keys"
description: "Type-safe entity identification with prefixed keys"
weight: 10
type: docs
---
```

**MkDocs Format:**
```yaml
---
title: Entity Keys Pattern
description: Type-safe entity identification with prefixed keys
---
```

#### Admonition Conversion

**Hugo Shortcode:**
```markdown
{{< alert type="warning" title="Cost Impact" >}}
A scan on a 1 million item table consumes 1 million RCU!
{{< /alert >}}
```

**Material Admonition:**
```markdown
!!! warning "Cost Impact"
    A scan on a 1 million item table consumes 1 million RCU!
```

#### Code Block Enhancement

**Basic:**
```markdown
```typescript
const key = PatternHelpers.entityKey('USER', '123')
\```
```

**With Annotations:**
```markdown
```typescript
const key = PatternHelpers.entityKey('USER', '123') // (1)!
\```

1. Creates a type-safe entity key with format `USER#123`
```

### 4. Custom Styling

```css
/* docs/stylesheets/extra.css */

/* Brand colors */
:root {
  --md-primary-fg-color: #3f51b5;
  --md-primary-fg-color--light: #5c6bc0;
  --md-primary-fg-color--dark: #303f9f;
  --md-accent-fg-color: #3f51b5;
}

/* Code block enhancements */
.highlight .filename {
  display: block;
  padding: 0.5em 1em;
  background-color: var(--md-code-bg-color);
  border-bottom: 1px solid var(--md-default-fg-color--lightest);
  font-weight: 700;
  font-size: 0.85em;
}

/* Custom admonition styles */
.md-typeset .admonition.tip {
  border-color: #00c853;
}

.md-typeset .admonition.tip > .admonition-title {
  background-color: rgba(0, 200, 83, 0.1);
}

/* Table improvements */
.md-typeset table:not([class]) {
  font-size: 0.85em;
}

.md-typeset table:not([class]) th {
  background-color: var(--md-default-fg-color--lightest);
}

/* Responsive images */
.md-typeset img {
  max-width: 100%;
  height: auto;
}
```

### 5. GitHub Actions Deployment

```yaml
# .github/workflows/docs.yml
name: Deploy Documentation

on:
  push:
    branches:
      - main
    paths:
      - 'docs/**'
      - 'mkdocs.yml'
      - 'requirements.txt'
      - '.github/workflows/docs.yml'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Fetch all history for git-revision-date-localized
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      
      - name: Build documentation
        run: |
          mkdocs build --strict
      
      - name: Deploy to GitHub Pages
        run: |
          mkdocs gh-deploy --force
```

## Data Models

### Page Metadata Structure

```yaml
---
title: string              # Page title (required)
description: string        # Page description for SEO
hide:
  - navigation            # Hide from navigation
  - toc                   # Hide table of contents
status: new | deprecated  # Page status badge
---
```

### Navigation Item Structure

```yaml
- Section Name:
    - section/index.md
    - Page Title: section/page.md
    - Subsection:
        - section/subsection/page.md
```

## Error Handling

### Build Errors

- **Missing files**: MkDocs will report 404 errors for broken links
- **Invalid YAML**: MkDocs will fail with syntax errors
- **Plugin errors**: Detailed error messages in build output

### Runtime Errors

- **404 pages**: Custom 404 page with search and navigation
- **Broken links**: Link checker in CI/CD pipeline
- **Missing images**: Placeholder or error message

## Testing Strategy

### Content Validation

- **Link checking**: Validate all internal and external links
- **Image validation**: Verify all images exist and load
- **Code examples**: Ensure all code examples are syntactically valid
- **Spelling**: Run spell checker on all content

### Visual Testing

- **Responsive design**: Test on mobile, tablet, desktop viewports
- **Browser compatibility**: Test on Chrome, Firefox, Safari, Edge
- **Accessibility**: Run WAVE or axe accessibility checker
- **Performance**: Lighthouse scores >90 for all metrics

### Migration Validation

- **Page count**: Verify all 51+ pages migrated
- **Content comparison**: Diff content before/after migration
- **Feature parity**: Ensure all Hugo features have MkDocs equivalents
- **Link integrity**: Zero broken internal links

## Deployment Strategy

### Build Process

1. Install Python dependencies from requirements.txt
2. Run `mkdocs build --strict` to generate site
3. Validate build output
4. Deploy to gh-pages branch

### Deployment Triggers

- Push to main branch with changes to docs/
- Manual workflow dispatch
- Pull request preview (optional)

### Rollback Strategy

- Keep Hugo site in separate branch
- Test MkDocs site on staging URL first
- Switch DNS/GitHub Pages settings only after validation

## Performance Considerations

### Build Performance

- MkDocs builds are typically faster than Hugo
- Incremental builds during development
- Cache Python dependencies in CI/CD

### Runtime Performance

- Static files served from CDN (GitHub Pages)
- Minified HTML, CSS, and JavaScript
- Instant loading for fast page transitions
- Lazy loading for images
- Service worker for offline support (optional)

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

## Migration Process

### Phase 1: Setup (Day 1)

1. Install MkDocs and Material theme
2. Create mkdocs.yml configuration
3. Set up directory structure
4. Configure theme and plugins

### Phase 2: Content Migration (Days 2-3)

1. Copy content from Hugo content/ to MkDocs docs/
2. Convert front matter from Hugo to MkDocs format
3. Convert _index.md files to index.md
4. Update internal links
5. Convert Hugo shortcodes to Material admonitions

### Phase 3: Styling and Features (Day 4)

1. Configure Material theme colors and fonts
2. Add custom CSS
3. Set up code block features
4. Configure search
5. Add social cards

### Phase 4: Testing and Validation (Day 5)

1. Run link checker
2. Test responsive design
3. Validate accessibility
4. Check performance
5. Compare with Hugo site

### Phase 5: Deployment (Day 6)

1. Set up GitHub Actions workflow
2. Test deployment to staging
3. Validate deployed site
4. Switch to production
5. Archive Hugo site

## Future Enhancements

- **Versioning**: Use mike for multi-version documentation
- **API docs generation**: Auto-generate API docs from TypeScript
- **Interactive examples**: CodeSandbox integration
- **Video tutorials**: Embed video content
- **Multi-language**: i18n support for translations
- **Blog**: Add blog section for updates and tutorials
- **Community**: Add community examples gallery

