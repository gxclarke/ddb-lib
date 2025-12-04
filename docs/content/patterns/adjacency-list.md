---
title: "Adjacency List Pattern"
description: "Modeling graph relationships and many-to-many connections in DynamoDB"
type: docs
weight: 50
---

# Adjacency List Pattern

## What is it?

The adjacency list pattern is designed for modeling graph-like relationships where items can have multiple connections to other items. This pattern stores relationships by using one item's ID as the partition key and the related item's ID as the sort key.

Common examples include:
- Social networks (followers, friends)
- Recommendation systems (users who liked this also liked...)
- Network topology (connected devices)
- Knowledge graphs (related concepts)
- Many-to-many relationships (students-courses, tags-posts)

The pattern uses the format:
- `pk: SOURCE_ID, sk: TARGET_ID` for the relationship
- Optionally store the inverse: `pk: TARGET_ID, sk: SOURCE_ID`

## Why is it important?

### Efficient Relationship Queries
The adjacency list pattern enables efficient queries for all relationships of a given item:

```typescript
// Get all followers of a user
pk: 'USER#alice', sk: { beginsWith: 'USER#' }

// Get all posts with a specific tag
pk: 'TAG#javascript', sk: { beginsWith: 'POST#' }
```

### Bidirectional Relationships
By storing both directions of a relationship, you can efficiently query in either direction without additional indexes.

### Many-to-Many Support
Unlike hierarchical patterns, adjacency lists naturally support many-to-many relationships where items can have multiple parents or children.

### Graph Traversal
The pattern enables efficient graph traversal operations like finding friends-of-friends or related items.

## Visual Representation

