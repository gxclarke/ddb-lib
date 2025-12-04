# Sidebar Configuration Summary

## Changes Made

The documentation site now has a left navigation sidebar like the Docsy demo theme.

### Configuration Updates

1. **Hugo Configuration (`hugo.toml`)**
   - Added `showLightDarkModeMenu = true` to enable theme switcher
   - Changed `footer_about_disable` to `footer_about_enable` (deprecated parameter)
   - Added taxonomies configuration for proper content organization

2. **Content Type**
   - Added `type: docs` to all content files (both `_index.md` and regular `.md` files)
   - This tells Hugo to use the Docsy `docs` layout which includes the sidebar

3. **Menu Configuration**
   - Removed duplicate menu entries from section `_index.md` files
   - Kept menu configuration centralized in `hugo.toml`

### How the Sidebar Works

The sidebar navigation is automatically generated from your content structure when using `type: docs`:

- **Section pages** (`_index.md`) appear as top-level items
- **Sub-pages** appear nested under their parent section
- **Weight** determines the order of items
- **linkTitle** (or title if linkTitle is not set) is used for the menu text

### Sidebar Features

- ✅ Hierarchical navigation based on content structure
- ✅ Collapsible/expandable sections
- ✅ Search box in sidebar
- ✅ Active page highlighting
- ✅ Responsive (collapses to hamburger menu on mobile)
- ✅ Breadcrumb navigation at top of content

### Content Structure

```
content/
├── _index.md (homepage - no sidebar)
├── overview/
│   ├── _index.md (sidebar shows: architecture, packages, comparison)
│   ├── architecture.md
│   ├── packages.md
│   └── comparison.md
├── getting-started/
│   ├── _index.md (sidebar shows all getting started pages)
│   ├── installation.md
│   ├── standalone.md
│   ├── amplify.md
│   └── first-app.md
├── guides/
│   ├── _index.md
│   ├── core-operations/_index.md
│   ├── query-and-scan/_index.md
│   └── ... (other guides)
└── ... (other sections)
```

### Viewing the Site

To see the sidebar in action:

```bash
cd docs
hugo server -D
```

Then visit:
- http://localhost:1313/ddb-lib/overview/ - See sidebar with Overview pages
- http://localhost:1313/ddb-lib/getting-started/ - See sidebar with Getting Started pages
- http://localhost:1313/ddb-lib/patterns/ - See sidebar with all patterns
- Any other section page

**Note:** The homepage (`/`) uses a special layout without a sidebar. The sidebar appears on all section and content pages.

### Customizing the Sidebar

To customize sidebar behavior, edit `hugo.toml`:

```toml
[params.ui]
  # Compact mode (less spacing)
  sidebar_menu_compact = false
  
  # Allow sections to be collapsed/expanded
  sidebar_menu_foldable = true
  
  # Number of menu items to cache
  sidebar_cache_limit = 10
  
  # Disable search in sidebar
  sidebar_search_disable = false
  
  # How many levels to show by default (1 = only top level)
  ul_show = 1
```

### Troubleshooting

If the sidebar doesn't appear:

1. **Check content type:** Ensure all content files have `type: docs` in front matter
2. **Check file structure:** Ensure `_index.md` exists for each section
3. **Rebuild:** Run `hugo --minify` to rebuild the site
4. **Clear cache:** Delete `public/` and `resources/` directories and rebuild

### Additional Resources

- [Docsy Documentation](https://www.docsy.dev/docs/)
- [Hugo Content Organization](https://gohugo.io/content-management/organization/)
- [Docsy Navigation](https://www.docsy.dev/docs/adding-content/navigation/)
