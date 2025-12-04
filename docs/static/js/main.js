// Theme management
(function() {
    // Get saved theme or default to system preference
    function getTheme() {
        const saved = localStorage.getItem('theme');
        if (saved) return saved;
        
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }
    
    // Apply theme
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update toggle button icon
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }
    
    // Initialize theme on page load
    applyTheme(getTheme());
    
    // Listen for system theme changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    // Theme toggle functionality
    document.addEventListener('DOMContentLoaded', function() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                applyTheme(newTheme);
            });
        }
    });
})();

// Mobile menu toggle with accessibility
document.addEventListener('DOMContentLoaded', function() {
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const navbarMenu = document.querySelector('.navbar-menu');
    
    if (mobileToggle && navbarMenu) {
        mobileToggle.addEventListener('click', function() {
            const isExpanded = navbarMenu.classList.contains('active');
            navbarMenu.classList.toggle('active');
            
            // Update ARIA attributes
            this.setAttribute('aria-expanded', !isExpanded);
            
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = navbarMenu.classList.contains('active') 
                    ? 'fas fa-times' 
                    : 'fas fa-bars';
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mobileToggle.contains(e.target) && !navbarMenu.contains(e.target)) {
                navbarMenu.classList.remove('active');
                mobileToggle.setAttribute('aria-expanded', 'false');
                const icon = mobileToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            }
        });
        
        // Close menu on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navbarMenu.classList.contains('active')) {
                navbarMenu.classList.remove('active');
                mobileToggle.setAttribute('aria-expanded', 'false');
                const icon = mobileToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
                mobileToggle.focus(); // Return focus to toggle button
            }
        });
    }
});

// Enhanced code block functionality
document.addEventListener('DOMContentLoaded', function() {
    // Add copy buttons and line numbers to code blocks
    document.querySelectorAll('pre code').forEach(function(codeBlock) {
        const pre = codeBlock.parentElement;
        
        // Skip if already processed
        if (pre.classList.contains('code-enhanced')) {
            return;
        }
        
        pre.classList.add('code-enhanced');
        pre.style.position = 'relative';
        
        // Create copy button
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.innerHTML = '<i class="far fa-copy"></i> Copy';
        button.setAttribute('aria-label', 'Copy code to clipboard');
        
        button.addEventListener('click', function() {
            const code = codeBlock.textContent;
            
            // Use Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(code).then(function() {
                    button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    button.classList.add('copied');
                    setTimeout(function() {
                        button.innerHTML = '<i class="far fa-copy"></i> Copy';
                        button.classList.remove('copied');
                    }, 2000);
                }).catch(function(err) {
                    console.error('Failed to copy:', err);
                    button.innerHTML = '<i class="fas fa-times"></i> Failed';
                    setTimeout(function() {
                        button.innerHTML = '<i class="far fa-copy"></i> Copy';
                    }, 2000);
                });
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = code;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    button.classList.add('copied');
                    setTimeout(function() {
                        button.innerHTML = '<i class="far fa-copy"></i> Copy';
                        button.classList.remove('copied');
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                    button.innerHTML = '<i class="fas fa-times"></i> Failed';
                    setTimeout(function() {
                        button.innerHTML = '<i class="far fa-copy"></i> Copy';
                    }, 2000);
                }
                document.body.removeChild(textArea);
            }
        });
        
        pre.appendChild(button);
        
        // Add line numbers if not already present
        if (!pre.querySelector('.line-numbers') && !codeBlock.classList.contains('no-line-numbers')) {
            addLineNumbers(codeBlock);
        }
        
        // Ensure horizontal scrolling on mobile
        pre.style.overflowX = 'auto';
        pre.style.webkitOverflowScrolling = 'touch'; // Smooth scrolling on iOS
        
        // Add language label if available
        const language = getLanguageFromClass(codeBlock);
        if (language) {
            const langLabel = document.createElement('span');
            langLabel.className = 'code-language-label';
            langLabel.textContent = language;
            langLabel.setAttribute('aria-label', `Code language: ${language}`);
            pre.appendChild(langLabel);
        }
    });
});

// Add line numbers to code block
function addLineNumbers(codeBlock) {
    const code = codeBlock.textContent;
    const lines = code.split('\n');
    
    // Don't add line numbers for very short code blocks
    if (lines.length <= 3) {
        return;
    }
    
    const lineNumbersDiv = document.createElement('div');
    lineNumbersDiv.className = 'line-numbers';
    lineNumbersDiv.setAttribute('aria-hidden', 'true');
    
    for (let i = 1; i <= lines.length; i++) {
        const lineNumber = document.createElement('span');
        lineNumber.textContent = i;
        lineNumbersDiv.appendChild(lineNumber);
    }
    
    const pre = codeBlock.parentElement;
    pre.insertBefore(lineNumbersDiv, codeBlock);
    pre.classList.add('has-line-numbers');
}

