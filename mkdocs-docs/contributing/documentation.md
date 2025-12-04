---
title: Documentation Guide
description: Learn how to write and update ddb-lib documentation
---

## Documentation structure

The ddb-lib documentation is organized into several main sections:

```
docs/content/
├── _index.md              # Homepage
├── overview/              # Library overview and architecture
├── getting-started/       # Installation and quick start guides
├── guides/                # Detailed usage guides
├── patterns/              # DynamoDB design patterns
├── best-practices/        # Best practices and recommendations
├── anti-patterns/         # Common mistakes to avoid
├── api/                   # API reference documentation
├── examples/              # Code examples
└── contributing/          # This section
```

Each section has an `_index.md` file that serves as the landing page for that section.

## Writing documentation

### Front matter

Every documentation page must include front matter at the top:

```yaml
---
title: "Page Title"
linkTitle: "Short Title"  # Used in navigation
weight: 10                # Order in navigation (lower = earlier)
description: "Brief description for SEO and cards"
type: docs
---
```

### Markdown basics

Use standard Markdown syntax:

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
`inline code`

- Bullet list
- Another item

1. Numbered list
2. Another item

[Link text](https://example.com)
```

### Code blocks

Use fenced code blocks with language specification:

````markdown
```typescript
import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'MyTable'
})
```
````

Supported languages: `typescript`, `javascript`, `bash`, `json`, `yaml`, `html`, `css`

## Custom shortcodes

Hugo shortcodes allow you to add rich functionality to your documentation.

### Alert boxes

Use alert boxes to highlight important information:

```markdown

This is an informational message.



This is a warning message.



This is an error message.



This is a success message.

```

### Code examples

For code examples with titles and descriptions:

```markdown

import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'MyTable',
  region: 'us-east-1'
})

```

### Pattern diagrams

For visual diagrams using Mermaid:

```markdown

