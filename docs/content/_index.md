---
title: "ddb-lib"
linkTitle: "Documentation"
description: "Modular TypeScript library for AWS DynamoDB with best practices, pattern helpers, and performance monitoring"
type: docs
---

{{< blocks/cover title="ddb-lib" image_anchor="top" height="full" color="primary" >}}
<div class="mx-auto">
	<a class="btn btn-lg btn-primary mr-3 mb-4" href="{{< relref "/getting-started" >}}">
		Get Started <i class="fas fa-arrow-alt-circle-right ml-2"></i>
	</a>
	<a class="btn btn-lg btn-secondary mr-3 mb-4" href="https://github.com/gxclarke/ddb-lib">
		GitHub <i class="fab fa-github ml-2 "></i>
	</a>
	<p class="lead mt-5">A modular TypeScript library that makes working with AWS DynamoDB easier, faster, and more reliable.</p>
	{{< blocks/link-down color="info" >}}
</div>
{{< /blocks/cover >}}

{{% blocks/lead color="primary" %}}
Whether you're building with standalone DynamoDB or AWS Amplify Gen 2, ddb-lib provides the tools you need to implement best practices and avoid common pitfalls.

**Modular • Type-Safe • Performance-Focused**
{{% /blocks/lead %}}

{{< blocks/section color="dark" >}}
{{% blocks/feature icon="fa-lightbulb" title="Modular Architecture" %}}
Install only what you need. Use core utilities standalone, add monitoring, or integrate with Amplify.
{{% /blocks/feature %}}

{{% blocks/feature icon="fa-chart-line" title="Performance Monitoring" %}}
Built-in statistics collection, anti-pattern detection, and actionable recommendations.
{{% /blocks/feature %}}

{{% blocks/feature icon="fa-shield-alt" title="Best Practices Built-In" %}}
Pattern helpers, multi-attribute keys, and utilities that guide you toward optimal DynamoDB usage.
{{% /blocks/feature %}}

{{% blocks/feature icon="fa-code" title="Type Safe" %}}
Full TypeScript support with type inference and validation throughout.
{{% /blocks/feature %}}

{{% blocks/feature icon="fa-puzzle-piece" title="DynamoDB Patterns" %}}
Learn and implement proven DynamoDB design patterns with helper functions.
{{% /blocks/feature %}}

{{% blocks/feature icon="fa-rocket" title="Quick Start" %}}
Get up and running in minutes with comprehensive guides and examples.
{{% /blocks/feature %}}

{{< /blocks/section >}}

{{< blocks/section >}}
<div class="col-12">
<h2 class="text-center">Package Overview</h2>
</div>

{{% blocks/feature icon="fa-cube" title="@ddb-lib/core" url="/api/core/" %}}
Pattern helpers and utilities for DynamoDB best practices.

```bash
npm install @ddb-lib/core
```
{{% /blocks/feature %}}

{{% blocks/feature icon="fa-chart-bar" title="@ddb-lib/stats" url="/api/stats/" %}}
Performance monitoring and anti-pattern detection.

```bash
npm install @ddb-lib/stats
```
{{% /blocks/feature %}}

{{% blocks/feature icon="fa-database" title="@ddb-lib/client" url="/api/client/" %}}
Standalone DynamoDB client with monitoring.

```bash
npm install @ddb-lib/client
```
{{% /blocks/feature %}}

{{% blocks/feature icon="fa-aws" title="@ddb-lib/amplify" url="/api/amplify/" %}}
Seamless Amplify Gen 2 integration.

```bash
npm install @ddb-lib/amplify
```
{{% /blocks/feature %}}

{{< /blocks/section >}}

{{< blocks/section color="white" >}}
<div class="col-12">
<h2 class="text-center mb-5">Quick Examples</h2>
</div>

<div class="col-lg-6">
<h3>Standalone Usage</h3>

```typescript
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

const table = new TableClient({
  tableName: 'users',
  statsConfig: { enabled: true }
})

// Use pattern helpers
const userKey = PatternHelpers.entityKey('USER', '123')

// Perform operations
await table.put({ 
  pk: userKey, 
  sk: 'PROFILE', 
  name: 'Alice' 
})

// Get recommendations
const recommendations = table.getRecommendations()
```
</div>

<div class="col-lg-6">
<h3>Amplify Integration</h3>

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'

const client = generateClient()
const monitor = new AmplifyMonitor({ 
  statsConfig: { enabled: true } 
})

// Wrap your model
const monitoredTodos = monitor.wrap(
  client.models.Todo
)

// Operations are automatically monitored
await monitoredTodos.create({ 
  title: 'Buy groceries' 
})

// Get insights
const stats = monitor.getStats()
```
</div>

{{< /blocks/section >}}

{{< blocks/section color="primary" >}}
<div class="col-12 text-center">
<h2>Ready to Get Started?</h2>
<p class="lead">Choose your path and start building better DynamoDB applications today.</p>
<div class="mt-4">
<a class="btn btn-lg btn-light mr-3 mb-3" href="{{< relref "/getting-started" >}}">
  <i class="fas fa-rocket mr-2"></i>Getting Started
</a>
<a class="btn btn-lg btn-light mr-3 mb-3" href="{{< relref "/patterns" >}}">
  <i class="fas fa-puzzle-piece mr-2"></i>Learn Patterns
</a>
<a class="btn btn-lg btn-light mr-3 mb-3" href="{{< relref "/examples" >}}">
  <i class="fas fa-code mr-2"></i>View Examples
</a>
</div>
</div>
{{< /blocks/section >}}
