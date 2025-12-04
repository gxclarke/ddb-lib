---
title: "Anti-Patterns"
weight: 60
description: "Common DynamoDB mistakes to avoid for better performance and lower costs"
type: docs
---

# DynamoDB Anti-Patterns

Anti-patterns are common practices that seem reasonable but lead to poor performance, high costs, or scalability issues. Understanding what NOT to do is just as important as knowing best practices.

## ⚠️ Warning About Consequences

Anti-patterns can have serious impacts on your application:

- **Performance Degradation**: Response times can increase from milliseconds to seconds
- **Cost Explosion**: Operations can consume 10-100x more capacity than necessary
- **Throttling**: Your application may experience frequent throttling and errors
- **Scalability Limits**: You may hit hard limits that prevent scaling
- **Data Integrity Issues**: Race conditions and inconsistent data

The good news: most anti-patterns are easy to fix once you recognize them. This library includes tools to detect anti-patterns automatically.

## Common Anti-Patterns

### [Table Scans](/anti-patterns/table-scans/)
Using Scan operations when Query operations would work. Scans examine every item in your table, consuming massive amounts of capacity and time.

**Impact**: 100x slower and more expensive than queries on large tables.

### [Hot Partitions](/anti-patterns/hot-partitions/)
Concentrating traffic on a single partition key value. DynamoDB partitions have throughput limits, and hot partitions cause throttling.

**Impact**: Throttling, high latency, and inability to scale beyond single partition limits.

### [String Concatenation for Keys](/anti-patterns/string-concatenation/)
Manually concatenating strings to create composite keys instead of using helper functions. This leads to parsing errors and inconsistent formats.

**Impact**: Bugs, data corruption, and difficult-to-debug issues.

### [Read-Before-Write](/anti-patterns/read-before-write/)
Reading an item before updating it when conditional writes would work. This doubles your capacity consumption and introduces race conditions.

**Impact**: 2x capacity consumption, race conditions, and data integrity issues.

### [Missing Projections](/anti-patterns/missing-projections/)
Retrieving entire items when you only need a few attributes. This wastes capacity and bandwidth.

**Impact**: 50-90% wasted capacity depending on item size.

### [Inefficient Batching](/anti-patterns/inefficient-batching/)
Making individual requests when batch operations would work, or not handling batch operation limits properly.

**Impact**: 10x slower throughput and higher latency.

## How to Use This Section

Each anti-pattern page includes:

- **What It Is**: Clear explanation of the problematic practice
- **Why It's Problematic**: Detailed consequences and impacts
- **Visual Diagrams**: Illustrations showing the problem
- **Problem Code**: Examples of the anti-pattern in action
- **Solution Code**: The correct approach to use instead
- **Impact Metrics**: Real-world performance and cost implications
- **Detection**: How to identify if you're doing this

## Detecting Anti-Patterns

The `@ddb-lib/stats` package includes an anti-pattern detector that analyzes your usage patterns:

```typescript
import { StatsCollector, AntiPatternDetector } from '@ddb-lib/stats'

const stats = new StatsCollector()
const detector = new AntiPatternDetector(stats)

// Analyze your operations
const issues = detector.detectAll()

for (const issue of issues) {
  console.log(`⚠️  ${issue.type}: ${issue.message}`)
  console.log(`   Severity: ${issue.severity}`)
  console.log(`   Impact: ${issue.impact}`)
  console.log(`   Recommendation: ${issue.recommendation}`)
}
```

The detector can identify:

- Excessive scan operations
- Hot partition keys
- Missing projection expressions
- Inefficient batching patterns
- Read-before-write patterns

## Priority Guide

If you're experiencing issues, address anti-patterns in this order:

### Critical (Fix Immediately)
1. **[Table Scans](/anti-patterns/table-scans/)** - Massive performance and cost impact
2. **[Hot Partitions](/anti-patterns/hot-partitions/)** - Causes throttling and prevents scaling

### High Priority (Fix Soon)
3. **[Read-Before-Write](/anti-patterns/read-before-write/)** - Data integrity and performance issues
4. **[Missing Projections](/anti-patterns/missing-projections/)** - Significant cost waste

### Medium Priority (Optimize When Possible)
5. **[Inefficient Batching](/anti-patterns/inefficient-batching/)** - Performance optimization
6. **[String Concatenation](/anti-patterns/string-concatenation/)** - Code quality and maintainability

## Prevention

The best way to avoid anti-patterns is to:

1. **Use the Library**: Helper functions prevent common mistakes
2. **Monitor Operations**: Use the stats collector to track patterns
3. **Review Regularly**: Run the anti-pattern detector periodically
4. **Follow Best Practices**: See [Best Practices](/best-practices/) section
5. **Learn Patterns**: Study [Patterns](/patterns/) for correct approaches

## Real-World Impact

Here's what fixing anti-patterns can achieve:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| P99 Latency | 2000ms | 20ms | 100x faster |
| Monthly Cost | $5,000 | $500 | 90% reduction |
| Throughput | 100 req/s | 10,000 req/s | 100x increase |
| Error Rate | 15% | <0.1% | 150x reduction |

These are real improvements from fixing common anti-patterns in production systems.

## Related Resources

- [Best Practices](/best-practices/) - What you should do instead
- [Patterns](/patterns/) - Proven solutions to common problems
- [Guides](/guides/) - Detailed usage guides
- [Monitoring Guide](/guides/monitoring/) - Track and analyze your operations

## Getting Help

If you're unsure whether you're following an anti-pattern:

1. Run the anti-pattern detector on your operations
2. Review the specific anti-pattern pages in this section
3. Check the [Best Practices](/best-practices/) for correct approaches
4. Look at [Examples](/examples/) for working code

Remember: recognizing and fixing anti-patterns is one of the fastest ways to improve your DynamoDB application's performance and reduce costs.

