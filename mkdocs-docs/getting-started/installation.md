---
title: Installation
description: Install ddb-lib packages
---

# Installation

Install the packages you need based on your use case.

## For standalone applications

Install the client package (includes core and stats):

```bash
npm install @ddb-lib/client
```

Install AWS SDK peer dependencies:

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## For Amplify applications

Install the Amplify integration package:

```bash
npm install @ddb-lib/amplify
```

Amplify should already be installed in your project.

## For custom implementations

Install only the utilities you need:

```bash
# Just pattern helpers
npm install @ddb-lib/core

# Pattern helpers + monitoring
npm install @ddb-lib/core @ddb-lib/stats
```

## Verify installation

Create a test file to verify installation:

```typescript
// test.ts
import { PatternHelpers } from '@ddb-lib/core'

const key = PatternHelpers.entityKey('USER', '123')
console.log(key) // Should print: USER#123
```

Run it:

```bash
npx tsx test.ts
```

## TypeScript configuration

Ensure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true
  }
}
```

## Troubleshooting

### Module not found

If you see "Cannot find module '@ddb-lib/core'":

1. Check that the package is in `package.json`
2. Run `npm install` again
3. Clear `node_modules` and reinstall

### TypeScript errors

If you see TypeScript errors:

1. Ensure TypeScript >= 5.0.0
2. Check `tsconfig.json` settings
3. Restart your IDE/editor

### AWS SDK errors

If you see AWS SDK errors with `@ddb-lib/client`:

```bash
# Make sure peer dependencies are installed
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## Next steps

- [Standalone Quick Start](standalone.md)
- [Amplify Quick Start](amplify/)
- [Build Your First App](first-app.md)
