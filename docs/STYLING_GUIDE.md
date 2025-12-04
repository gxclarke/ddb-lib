# Styling and Responsive Design Guide

## Quick Reference

This guide provides a quick reference for all styling and responsive design features implemented in the ddb-lib documentation site.

## CSS Custom Properties

### Colors

```css
/* Light Mode */
--primary-color: #4CAF50
--secondary-color: #2196F3
--text-color: #333
--bg-color: #fff
--border-color: #e0e0e0

/* Dark Mode */
--primary-color: #66BB6A
--secondary-color: #42A5F5
--text-color: #e0e0e0
--bg-color: #1a1a1a
--border-color: #404040
```

### Spacing & Sizing

```css
--sidebar-width: 250px
--header-height: 70px
```

### Effects

```css
--shadow-sm: 0 2px 4px rgba(0,0,0,0.1)
--shadow-md: 0 4px 8px rgba(0,0,0,0.15)
--shadow-lg: 0 8px 16px rgba(0,0,0,0.2)
--transition-fast: 0.15s ease
--transition-normal: 0.3s ease
--transition-slow: 0.5s ease
```

## Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 480px) { }

/* Tablet */
@media (max-width: 768px) { }

/* Desktop */
@media (min-width: 769px) { }

/* Large Desktop */
@media (min-width: 1200px) { }
```

## Utility Classes

### Text Alignment
```html
<div class="text-center">Centered text</div>
<div class="text-left">Left-aligned text</div>
<div class="text-right">Right-aligned text</div>
```

### Spacing
```html
<!-- Margin Top -->
<div class="mt-1">0.5rem margin top</div>
<div class="mt-2">1rem margin top</div>
<div class="mt-3">1.5rem margin top</div>
<div class="mt-4">2rem margin top</div>

<!-- Margin Bottom -->
<div class="mb-1">0.5rem margin bottom</div>
<div class="mb-2">1rem margin bottom</div>
<div class="mb-3">1.5rem margin bottom</div>
<div class="mb-4">2rem margin bottom</div>

<!-- Padding -->
<div class="p-1">0.5rem padding</div>
<div class="p-2">1rem padding</div>
<div class="p-3">1.5rem padding</div>
<div class="p-4">2rem padding</div>
```

### Display
```html
<div class="d-none">Hidden</div>
<div class="d-block">Block display</div>
<div class="d-flex">Flex display</div>
<div class="d-grid">Grid display</div>

<!-- Responsive Display -->
<div class="d-md-none">Hidden on tablet and below</div>
<div class="d-sm-none">Hidden on mobile</div>
```

### Screen Reader Only
```html
<span class="sr-only">This text is only for screen readers</span>
```

## Component Classes

### Buttons

```html
<a href="#" class="btn btn-primary">Primary Button</a>
<a href="#" class="btn btn-secondary">Secondary Button</a>
```

### Alerts

```html
<div class="alert alert-info">
  <i class="fas fa-info-circle"></i>
  <div class="alert-content">
    <div class="alert-title">Info</div>
    <p>Information message</p>
  </div>
</div>

<div class="alert alert-warning">...</div>
<div class="alert alert-error">...</div>
<div class="alert alert-success">...</div>
```

### Feature Cards

```html
<div class="features">
  <div class="feature-card">
    <i class="fas fa-bolt"></i>
    <h3>Feature Title</h3>
    <p>Feature description</p>
  </div>
</div>
```

### Page Cards

```html
<div class="page-list">
  <div class="page-card">
    <h3><a href="#">Page Title</a></h3>
    <p>Page description</p>
  </div>
</div>
```

## Dark Mode

### Manual Toggle

```html
<button id="theme-toggle" class="theme-toggle" aria-label="Toggle dark mode">
  <i class="fas fa-moon"></i>
</button>
```

### JavaScript API

```javascript
// Get current theme
const theme = document.documentElement.getAttribute('data-theme');

// Set theme
document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.setAttribute('data-theme', 'light');

// Save to localStorage
localStorage.setItem('theme', 'dark');
```

### CSS Targeting

```css
/* Target dark mode */
[data-theme="dark"] .my-element {
  background: #2d2d2d;
}

