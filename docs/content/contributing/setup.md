---
title: "Development Setup"
linkTitle: "Setup"
weight: 10
description: "Set up your local development environment for contributing to ddb-lib"
type: docs
---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18 or higher
- **npm**: v9 or higher (comes with Node.js)
- **Git**: For version control
- **Hugo**: v0.120.0 or higher (for documentation development)
- **Code Editor**: VS Code, WebStorm, or your preferred editor

## Initial Setup

### 1. Fork and Clone the Repository

First, fork the repository on GitHub, then clone your fork:

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/ddb-lib.git
cd ddb-lib

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/ddb-lib.git
```

### 2. Install Dependencies

Install all project dependencies:

```bash
# Install root dependencies
npm install

# Install documentation dependencies
cd docs
npm install
cd ..
```

### 3. Verify Installation

Run the tests to ensure everything is set up correctly:

```bash
# Run all tests
npm test

# Run tests for a specific package
npm test -- packages/core
```

## Hugo Installation

To work on documentation, you need Hugo installed locally.

### macOS

Using Homebrew:

```bash
brew install hugo
```

### Linux

Using package manager (Ubuntu/Debian):

```bash
sudo apt-get install hugo
```

Or download from [Hugo releases](https://github.com/gohugoio/hugo/releases).

### Windows

Using Chocolatey:

```bash
choco install hugo-extended
```

Or download from [Hugo releases](https://github.com/gohugoio/hugo/releases).

### Verify Hugo Installation

```bash
hugo version
# Should show v0.120.0 or higher
```

## Local Development Workflow

### Working on Code

#### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

#### 2. Make Your Changes

Edit files in the appropriate package:

- `packages/core/` - Core utilities and helpers
- `packages/client/` - DynamoDB client wrapper
- `packages/stats/` - Statistics and monitoring
- `packages/amplify/` - Amplify integration

#### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests for specific package
npm test -- packages/core

# Run integration tests
npm run test:integration
```

#### 4. Build the Project

```bash
# Build all packages
npm run build

# Build specific package
npm run build -- --filter=@ddb-lib/core
```

#### 5. Lint Your Code

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Working on Documentation

#### 1. Start Hugo Development Server

```bash
cd docs
hugo server -D
```

The documentation site will be available at `http://localhost:1313/`.

#### 2. Make Your Changes

Edit Markdown files in `docs/content/`:

- Add new pages
- Update existing content
- Add images to `docs/static/images/`
- Update shortcodes in `docs/layouts/shortcodes/`

#### 3. Preview Changes

Hugo automatically reloads when you save files. Check your browser to see changes immediately.

#### 4. Build Documentation

```bash
# Build production site
hugo --minify

# Output will be in docs/public/
```

## Project Structure

```
ddb-lib/
├── packages/              # Monorepo packages
│   ├── core/             # Core utilities
│   ├── client/           # DynamoDB client
│   ├── stats/            # Statistics
│   └── amplify/          # Amplify integration
├── docs/                 # Documentation site
│   ├── content/          # Markdown content
│   ├── static/           # Static assets
│   ├── layouts/          # Hugo layouts
│   └── themes/           # Hugo themes
├── examples/             # Example code
└── src/                  # Legacy source (being migrated)
```

## Common Tasks

### Adding a New Feature

1. Create a feature branch
2. Implement the feature with tests
3. Update documentation
4. Add examples if applicable
5. Run all tests and linting
6. Commit and push
7. Open a pull request

### Fixing a Bug

1. Create a bug fix branch
2. Write a failing test that reproduces the bug
3. Fix the bug
4. Ensure the test passes
5. Run all tests
6. Commit and push
7. Open a pull request

### Updating Documentation

1. Create a documentation branch
2. Make your changes in `docs/content/`
3. Preview with `hugo server`
4. Build with `hugo --minify`
5. Commit and push
6. Open a pull request

## Troubleshooting

### Hugo Not Found

**Problem**: `hugo: command not found`

**Solution**: Install Hugo following the installation instructions above. Ensure it's in your PATH.

### Module Not Found Errors

**Problem**: `Cannot find module '@ddb-lib/core'`

**Solution**: 
```bash
# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild packages
npm run build
```

### Test Failures

**Problem**: Tests fail after pulling latest changes

**Solution**:
```bash
# Update dependencies
npm install

# Rebuild all packages
npm run build

# Run tests again
npm test
```

### Hugo Build Errors

**Problem**: Hugo fails to build documentation

**Solution**:
```bash
# Check Hugo version
hugo version

# Clean Hugo cache
cd docs
rm -rf public resources .hugo_build.lock

# Rebuild
hugo --minify
```

### Port Already in Use

**Problem**: `Error: port 1313 already in use`

**Solution**:
```bash
# Use a different port
hugo server -p 1314

# Or kill the process using port 1313
lsof -ti:1313 | xargs kill -9
```

### Submodule Issues

**Problem**: Theme not loading or submodule errors

**Solution**:
```bash
# Initialize and update submodules
git submodule update --init --recursive

# If still having issues, re-clone the submodule
cd docs/themes
rm -rf docsy
git submodule add https://github.com/google/docsy.git docsy
cd docsy
npm install
```

## Getting Help

If you encounter issues not covered here:

1. Check existing [GitHub Issues](https://github.com/yourusername/ddb-lib/issues)
2. Search [GitHub Discussions](https://github.com/yourusername/ddb-lib/discussions)
3. Open a new issue with:
   - Your environment details (OS, Node version, Hugo version)
   - Steps to reproduce the problem
   - Error messages or logs
   - What you've already tried

## Next Steps

Once your environment is set up:

- Read the [Documentation Guide](/contributing/documentation/) to learn about writing docs
- Check out [open issues](https://github.com/yourusername/ddb-lib/issues) labeled "good first issue"
- Join discussions and ask questions
- Start contributing!

Happy coding! 🚀
