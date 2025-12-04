# ddb-lib Documentation Site

Hugo-based documentation site for the ddb-lib monorepo.

## Status

### ✅ Completed

1. **Hugo Site Setup**
   - Hugo installed and initialized
   - Custom lightweight theme created
   - Configuration file set up
   - Site builds successfully

2. **Custom Shortcodes**
   - `pattern-diagram` - For Mermaid diagrams and images
   - `comparison-table` - For good vs bad comparisons
   - `code-example` - For code blocks with copy button
   - `api-method` - For API documentation
   - `alert` - For info/warning/error/success boxes

3. **Homepage and Overview**
   - Homepage with feature highlights
   - Architecture overview with diagrams
   - Packages overview with comparison table
   - Comparison with alternatives

4. **Getting Started** (Partial)
   - Getting started index
   - Installation guide

5. **GitHub Actions Workflow**
   - Deployment workflow created
   - Ready for GitHub Pages

### 🚧 To Complete

The following content pages need to be created. Use the existing pages as templates:

#### Getting Started
- `docs/content/getting-started/standalone.md` - Standalone quick start
- `docs/content/getting-started/amplify.md` - Amplify quick start
- `docs/content/getting-started/first-app.md` - First application tutorial

#### Guides
- Create `docs/content/guides/` directory structure
- Core operations guide
- Query and scan guide
- Batch operations guide
- Transactions guide
- Access patterns guide
- Monitoring guide
- Multi-attribute keys guide

#### Patterns
- Create `docs/content/patterns/` directory
- 8 pattern pages (entity-keys, composite-keys, time-series, hierarchical, adjacency-list, hot-partition-distribution, sparse-indexes, multi-attribute-keys)

#### Best Practices
- Create `docs/content/best-practices/` directory
- 7 best practice pages

#### Anti-Patterns
- Create `docs/content/anti-patterns/` directory
- 7 anti-pattern pages

#### API Reference
- Create `docs/content/api/` directory
- API docs for all 4 packages

#### Examples
- Create `docs/content/examples/` directory
- Standalone and Amplify examples

#### Contributing
- Create `docs/content/contributing/` directory
- Setup, documentation, and guidelines pages

## Local Development

### Prerequisites

- Hugo >= 0.120.0
- Node.js >= 18.0.0

### Run Locally

```bash
cd docs
hugo server -D
```

Visit http://localhost:1313

### Build

```bash
cd docs
hugo --minify
```

Output will be in `docs/public/`

## Deployment

### GitHub Pages Setup

1. Go to repository Settings > Pages
2. Set Source to "GitHub Actions"
3. Push changes to main branch
4. Workflow will automatically build and deploy

### Custom Domain (Optional)

1. Add CNAME file to `docs/static/CNAME` with your domain
2. Configure DNS with your provider
3. Update `baseURL` in `docs/hugo.toml`

## Content Guidelines

### Front Matter

All content files should have:

```yaml
---
title: "Page Title"
description: "Brief description"
weight: 10  # For ordering
---
```

### Using Shortcodes

#### Pattern Diagram

```markdown
{{< pattern-diagram mermaid="true" caption="Diagram caption" >}}
graph LR
    A --> B
{{< /pattern-diagram >}}
```

#### Comparison Table

```markdown
{{< comparison-table 
  good-title="✅ Good Practice"
  bad-title="❌ Anti-Pattern"
  good="Use queries with key conditions"
  bad="Use scans with filters"
  explanation="Queries are more efficient"
>}}
```

#### Code Example

```markdown
{{< code-example lang="typescript" title="Example Title" >}}
const example = 'code here'
{{< /code-example >}}
```

#### Alert

```markdown
{{< alert type="warning" title="Important" >}}
This is a warning message
{{< /alert >}}
```

Types: `info`, `warning`, `error`, `success`

## Theme Customization

### Colors

Edit `docs/static/css/style.css`:

```css
:root {
    --primary-color: #4CAF50;
    --secondary-color: #2196F3;
    /* ... */
}
```

### Layouts

Theme files are in `docs/themes/ddb-docs/layouts/`

## Adding Content

### New Section

1. Create directory: `docs/content/new-section/`
2. Add index: `docs/content/new-section/_index.md`
3. Add to menu in `docs/hugo.toml`

### New Page

1. Create file: `docs/content/section/page.md`
2. Add front matter
3. Write content using Markdown and shortcodes

## Troubleshooting

### Hugo Not Found

```bash
brew install hugo
```

### Build Errors

Check Hugo version:
```bash
hugo version
```

Should be >= 0.120.0

### Theme Issues

Ensure theme exists:
```bash
ls docs/themes/ddb-docs/
```

## Resources

- [Hugo Documentation](https://gohugo.io/documentation/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Mermaid Diagrams](https://mermaid.js.org/)

## License

MIT