// Extract language from code block class
function getLanguageFromClass(codeBlock) {
    const classes = codeBlock.className.split(' ');
    for (const cls of classes) {
        if (cls.startsWith('language-')) {
            return cls.replace('language-', '');
        }
        if (cls.startsWith('lang-')) {
            return cls.replace('lang-', '');
        }
    }
    return null;
}

// Syntax highlighting enhancement (if Prism or highlight.js is not loaded)
function enhanceSyntaxHighlighting() {
    // Check if syntax highlighting library is already loaded
    if (window.Prism || window.hljs) {
        return;
    }
    
    // Basic syntax highlighting for common patterns
    document.querySelectorAll('pre code').forEach(function(codeBlock) {
        if (codeBlock.classList.contains('highlighted')) {
            return;
        }
        
        let code = codeBlock.innerHTML;
        
        // Highlight strings
        code = code.replace(/(['"`])(.*?)\1/g, '<span class="token string">$1$2$1</span>');
        
        // Highlight comments
        code = code.replace(/(\/\/.*$)/gm, '<span class="token comment">$1</span>');
        code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>');
        
        // Highlight keywords (basic set)
        const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'new', 'this'];
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
            code = code.replace(regex, '<span class="token keyword">$1</span>');
        });
        
        codeBlock.innerHTML = code;
        codeBlock.classList.add('highlighted');
    });
}

// Image handling and accessibility

