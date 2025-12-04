---
title: "Standalone Examples"
weight: 10
description: "Examples using @ddb-lib/client without AWS Amplify"
type: docs
---

# Standalone Examples

Complete examples demonstrating how to use `@ddb-lib/client` for standalone DynamoDB operations.

All example source code is available in the [GitHub repository](https://github.com/gxclarke/ddb-lib/tree/main/examples/standalone).

## Available Examples

- [Basic CRUD Operations](basic-crud/) - Fundamental create, read, update, delete operations
- [Single-Table Design](single-table-design/) - Multi-entity single-table patterns
- [Statistics and Monitoring](stats-monitoring/) - Performance monitoring and optimization

## Running Examples

```bash
# Clone the repository
git clone https://github.com/gxclarke/ddb-lib.git
cd ddb-lib

# Install dependencies
npm install

# Run an example
npx tsx examples/standalone/basic-crud.ts
```
