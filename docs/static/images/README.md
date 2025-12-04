# Documentation Images

This directory contains all visual assets for the ddb-lib documentation site.

## Directory Structure

```
images/
├── architecture/       # Architecture and system diagrams
├── patterns/          # DynamoDB pattern diagrams
├── comparisons/       # Good vs bad practice comparisons
└── workflows/         # Operation flow diagrams
```

## Architecture Diagrams

### package-dependencies.svg
- **Description**: Shows the dependency graph between all ddb-lib packages
- **Alt Text**: "Package dependency graph showing relationships between core, stats, client, and amplify packages"
- **Usage**: Overview > Architecture page
- **Dimensions**: 800x600px

### monorepo-structure.svg
- **Description**: Visual representation of the monorepo file structure
- **Alt Text**: "Monorepo directory structure showing packages, docs, and examples folders"
- **Usage**: Overview > Architecture page, Contributing guide
- **Dimensions**: 600x700px

## Pattern Diagrams

### entity-keys.svg
- **Description**: Illustrates the entity key pattern structure
- **Alt Text**: "Entity key pattern showing ENTITY_TYPE#ID structure with examples"
- **Usage**: Patterns > Entity Keys page
- **Dimensions**: 700x400px

### composite-keys.svg
- **Description**: Shows how composite keys combine multiple parts
- **Alt Text**: "Composite key pattern demonstrating hierarchical key structure with query flexibility"
- **Usage**: Patterns > Composite Keys page
- **Dimensions**: 800x450px

### time-series.svg
- **Description**: Demonstrates time-series key pattern with timeline
- **Alt Text**: "Time-series pattern showing entity ID combined with ISO 8601 timestamp"
- **Usage**: Patterns > Time-Series page
- **Dimensions**: 800x500px

### hierarchical.svg
- **Description**: File system-like hierarchical structure
- **Alt Text**: "Hierarchical pattern showing file system structure with path notation"
- **Usage**: Patterns > Hierarchical page
- **Dimensions**: 700x600px

### adjacency-list.svg
- **Description**: Graph relationships using adjacency list pattern
- **Alt Text**: "Adjacency list pattern for modeling relationships and graphs in DynamoDB"
- **Usage**: Patterns > Adjacency List page
- **Dimensions**: 800x600px

### sparse-indexes.svg
- **Description**: Comparison of dense vs sparse indexes
- **Alt Text**: "Sparse index pattern showing selective indexing of items with specific attributes"
- **Usage**: Patterns > Sparse Indexes page
- **Dimensions**: 900x550px

### multi-attribute-keys.svg
- **Description**: Multi-attribute key pattern with query levels
- **Alt Text**: "Multi-attribute key pattern combining multiple attributes for flexible hierarchical queries"
- **Usage**: Patterns > Multi-Attribute Keys page
- **Dimensions**: 800x650px

## Comparison Diagrams

### query-vs-scan.svg
- **Description**: Performance comparison between Query and Scan operations
- **Alt Text**: "Query vs Scan performance comparison showing efficiency differences"
- **Usage**: Best Practices > Query vs Scan page, Anti-Patterns > Table Scans page
- **Dimensions**: 900x600px

### hot-partition.svg
- **Description**: Hot partition problem vs distributed solution
- **Alt Text**: "Hot partition anti-pattern compared to distributed key solution"
- **Usage**: Anti-Patterns > Hot Partitions page, Patterns > Hot Partition Distribution page
- **Dimensions**: 900x550px

### projection-expressions.svg
- **Description**: Benefits of using projection expressions
- **Alt Text**: "Projection expressions comparison showing reduced data transfer and RCU consumption"
- **Usage**: Best Practices > Projection Expressions page
- **Dimensions**: 900x600px

### batch-operations.svg
- **Description**: Individual requests vs batch operations
- **Alt Text**: "Batch operations comparison showing reduced API calls and improved performance"
- **Usage**: Best Practices > Batch Operations page
- **Dimensions**: 900x650px

## Workflow Diagrams

### batch-operation.svg
- **Description**: Flow diagram for batch operation processing
- **Alt Text**: "Batch operation workflow showing chunking, processing, and retry logic"
- **Usage**: Guides > Batch Operations page
- **Dimensions**: 800x700px

### transaction-flow.svg
- **Description**: DynamoDB transaction flow with ACID properties
- **Alt Text**: "Transaction flow diagram showing validation, commit, and rollback paths"
- **Usage**: Guides > Transactions page
- **Dimensions**: 900x650px

## Image Guidelines

### Format
- All images are SVG (Scalable Vector Graphics)
- SVG ensures perfect scaling at any resolution
- No raster images (PNG/JPG) needed for diagrams

### Accessibility
- All images must have descriptive alt text when used in content
- Use the alt text provided in this README
- Color contrast meets WCAG 2.1 AA standards
- Text in diagrams is readable at all sizes

### Responsive Design
- SVG images scale automatically
- Use `max-width: 100%` in CSS for responsive behavior
- Images adapt to container width
- No separate mobile/desktop versions needed

### Usage in Hugo

#### Using Static Images
```markdown
![Alt text](/images/patterns/entity-keys.svg)
```

#### Using with Shortcode
```markdown
{{< pattern-diagram src="/images/patterns/entity-keys.svg" 
    alt="Entity key pattern showing ENTITY_TYPE#ID structure" 
    caption="Entity keys provide type-safe prefixes" >}}
```

### Color Palette

The diagrams use a consistent color scheme:

- **Primary Blue**: `#2196F3` - Main elements, folders
- **Green**: `#4CAF50` - Success, good practices, results
- **Orange**: `#FF9800` - Separators, warnings, files
- **Red**: `#F44336` - Errors, anti-patterns, bad practices
- **Yellow**: `#FFF9C4` - Process steps, highlights
- **Light Blue**: `#E3F2FD` - Backgrounds, containers
- **Light Green**: `#E8F5E9` - Success backgrounds
- **Light Red**: `#FFEBEE` - Error backgrounds

### Optimization

SVG files are already optimized:
- ✓ Minimal file size (text-based)
- ✓ No compression artifacts
- ✓ Perfect scaling
- ✓ Fast loading
- ✓ Accessible text
- ✓ SEO-friendly

### Maintenance

When adding new images:
1. Follow the naming convention: `kebab-case.svg`
2. Place in appropriate subdirectory
3. Use consistent color palette
4. Add entry to this README
5. Include descriptive alt text
6. Test at multiple viewport sizes
7. Verify accessibility with screen reader

### Future Enhancements

Potential additions:
- [ ] Dark mode variants
- [ ] Animated diagrams
- [ ] Interactive diagrams
- [ ] Downloadable PNG versions
- [ ] Diagram source files (if using design tool)