document.addEventListener('DOMContentLoaded', function() {
    
    // Copy code button functionality
    const copyButtons = document.querySelectorAll('.copy-button');
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const codeBlock = this.parentElement.querySelector('code');
            const text = codeBlock.textContent;
            
            navigator.clipboard.writeText(text).then(() => {
                const originalText = this.textContent;
                this.textContent = '✓ Copied!';
                setTimeout(() => {
                    this.textContent = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
            });
        });
    });
    
    // Add loading="lazy" to images for performance
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (!img.hasAttribute('loading')) {
            img.setAttribute('loading', 'lazy');
        }
    });
    
    // Ensure all images have alt text (development check)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        images.forEach(img => {
            if (!img.hasAttribute('alt') || img.getAttribute('alt') === '') {
                console.warn('Image missing alt text:', img.src);
            }
        });
    }
    
    // Add click-to-zoom functionality for diagrams
    const diagrams = document.querySelectorAll('.pattern-diagram img, .pattern-diagram svg');
    diagrams.forEach(diagram => {
        diagram.style.cursor = 'pointer';
        diagram.setAttribute('role', 'button');
        diagram.setAttribute('tabindex', '0');
        diagram.setAttribute('aria-label', 'Click to view full size');
        
        const openModal = () => {
            const modal = document.createElement('div');
            modal.className = 'image-modal';
            modal.innerHTML = `
                <div class="modal-backdrop">
                    <div class="modal-content">
                        <button class="modal-close" aria-label="Close">&times;</button>
                        ${diagram.outerHTML}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';
            
            const closeModal = () => {
                document.body.removeChild(modal);
                document.body.style.overflow = '';
            };
            
            modal.querySelector('.modal-close').addEventListener('click', closeModal);
            modal.querySelector('.modal-backdrop').addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-backdrop')) {
                    closeModal();
                }
            });
            
            // Close on Escape key
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', escHandler);
                }
            });
        };
        
        diagram.addEventListener('click', openModal);
        diagram.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal();
            }
        });
    });
    
    // Add styles for image modal
    if (!document.getElementById('image-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'image-modal-styles';
        style.textContent = `
            .image-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999;
            }
            
            .modal-backdrop {
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
            }
            
            .modal-content {
                position: relative;
                max-width: 95%;
                max-height: 95%;
                background: white;
                border-radius: 8px;
                padding: 2rem;
                overflow: auto;
            }
            
            .modal-close {
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                background: rgba(0, 0, 0, 0.5);
                color: white;
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                font-size: 1.5rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s;
                z-index: 1;
            }
            
            .modal-close:hover {
                background: rgba(0, 0, 0, 0.7);
            }
            
            .modal-content img,
            .modal-content svg {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 0 auto;
            }
            
            @media (max-width: 768px) {
                .modal-content {
                    padding: 1rem;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Observe images for lazy loading analytics
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    // Image is now visible
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px'
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
});

// Search functionality

let searchIndex = null;
let searchIndexLoaded = false;

// Load search index
async function loadSearchIndex() {
    if (searchIndexLoaded) return searchIndex;
    
    try {
        const response = await fetch('/index.json');
        searchIndex = await response.json();
        searchIndexLoaded = true;
        return searchIndex;
    } catch (error) {
        console.error('Failed to load search index:', error);
        return [];
    }
}

// Simple search function
function searchContent(query) {
    if (!query || query.length < 2) return [];
    
    const lowerQuery = query.toLowerCase();
    const results = [];
    
    searchIndex.forEach(page => {
        let score = 0;
        let matchedSnippet = '';
        
        // Search in title (higher weight)
        if (page.title && page.title.toLowerCase().includes(lowerQuery)) {
            score += 10;
        }
        
        // Search in description
        if (page.description && page.description.toLowerCase().includes(lowerQuery)) {
            score += 5;
            matchedSnippet = page.description;
        }
        
        // Search in content
        if (page.content && page.content.toLowerCase().includes(lowerQuery)) {
            score += 1;
            
            // Extract snippet around match
            const contentLower = page.content.toLowerCase();
            const matchIndex = contentLower.indexOf(lowerQuery);
            if (matchIndex !== -1) {
                const start = Math.max(0, matchIndex - 60);
                const end = Math.min(page.content.length, matchIndex + query.length + 60);
                matchedSnippet = (start > 0 ? '...' : '') + 
                                page.content.substring(start, end) + 
                                (end < page.content.length ? '...' : '');
            }
        }
        
        // Search in tags
        if (page.tags && Array.isArray(page.tags)) {
            page.tags.forEach(tag => {
                if (tag.toLowerCase().includes(lowerQuery)) {
                    score += 3;
                }
            });
        }
        
        if (score > 0) {
            results.push({
                ...page,
                score,
                snippet: matchedSnippet || page.description || page.content.substring(0, 150) + '...'
            });
        }
    });
    
    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);
    
    return results;
}

// Highlight search terms in text
function highlightText(text, query) {
    if (!text || !query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// Display search results in dropdown
function displaySearchResults(results, query, container) {
    if (results.length === 0) {
        container.innerHTML = '<div class="search-no-results">No results found</div>';
        return;
    }
    
    const maxResults = 5; // Show max 5 results in dropdown
    const html = results.slice(0, maxResults).map(result => `
        <div class="search-result-item" onclick="window.location.href='${result.url}'">
            <div class="search-result-title">${highlightText(result.title, query)}</div>
            <div class="search-result-section">${result.section || 'Documentation'}</div>
            <div class="search-result-snippet">${highlightText(result.snippet, query)}</div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Display search results on search page
function displaySearchPageResults(results, query, container) {
    if (results.length === 0) {
        container.innerHTML = '<div class="search-no-results">No results found for your query.</div>';
        return;
    }
    
    const statsHtml = `<div class="search-stats">Found ${results.length} result${results.length !== 1 ? 's' : ''}</div>`;
    
    const resultsHtml = results.map(result => `
        <div class="search-page-result">
            <h3><a href="${result.url}">${highlightText(result.title, query)}</a></h3>
            <div class="search-result-section">${result.section || 'Documentation'}</div>
            <div class="search-result-snippet">${highlightText(result.snippet, query)}</div>
        </div>
    `).join('');
    
    container.innerHTML = statsHtml + resultsHtml;
}

// Initialize navbar search
document.addEventListener('DOMContentLoaded', async function() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results');
    
    if (searchInput) {
        // Load search index
        await loadSearchIndex();
        
        let searchTimeout;
        
        // Search on input
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length < 2) {
                searchResults.style.display = 'none';
                return;
            }
            
            searchTimeout = setTimeout(() => {
                const results = searchContent(query);
                displaySearchResults(results, query, searchResults);
                searchResults.style.display = 'block';
            }, 300); // Debounce
        });
        
        // Search on button click
        searchButton.addEventListener('click', function() {
            const query = searchInput.value.trim();
            if (query.length >= 2) {
                window.location.href = `/search/?q=${encodeURIComponent(query)}`;
            }
        });
        
        // Search on Enter key
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query.length >= 2) {
                    window.location.href = `/search/?q=${encodeURIComponent(query)}`;
                }
            }
        });
        
        // Close results when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
        
        // Keyboard shortcut: Ctrl+K or Cmd+K to focus search
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }
    
    // Initialize search page
    const searchPageInput = document.getElementById('search-page-input');
    const searchPageButton = document.getElementById('search-page-button');
    const searchPageResults = document.getElementById('search-page-results');
    
    if (searchPageInput) {
        // Load search index
        await loadSearchIndex();
        
        // Get query from URL
        const urlParams = new URLSearchParams(window.location.search);
        const initialQuery = urlParams.get('q');
        
        if (initialQuery) {
            searchPageInput.value = initialQuery;
            performSearch(initialQuery);
        }
        
        function performSearch(query) {
            if (query.length < 2) {
                searchPageResults.innerHTML = '<p class="search-hint">Please enter at least 2 characters to search.</p>';
                return;
            }
            
            searchPageResults.innerHTML = '<div class="search-loading">Searching</div>';
            
            setTimeout(() => {
                const results = searchContent(query);
                displaySearchPageResults(results, query, searchPageResults);
                
                // Update URL without reload
                const newUrl = `${window.location.pathname}?q=${encodeURIComponent(query)}`;
                window.history.pushState({}, '', newUrl);
            }, 100);
        }
        
        // Search on input (with debounce)
        let searchTimeout;
        searchPageInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            searchTimeout = setTimeout(() => {
                performSearch(query);
            }, 300);
        });
        
        // Search on button click
        searchPageButton.addEventListener('click', function() {
            const query = searchPageInput.value.trim();
            performSearch(query);
        });
        
        // Search on Enter key
        searchPageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                performSearch(query);
            }
        });
    }
});

// Accessibility: Keyboard navigation improvements
document.addEventListener('DOMContentLoaded', function() {
    // Add visible focus indicators for keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-nav');
        }
    });
    
    document.addEventListener('mousedown', function() {
        document.body.classList.remove('keyboard-nav');
    });
    
    // Trap focus in modals
    document.addEventListener('keydown', function(e) {
        const modal = document.querySelector('.image-modal');
        if (!modal || e.key !== 'Tab') return;
        
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    });
    
    // Announce dynamic content changes to screen readers
    function announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    // Announce search results
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const resultsContainer = document.getElementById('search-results');
            if (resultsContainer && resultsContainer.style.display !== 'none') {
                const resultCount = resultsContainer.querySelectorAll('.search-result-item').length;
                announceToScreenReader(`${resultCount} search result${resultCount !== 1 ? 's' : ''} found`);
            }
        });
    }
    
    // Add keyboard shortcuts help
    document.addEventListener('keydown', function(e) {
        // Show keyboard shortcuts on '?' key
        if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const activeElement = document.activeElement;
            if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                showKeyboardShortcuts();
            }
        }
    });
    
    function showKeyboardShortcuts() {
        const shortcuts = [
            { key: 'Ctrl/Cmd + K', description: 'Focus search' },
            { key: 'Escape', description: 'Close modals and menus' },
            { key: 'Tab', description: 'Navigate forward' },
            { key: 'Shift + Tab', description: 'Navigate backward' },
            { key: '?', description: 'Show keyboard shortcuts' }
        ];
        
        const modal = document.createElement('div');
        modal.className = 'keyboard-shortcuts-modal';
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content" role="dialog" aria-labelledby="shortcuts-title" aria-modal="true">
                    <button class="modal-close" aria-label="Close">&times;</button>
                    <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Key</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${shortcuts.map(s => `
                                <tr>
                                    <td><kbd>${s.key}</kbd></td>
                                    <td>${s.description}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Focus the close button
        const closeButton = modal.querySelector('.modal-close');
        closeButton.focus();
        
        const closeModal = () => {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
        };
        
        closeButton.addEventListener('click', closeModal);
        modal.querySelector('.modal-backdrop').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                closeModal();
            }
        });
        
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }
    
    // Add styles for keyboard shortcuts modal
    if (!document.getElementById('keyboard-shortcuts-styles')) {
        const style = document.createElement('style');
        style.id = 'keyboard-shortcuts-styles';
        style.textContent = `
            .keyboard-shortcuts-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
            }
            
            .keyboard-shortcuts-modal .modal-content {
                max-width: 600px;
                padding: 2rem;
            }
            
            .keyboard-shortcuts-modal h2 {
                margin-bottom: 1.5rem;
                color: var(--text-color);
            }
            
            .keyboard-shortcuts-modal table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .keyboard-shortcuts-modal th,
            .keyboard-shortcuts-modal td {
                padding: 0.75rem;
                text-align: left;
                border-bottom: 1px solid var(--border-color);
            }
            
            .keyboard-shortcuts-modal th {
                font-weight: 600;
                background: var(--bg-color);
            }
            
            .keyboard-shortcuts-modal kbd {
                display: inline-block;
                padding: 0.25rem 0.5rem;
                background: #f5f5f5;
                border: 1px solid #ccc;
                border-radius: 3px;
                font-family: monospace;
                font-size: 0.9em;
            }
            
            /* Enhanced focus styles for keyboard navigation */
            body.keyboard-nav *:focus {
                outline: 3px solid var(--primary-color);
                outline-offset: 2px;
            }
            
            body.keyboard-nav button:focus,
            body.keyboard-nav a:focus,
            body.keyboard-nav input:focus,
            body.keyboard-nav select:focus,
            body.keyboard-nav textarea:focus {
                outline: 3px solid var(--primary-color);
                outline-offset: 2px;
            }
        `;
        document.head.appendChild(style);
    }
});
