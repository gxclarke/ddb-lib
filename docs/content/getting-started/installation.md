---
title: "Installation"
description: "Install ddb-lib packages"
weight: 10
---

# Installation

Install the packages you need based on your use case.

## For Standalone Applications

Install the client package (includes core and stats):

```bash
npm install @ddb-lib/client
```

Install AWS SDK peer dependencies:

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## For Amplify Applications

Install the Amplify integration package:

```bash
npm install @ddb-lib/amplify
```

Amplify should already be installed in your project.

## For Custom Implementations

Install only the utilities you need:

```bash
# Just pattern helpers
npm install @ddb-lib/core

# Pattern helpers + monitoring
npm install @ddb-lib/core @ddb-lib/stats
```

## Verify Installation

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

## TypeScript Configuration

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

### Module Not Found

If you see "Cannot find module '@ddb-lib/core'":

1. Check that the package is in `package.json`
2. Run `npm install` again
3. Clear `node_modules` and reinstall

### TypeScript Errors

If you see TypeScript errors:

1. Ensure TypeScript >= 5.0.0
2. Check `tsconfig.json` settings
3. Restart your IDE/editor

### AWS SDK Errors

If you see AWS SDK errors with `@ddb-lib/client`:

```bash
# Make sure peer dependencies are installed
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## Next Steps

- [Standalone Quick Start](/getting-started/standalone/)
- [Amplify Quick Start](/getting-started/amplify/)
- [Build Your First App](/getting-started/first-app/)