graph LR
    A[Entity Type] -->|#| B[ID]
    B --> C[USER#123]
    style C fill:#4CAF50

```

For image diagrams:

```markdown

```

### Comparison tables

For showing good vs. bad practices:

```markdown

```

### API method documentation

For documenting API methods:

```markdown
{{</* api-method signature="get(key: Key): Promise<Item>" */>}}
Retrieves a single item from the table by its primary key.

**Parameters:**
- `key`: Object containing partition key and optional sort key

**Returns:**
Promise resolving to the item or undefined if not found

**Example:**
```typescript
const user = await table.get({
  pk: 'USER#123',
  sk: 'PROFILE'
})
```

```

## Content guidelines

### Writing style

- **Be clear and concise**: Use simple language and short sentences
- **Be specific**: Provide concrete examples rather than abstract concepts
- **Be consistent**: Use the same terminology throughout
- **Be helpful**: Anticipate questions and provide answers

### Voice and tone

- Use second person ("you") when addressing the reader
- Use active voice ("the client sends a request" not "a request is sent")
- Be friendly but professional
- Avoid jargon unless necessary (and explain it when used)

### Code examples

- **Complete**: Show all necessary imports and setup
- **Runnable**: Examples should work if copied and pasted
- **Commented**: Explain non-obvious parts
- **Realistic**: Use realistic variable names and scenarios

Example:

```typescript
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

// Initialize the client
const table = new TableClient({
  tableName: 'Users',
  region: 'us-east-1'
})

// Create an entity key
const userKey = PatternHelpers.entityKey('USER', '123')

// Fetch the user
const user = await table.get({
  pk: userKey,
  sk: 'PROFILE'
})

console.log(user)
```

### Diagrams and images

- Place images in `docs/static/images/` organized by section
- Use SVG format when possible for scalability
- Always include alt text for accessibility
- Keep file sizes small (optimize images)
- Use descriptive filenames (e.g., `entity-key-pattern.svg`)

### Links

- Use relative links for internal pages: `/guides/core-operations/`
- Use absolute URLs for external links
- Ensure all links are valid (broken links will fail CI)
- Link to related content to help users discover more

## Page templates

### Pattern page template

```markdown
---
title: "Pattern Name"
weight: 10
description: "Brief description of the pattern"
type: docs
---

## What is it?

Explain what the pattern is in simple terms.

## Why is it important?

Explain the benefits and use cases.

## Visual representation



## Implementation



## When to use

- ✅ Use when...
- ✅ Use when...
- ❌ Don't use when...

## Related patterns

- [Related Pattern 1](../patterns/related-1.md)
- [Related Pattern 2](../patterns/related-2.md)
```

### Best practice page template

```markdown
---
title: "Best Practice Name"
weight: 10
description: "Brief description"
type: docs
---

## The practice

State the best practice clearly.

## Why it matters

Explain the reasoning and benefits.

## Visual comparison



## Code example


// Good code here



// Bad code here


## Performance impact

Explain the performance implications.

## When to apply

Guidance on when this practice applies.
```

### Guide page template

```markdown
---
title: "Guide Title"
weight: 10
description: "Brief description"
type: docs
---

## Overview

Brief introduction to what this guide covers.

## Prerequisites

What the reader should know or have set up first.

## Step-by-step instructions

### Step 1: first step

Explanation and code example.

### Step 2: second step

Explanation and code example.

## Complete example

Full working example combining all steps.

## Next steps

Links to related guides or advanced topics.
```

## Style guide

### Terminology

Use consistent terminology throughout:

- **DynamoDB** (not Dynamo DB or dynamodb)
- **partition key** (not hash key)
- **sort key** (not range key)
- **item** (not record or row)
- **attribute** (not field or column)
- **table** (not collection)

### Formatting

- **Package names**: Use code formatting: `@ddb-lib/core`
- **Class names**: Use code formatting: `TableClient`
- **Method names**: Use code formatting: `table.get()`
- **File names**: Use code formatting: `config.toml`
- **Commands**: Use code blocks for commands

### Capitalization

- Capitalize proper nouns: DynamoDB, AWS, TypeScript, Node.js
- Use sentence case for headings: "Getting started" not "Getting Started"
- Use title case for navigation: "Getting Started"

### Numbers

- Spell out numbers one through nine
- Use numerals for 10 and above
- Use numerals for technical values: "3 items", "10 seconds"

## Testing documentation

### Local preview

Always preview your changes locally before submitting:

```bash
cd docs
hugo server -D
```

Visit `http://localhost:1313/` to see your changes.

### Check for issues

Before submitting, verify:

- [ ] All links work (internal and external)
- [ ] All images load and have alt text
- [ ] Code examples are syntactically correct
- [ ] Shortcodes render properly
- [ ] Page appears in navigation
- [ ] Mobile layout looks good
- [ ] No spelling or grammar errors

### Build test

Ensure the site builds without errors:

```bash
cd docs
hugo --minify
```

Fix any errors or warnings before submitting.

## Submitting documentation changes

### 1. create a branch

```bash
git checkout -b docs/your-change-description
```

### 2. make your changes

Edit files in `docs/content/` following this guide.

### 3. preview and test

```bash
cd docs
hugo server -D
```

### 4. commit your changes

```bash
git add docs/
git commit -m "docs: describe your changes"
```

Use commit message prefixes:
- `docs:` for documentation changes
- `docs(api):` for API documentation
- `docs(guide):` for guide updates
- `docs(fix):` for fixing typos or errors

### 5. push and create PR

```bash
git push origin docs/your-change-description
```

Then open a pull request on GitHub with:
- Clear title describing the change
- Description of what was added/changed
- Screenshots if visual changes
- Link to related issues if applicable

## Common documentation tasks

### Adding a new guide

1. Create a new directory in `docs/content/guides/`
2. Add `_index.md` with front matter
3. Write the guide content
4. Add to navigation if needed
5. Link from related pages

### Adding a new pattern

1. Create a new file in `docs/content/patterns/`
2. Follow the pattern page template
3. Create or add diagram to `docs/static/images/patterns/`
4. Update patterns index page
5. Link from related guides

### Updating API documentation

1. Edit files in `docs/content/api/`
2. Use the API method shortcode for consistency
3. Include complete examples
4. Update if package API changes

### Adding images

1. Place image in appropriate subdirectory of `docs/static/images/`
2. Optimize image size (use tools like ImageOptim)
3. Use descriptive filename
4. Reference with `/images/path/to/image.svg`
5. Always include alt text

## Resources

- [Hugo Documentation](https://gohugo.io/documentation/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Mermaid Diagram Syntax](https://mermaid.js.org/)
- [Docsy Theme Docs](https://www.docsy.dev/docs/)

## Questions?

If you have questions about documentation:

- Check existing documentation pages for examples
- Ask in pull request comments
- Open a discussion on GitHub
- Reach out to maintainers

Thank you for improving our documentation! 📚
