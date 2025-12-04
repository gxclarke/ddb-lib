# Code Block Enhancements Documentation

## Overview

The documentation site includes comprehensive code block enhancements to improve the developer experience when viewing and copying code examples.

## Features Implemented

### 1. Copy Button Functionality ✅

**Description**: Every code block includes a copy button that allows users to quickly copy code to their clipboard.

**Features**:
- Icon-based button with "Copy" text
- Visual feedback: Changes to "Copied!" with checkmark icon
- Error handling: Shows "Failed" if copy operation fails
- Fallback support for older browsers
- Keyboard accessible
- ARIA labels for screen readers

**Location**: Top-right corner of code blocks

**Behavior**:
- Click to copy entire code block
- 2-second feedback display
- Smooth transitions

### 2. Line Numbers ✅

**Description**: Code blocks with 4 or more lines automatically display line numbers.

**Features**:
- Left-aligned line numbers
- Non-selectable (won't be copied)
- Properly aligned with code
- Styled to be subtle but readable
- Responsive sizing on mobile

**Behavior**:
- Automatically added to code blocks with 4+ lines
- Short code snippets (1-3 lines) don't show line numbers
- Line numbers update if code is dynamically changed

### 3. Mobile Scrolling ✅

**Description**: Code blocks are fully scrollable on mobile devices without causing page-wide horizontal scrolling.

**Features**:
- Horizontal scrolling enabled
- Smooth touch scrolling on iOS (`-webkit-overflow-scrolling: touch`)
- No text wrapping (preserves formatting)
- Contained within viewport
- Responsive font sizing

**Breakpoints**:
- Desktop: 0.9em font size
- Tablet (≤768px): 0.85em font size
- Mobile (≤480px): 0.8em font size

### 4. Language Labels ✅

**Description**: Code blocks display the programming language in the top-left corner.

**Features**:
- Extracted from code block class (e.g., `language-typescript`)
- Uppercase display
- Subtle styling
- Positioned to not interfere with copy button

**Supported Languages**:
- TypeScript
- JavaScript
- JSON
- Bash
- Python
- And any language specified in the code block class

### 5. Syntax Highlighting ✅

**Description**: Basic syntax highlighting for common code patterns.

**Features**:
- Highlights keywords (const, let, function, etc.)
- Highlights strings
- Highlights comments
- Compatible with Prism.js or highlight.js if loaded
- Fallback basic highlighting if no library present

**Token Colors** (Dark theme):
- Comments: #6A9955 (green, italic)
- Strings: #CE9178 (orange)
- Keywords: #569CD6 (blue, bold)
- Functions: #DCDCAA (yellow)
- Numbers: #B5CEA8 (light green)

### 6. Dark Mode Support ✅

**Description**: All code block features work seamlessly in both light and dark modes.

**Features**:
- Automatic theme detection
- Manual theme toggle
- Smooth transitions
- Maintained readability
- Proper contrast ratios

### 7. Responsive Design ✅

**Description**: Code blocks adapt to different screen sizes.

**Desktop (>768px)**:
- Full-width code blocks
- Copy button in top-right
- Line numbers on left
- Standard font size

**Tablet (481-768px)**:
- Slightly reduced font size
- Maintained layout
- Horizontal scrolling enabled

**Mobile (≤480px)**:
- Reduced font size (0.8em)
- Copy button moves below code block (full-width)
- Reduced padding
- Optimized line number spacing

### 8. Accessibility ✅

**Description**: Code blocks are fully accessible to all users.

**Features**:
- Keyboard navigation support
- ARIA labels on interactive elements
- Focus indicators
- Screen reader friendly
- Semantic HTML structure

**Keyboard Shortcuts**:
- Tab: Navigate to copy button
- Enter/Space: Activate copy button
- Shift+Tab: Navigate backwards

## Usage

### Basic Code Block

```markdown
```typescript
const client = new TableClient({
  tableName: 'MyTable'
});
```
```

### Code Block Without Line Numbers

For short snippets (1-3 lines), line numbers are automatically omitted:

```markdown
```bash
npm install @ddb-lib/client
```
```

### Code Block with Specific Language

```markdown
```json
{
  "name": "example",
  "version": "1.0.0"
}
```
```

## Technical Implementation

### JavaScript (main.js)

- `addLineNumbers()`: Adds line numbers to code blocks
- `getLanguageFromClass()`: Extracts language from class name
- `enhanceSyntaxHighlighting()`: Provides basic syntax highlighting
- Copy button event handlers with clipboard API

### CSS (style.css)

- `.line-numbers`: Styling for line number column
- `.copy-button`: Styling for copy button
- `.code-language-label`: Styling for language label
- `.token.*`: Syntax highlighting token styles
- Responsive breakpoints for mobile optimization

## Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Minimal JavaScript execution
- CSS-based styling (no runtime overhead)
- Lazy initialization (only processes visible code blocks)
- Efficient DOM manipulation
- No external dependencies required

## Testing

Test files available:
- `/static/test-code-blocks.html` - Interactive test page
- Manual testing across devices and browsers
- Accessibility testing with screen readers

## Future Enhancements

Potential improvements:
- [ ] Code block expand/collapse for very long code
- [ ] Download code as file
- [ ] Code playground integration (CodeSandbox, StackBlitz)
- [ ] Diff highlighting for before/after examples
- [ ] Code annotation support

## Troubleshooting

### Copy button not working
- Check if clipboard API is supported
- Verify HTTPS connection (required for clipboard API)
- Check browser console for errors

### Line numbers misaligned
- Verify font-family matches between line numbers and code
- Check for custom CSS overrides
- Ensure line-height is consistent

### Mobile scrolling issues
- Verify viewport meta tag is present
- Check for CSS overflow conflicts
- Test on actual devices (not just browser dev tools)

## Conclusion

All code block enhancements have been successfully implemented and tested. The features provide a professional, user-friendly experience for viewing and copying code examples across all devices and screen sizes.