/* Target light mode */
[data-theme="light"] .my-element {
  background: #fff;
}

/* System preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .my-element {
    background: #2d2d2d;
  }
}
```

## Code Blocks

### Basic Usage

```markdown
```typescript
const example = 'code';
```
```

### Features

- **Copy Button**: Automatically added to all code blocks
- **Line Numbers**: Added to blocks with 4+ lines
- **Language Label**: Shows programming language
- **Syntax Highlighting**: Basic token highlighting
- **Mobile Scrolling**: Horizontal scroll enabled

### Disable Line Numbers

```html
<pre><code class="no-line-numbers">
// Code without line numbers
</code></pre>
```

## Mobile Menu

### HTML Structure

```html
<button id="mobile-menu-toggle" class="mobile-menu-toggle">
  <i class="fas fa-bars"></i>
</button>

<div class="navbar-menu">
  <a href="#" class="nav-link">Link 1</a>
  <a href="#" class="nav-link">Link 2</a>
</div>
```

### JavaScript

```javascript
// Toggle menu
document.getElementById('mobile-menu-toggle').addEventListener('click', function() {
  document.querySelector('.navbar-menu').classList.toggle('active');
});
```

## Accessibility

### Skip to Main Content

```html
<a href="#main-content" class="skip-to-main">Skip to main content</a>
<main id="main-content">...</main>
```

### Focus Indicators

All interactive elements have visible focus indicators:
- 2px solid outline in primary color
- 2px offset from element

### ARIA Labels

```html
<button aria-label="Close dialog">×</button>
<img src="..." alt="Descriptive text">
<nav aria-label="Main navigation">...</nav>
```

## Responsive Images

### Basic Image

```html
<img src="/images/example.svg" alt="Description" loading="lazy">
```

### Pattern Diagram

```html
<div class="pattern-diagram">
  <div class="diagram-container">
    <img src="/images/pattern.svg" alt="Pattern diagram">
  </div>
  <p class="diagram-caption">Caption text</p>
</div>
```

## Typography Scale

### Desktop
- H1: 2.5rem
- H2: 2rem
- H3: 1.5rem
- Body: 1rem (16px)
- Small: 0.9rem

### Tablet (≤768px)
- H1: 2rem
- H2: 1.75rem
- H3: 1.25rem

### Mobile (≤480px)
- H1: 1.75rem
- H2: 1.5rem
- H3: 1.25rem

## Grid Layouts

### Feature Grid

```html
<div class="features">
  <div class="feature-card">...</div>
  <div class="feature-card">...</div>
  <div class="feature-card">...</div>
</div>
```

Automatically adapts:
- Desktop: 3 columns
- Tablet: 2 columns
- Mobile: 1 column

## Performance Tips

1. **Use CSS Custom Properties**: Easier theming and maintenance
2. **Minimize Reflows**: Use transforms instead of position changes
3. **Lazy Load Images**: Add `loading="lazy"` attribute
4. **Optimize Animations**: Use `will-change` sparingly
5. **Reduce Motion**: Respect `prefers-reduced-motion`

## Browser Support

### Required Features
- CSS Custom Properties
- CSS Grid
- Flexbox
- Clipboard API (with fallback)
- localStorage

### Minimum Versions
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Testing

### Test Pages
- `/static/test-responsive.html` - Responsive layout testing
- `/static/test-code-blocks.html` - Code block feature testing

### Manual Testing Checklist
- [ ] Test on mobile device (not just browser dev tools)
- [ ] Test dark mode toggle
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Test code block copy functionality
- [ ] Test mobile menu
- [ ] Verify no horizontal scroll on mobile

## Common Issues

### Issue: Horizontal scroll on mobile
**Solution**: Check for fixed-width elements, use `max-width: 100%`

### Issue: Dark mode not persisting
**Solution**: Verify localStorage is enabled, check browser console

### Issue: Copy button not working
**Solution**: Ensure HTTPS connection, check Clipboard API support

### Issue: Line numbers misaligned
**Solution**: Verify consistent font-family and line-height

## Resources

- [MDN: CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [MDN: Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)

## Support

For issues or questions:
1. Check the test pages for examples
2. Review the implementation summary
3. Check browser console for errors
4. Verify browser compatibility