{{< pattern-diagram mermaid="true" caption="Adjacency List Structure" >}}
graph LR
    Alice[USER#alice] -->|follows| Bob[USER#bob]
    Alice -->|follows| Carol[USER#carol]
    Bob -->|follows| Carol
    Carol -->|follows| Alice
    style Alice fill:#4CAF50
    style Bob fill:#2196F3
    style Carol fill:#FF9800
{{< /pattern-diagram >}}

### Bidirectional Relationships

{{< pattern-diagram mermaid="true" caption="Storing Both Directions" >}}
graph TD
    subgraph "Forward: Alice follows Bob"
    F1[pk: USER#alice]
    F2[sk: USER#bob]
    F1 --> F2
    end
    subgraph "Reverse: Bob followed by Alice"
    R1[pk: USER#bob]
    R2[sk: FOLLOWER#alice]
    R1 --> R2
    end
    style F1 fill:#4CAF50
    style F2 fill:#2196F3
    style R1 fill:#2196F3
    style R2 fill:#4CAF50
{{< /pattern-diagram >}}

## Implementation

The `@ddb-lib/core` package provides helper functions for working with adjacency lists:

### Creating Adjacency Keys

{{< code-example lang="typescript" title="Creating Adjacency Keys" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Create relationship keys
const relationship = PatternHelpers.adjacencyKeys(
  'USER#alice',
  'USER#bob'
)
console.log(relationship)
// { pk: 'USER#alice', sk: 'USER#bob' }

// For bidirectional, create both directions
const forward = PatternHelpers.adjacencyKeys('USER#alice', 'USER#bob')
const reverse = PatternHelpers.adjacencyKeys('USER#bob', 'USER#alice')
{{< /code-example >}}

### Storing Relationships

{{< code-example lang="typescript" title="Storing Relationships with TableClient" >}}
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

const table = new TableClient({
  tableName: 'SocialGraph',
  partitionKey: 'pk',
  sortKey: 'sk'
})

// Store "Alice follows Bob" relationship
async function follow(followerId: string, followedId: string) {
  const followerKey = PatternHelpers.entityKey('USER', followerId)
  const followedKey = PatternHelpers.entityKey('USER', followedId)
  
  // Store forward relationship (who Alice follows)
  await table.put({
    pk: followerKey,
    sk: followedKey,
    type: 'FOLLOWS',
    createdAt: new Date().toISOString()
  })
  
  // Store reverse relationship (who follows Bob)
  await table.put({
    pk: followedKey,
    sk: PatternHelpers.compositeKey(['FOLLOWER', followerId]),
    type: 'FOLLOWED_BY',
    createdAt: new Date().toISOString()
  })
}

await follow('alice', 'bob')
{{< /code-example >}}

### Querying Relationships

{{< code-example lang="typescript" title="Querying Relationships" >}}
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

// Get all users that Alice follows
async function getFollowing(userId: string) {
  const userKey = PatternHelpers.entityKey('USER', userId)
  
  return await table.query({
    keyCondition: {
      pk: userKey,
      sk: { beginsWith: 'USER#' }
    }
  })
}

// Get all followers of Bob
async function getFollowers(userId: string) {
  const userKey = PatternHelpers.entityKey('USER', userId)
  
  return await table.query({
    keyCondition: {
      pk: userKey,
      sk: { beginsWith: 'FOLLOWER#' }
    }
  })
}

// Check if Alice follows Bob
async function isFollowing(
  followerId: string,
  followedId: string
): Promise<boolean> {
  const followerKey = PatternHelpers.entityKey('USER', followerId)
  const followedKey = PatternHelpers.entityKey('USER', followedId)
  
  const result = await table.get({
    pk: followerKey,
    sk: followedKey
  })
  
  return result !== null
}

const following = await getFollowing('alice')
const followers = await getFollowers('bob')
const aliceFollowsBob = await isFollowing('alice', 'bob')
{{< /code-example >}}

## Common Use Cases

### Use Case 1: Social Network

{{< code-example lang="typescript" title="Social Network Implementation" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Follow a user
async function followUser(followerId: string, followedId: string) {
  const followerKey = PatternHelpers.entityKey('USER', followerId)
  const followedKey = PatternHelpers.entityKey('USER', followedId)
  
  // Forward: who I follow
  await table.put({
    pk: followerKey,
    sk: followedKey,
    type: 'FOLLOWS',
    createdAt: new Date().toISOString()
  })
  
  // Reverse: who follows me
  await table.put({
    pk: followedKey,
    sk: PatternHelpers.compositeKey(['FOLLOWER', followerId]),
    type: 'FOLLOWED_BY',
    followerName: 'Alice', // Denormalize for efficiency
    createdAt: new Date().toISOString()
  })
}

// Unfollow a user
async function unfollowUser(followerId: string, followedId: string) {
  const followerKey = PatternHelpers.entityKey('USER', followerId)
  const followedKey = PatternHelpers.entityKey('USER', followedId)
  
  // Delete both directions
  await table.batchWrite([
    {
      delete: {
        pk: followerKey,
        sk: followedKey
      }
    },
    {
      delete: {
        pk: followedKey,
        sk: PatternHelpers.compositeKey(['FOLLOWER', followerId])
      }
    }
  ])
}

// Get mutual followers (friends)
async function getMutualFollowers(userId: string) {
  const following = await getFollowing(userId)
  const followers = await getFollowers(userId)
  
  const followingIds = new Set(
    following.items.map(item => item.sk)
  )
  
  return followers.items.filter(item => {
    const followerId = item.sk.split('#')[1]
    return followingIds.has(PatternHelpers.entityKey('USER', followerId))
  })
}

// Get follower count
async function getFollowerCount(userId: string) {
  const userKey = PatternHelpers.entityKey('USER', userId)
  
  const result = await table.query({
    keyCondition: {
      pk: userKey,
      sk: { beginsWith: 'FOLLOWER#' }
    },
    select: 'COUNT'
  })
  
  return result.count
}
{{< /code-example >}}

### Use Case 2: Tags and Posts (Many-to-Many)

{{< code-example lang="typescript" title="Tags and Posts" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Add tag to post
async function tagPost(postId: string, tagName: string) {
  const postKey = PatternHelpers.entityKey('POST', postId)
  const tagKey = PatternHelpers.entityKey('TAG', tagName)
  
  // Post -> Tag relationship
  await table.put({
    pk: postKey,
    sk: tagKey,
    type: 'HAS_TAG',
    createdAt: new Date().toISOString()
  })
  
  // Tag -> Post relationship (for finding all posts with tag)
  await table.put({
    pk: tagKey,
    sk: postKey,
    type: 'TAGGED_IN',
    createdAt: new Date().toISOString()
  })
}

// Get all tags for a post
async function getPostTags(postId: string) {
  const postKey = PatternHelpers.entityKey('POST', postId)
  
  return await table.query({
    keyCondition: {
      pk: postKey,
      sk: { beginsWith: 'TAG#' }
    }
  })
}

// Get all posts with a tag
async function getPostsByTag(tagName: string) {
  const tagKey = PatternHelpers.entityKey('TAG', tagName)
  
  return await table.query({
    keyCondition: {
      pk: tagKey,
      sk: { beginsWith: 'POST#' }
    }
  })
}

// Remove tag from post
async function removeTag(postId: string, tagName: string) {
  const postKey = PatternHelpers.entityKey('POST', postId)
  const tagKey = PatternHelpers.entityKey('TAG', tagName)
  
  await table.batchWrite([
    { delete: { pk: postKey, sk: tagKey } },
    { delete: { pk: tagKey, sk: postKey } }
  ])
}

// Get related posts (posts with similar tags)
async function getRelatedPosts(postId: string) {
  // Get tags for this post
  const tags = await getPostTags(postId)
  
  // Get posts for each tag
  const relatedPostsMap = new Map()
  
  for (const tag of tags.items) {
    const tagName = tag.sk.split('#')[1]
    const posts = await getPostsByTag(tagName)
    
    for (const post of posts.items) {
      const relatedPostId = post.sk
      if (relatedPostId !== PatternHelpers.entityKey('POST', postId)) {
        const count = relatedPostsMap.get(relatedPostId) || 0
        relatedPostsMap.set(relatedPostId, count + 1)
      }
    }
  }
  
  // Sort by number of shared tags
  return Array.from(relatedPostsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([postId, sharedTags]) => ({ postId, sharedTags }))
}
{{< /code-example >}}

### Use Case 3: Recommendation System

{{< code-example lang="typescript" title="Product Recommendations" >}}
import { PatternHelpers } from '@ddb-lib/core'

// User likes a product
async function likeProduct(userId: string, productId: string) {
  const userKey = PatternHelpers.entityKey('USER', userId)
  const productKey = PatternHelpers.entityKey('PRODUCT', productId)
  
  // User -> Product
  await table.put({
    pk: userKey,
    sk: productKey,
    type: 'LIKES',
    createdAt: new Date().toISOString()
  })
  
  // Product -> User
  await table.put({
    pk: productKey,
    sk: userKey,
    type: 'LIKED_BY',
    createdAt: new Date().toISOString()
  })
}

// Get products user likes
async function getUserLikes(userId: string) {
  const userKey = PatternHelpers.entityKey('USER', userId)
  
  return await table.query({
    keyCondition: {
      pk: userKey,
      sk: { beginsWith: 'PRODUCT#' }
    }
  })
}

// Get users who liked a product
async function getProductLikes(productId: string) {
  const productKey = PatternHelpers.entityKey('PRODUCT', productId)
  
  return await table.query({
    keyCondition: {
      pk: productKey,
      sk: { beginsWith: 'USER#' }
    }
  })
}

// Recommend products (collaborative filtering)
async function getRecommendations(userId: string) {
  // Get products this user likes
  const userLikes = await getUserLikes(userId)
  const likedProductIds = new Set(
    userLikes.items.map(item => item.sk)
  )
  
  // For each liked product, find other users who liked it
  const productScores = new Map()
  
  for (const like of userLikes.items) {
    const productId = like.sk
    const otherUsers = await getProductLikes(productId.split('#')[1])
    
    // For each other user, get their likes
    for (const otherUser of otherUsers.items) {
      const otherUserId = otherUser.sk
      if (otherUserId === PatternHelpers.entityKey('USER', userId)) {
        continue // Skip self
      }
      
      const otherUserLikes = await getUserLikes(otherUserId.split('#')[1])
      
      // Score products this user hasn't liked yet
      for (const otherLike of otherUserLikes.items) {
        const otherProductId = otherLike.sk
        if (!likedProductIds.has(otherProductId)) {
          const score = productScores.get(otherProductId) || 0
          productScores.set(otherProductId, score + 1)
        }
      }
    }
  }
  
  // Sort by score
  return Array.from(productScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) // Top 10 recommendations
    .map(([productId, score]) => ({ productId, score }))
}
{{< /code-example >}}

### Use Case 4: Network Topology

{{< code-example lang="typescript" title="Device Network" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Connect two devices
async function connectDevices(
  deviceId1: string,
  deviceId2: string,
  connectionType: string
) {
  const device1Key = PatternHelpers.entityKey('DEVICE', deviceId1)
  const device2Key = PatternHelpers.entityKey('DEVICE', deviceId2)
  
  // Bidirectional connection
  await table.batchWrite([
    {
      put: {
        pk: device1Key,
        sk: device2Key,
        type: 'CONNECTED_TO',
        connectionType,
        createdAt: new Date().toISOString()
      }
    },
    {
      put: {
        pk: device2Key,
        sk: device1Key,
        type: 'CONNECTED_TO',
        connectionType,
        createdAt: new Date().toISOString()
      }
    }
  ])
}

// Get all connected devices
async function getConnectedDevices(deviceId: string) {
  const deviceKey = PatternHelpers.entityKey('DEVICE', deviceId)
  
  return await table.query({
    keyCondition: {
      pk: deviceKey,
      sk: { beginsWith: 'DEVICE#' }
    }
  })
}

// Find path between devices (BFS)
async function findPath(
  startDeviceId: string,
  endDeviceId: string
): Promise<string[]> {
  const startKey = PatternHelpers.entityKey('DEVICE', startDeviceId)
  const endKey = PatternHelpers.entityKey('DEVICE', endDeviceId)
  
  const queue = [[startKey]]
  const visited = new Set([startKey])
  
  while (queue.length > 0) {
    const path = queue.shift()!
    const current = path[path.length - 1]
    
    if (current === endKey) {
      return path
    }
    
    const connections = await getConnectedDevices(current.split('#')[1])
    
    for (const connection of connections.items) {
      const nextDevice = connection.sk
      if (!visited.has(nextDevice)) {
        visited.add(nextDevice)
        queue.push([...path, nextDevice])
      }
    }
  }
  
  return [] // No path found
}

// Get network neighborhood (devices within N hops)
async function getNeighborhood(
  deviceId: string,
  maxHops: number
): Promise<Set<string>> {
  const deviceKey = PatternHelpers.entityKey('DEVICE', deviceId)
  const neighborhood = new Set([deviceKey])
  let currentLevel = [deviceKey]
  
  for (let hop = 0; hop < maxHops; hop++) {
    const nextLevel = []
    
    for (const device of currentLevel) {
      const connections = await getConnectedDevices(device.split('#')[1])
      
      for (const connection of connections.items) {
        const connectedDevice = connection.sk
        if (!neighborhood.has(connectedDevice)) {
          neighborhood.add(connectedDevice)
          nextLevel.push(connectedDevice)
        }
      }
    }
    
    currentLevel = nextLevel
    if (currentLevel.length === 0) break
  }
  
  return neighborhood
}
{{< /code-example >}}

## When to Use

### ✅ Use Adjacency List Pattern When:

- **Many-to-many relationships**: Items can have multiple connections
- **Graph structures**: Your data forms a graph or network
- **Bidirectional queries**: You need to query relationships in both directions
- **Social features**: Following, friends, connections
- **Recommendation systems**: Finding related items or users

### ❌ Avoid Adjacency List Pattern When:

- **Simple hierarchies**: Use hierarchical pattern instead
- **One-to-many only**: Simpler patterns may suffice
- **Complex graph algorithms**: DynamoDB isn't optimized for deep graph traversal
- **Frequent relationship changes**: High write costs for bidirectional updates

### ⚠️ Considerations:

- **Write amplification**: Bidirectional relationships require two writes
- **Consistency**: Ensure both directions are updated atomically
- **Deletion complexity**: Must delete both directions
- **Query depth**: Deep graph traversal requires multiple queries

## Best Practices

### 1. Use Transactions for Bidirectional Updates

```typescript
// ✅ Good: Use transactions for consistency
async function followUserAtomic(followerId: string, followedId: string) {
  const followerKey = PatternHelpers.entityKey('USER', followerId)
  const followedKey = PatternHelpers.entityKey('USER', followedId)
  
  await table.transactWrite([
    {
      put: {
        pk: followerKey,
        sk: followedKey,
        type: 'FOLLOWS'
      }
    },
    {
      put: {
        pk: followedKey,
        sk: PatternHelpers.compositeKey(['FOLLOWER', followerId]),
        type: 'FOLLOWED_BY'
      }
    }
  ])
}
```

### 2. Denormalize for Performance

```typescript
// ✅ Good: Store frequently accessed data
await table.put({
  pk: PatternHelpers.entityKey('USER', 'bob'),
  sk: PatternHelpers.compositeKey(['FOLLOWER', 'alice']),
  type: 'FOLLOWED_BY',
  followerName: 'Alice Smith', // Denormalized
  followerAvatar: 'https://...', // Denormalized
  createdAt: new Date().toISOString()
})
```

### 3. Add Relationship Metadata

```typescript
// ✅ Good: Store relationship properties
await table.put({
  pk: PatternHelpers.entityKey('USER', 'alice'),
  sk: PatternHelpers.entityKey('USER', 'bob'),
  type: 'FOLLOWS',
  createdAt: new Date().toISOString(),
  notificationsEnabled: true,
  relationshipStrength: 0.85 // For ranking
})
```

### 4. Use Prefixes for Relationship Types

```typescript
// ✅ Good: Distinguish relationship types
// Following
sk: PatternHelpers.compositeKey(['FOLLOWS', userId])

// Followers
sk: PatternHelpers.compositeKey(['FOLLOWER', userId])

// Blocked
sk: PatternHelpers.compositeKey(['BLOCKED', userId])
```

### 5. Implement Pagination for Large Graphs

```typescript
// ✅ Good: Paginate large result sets
async function getFollowersPaginated(
  userId: string,
  limit: number = 100,
  lastKey?: any
) {
  const userKey = PatternHelpers.entityKey('USER', userId)
  
  return await table.query({
    keyCondition: {
      pk: userKey,
      sk: { beginsWith: 'FOLLOWER#' }
    },
    limit,
    exclusiveStartKey: lastKey
  })
}
```

## Performance Considerations

### Write Costs

```typescript
// ⚠️ Bidirectional relationships double write costs
// Each relationship = 2 writes (forward + reverse)

// Consider unidirectional for read-heavy patterns
// Only store forward direction if reverse queries are rare
```

### Query Efficiency

```typescript
// ✅ Efficient: Direct query
await table.query({
  keyCondition: {
    pk: 'USER#alice',
    sk: { beginsWith: 'USER#' }
  }
})

// ❌ Inefficient: Multiple queries for deep traversal
// Avoid deep graph traversal in DynamoDB
```

## Related Patterns

- [Entity Keys](/patterns/entity-keys/) - Foundation for adjacency lists
- [Composite Keys](/patterns/composite-keys/) - Build relationship keys
- [Hierarchical](/patterns/hierarchical/) - For tree structures
- [Sparse Indexes](/patterns/sparse-indexes/) - Index specific relationships

## Additional Resources

- [Batch Operations Guide](/guides/batch-operations/)
- [Transactions Guide](/guides/transactions/)
- [Best Practices: Key Design](/best-practices/key-design/)
- [API Reference: PatternHelpers](/api/core/#patternhelpers-class)
