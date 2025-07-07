# MongoDB & Elasticsearch Metric Testing

## MongoDB Metrics (Common patterns)

### Connections
- `mongodb_ss_connections` - ServerStatus connections
- `mongodb_connections_current` - Current connections
- `mongodb_connections_available` - Available connections
- `mongodb_connections_active` - Active connections

### Operations
- `mongodb_ss_opcounters` - Operation counters (insert, query, update, delete, command, getmore)
- `mongodb_opcounters_repl` - Replication operation counters
- `mongodb_mongod_op_latencies_histogram` - Operation latencies

### Memory
- `mongodb_ss_mem_resident` - Resident memory in MB
- `mongodb_ss_mem_virtual` - Virtual memory in MB
- `mongodb_ss_mem_mapped` - Mapped memory
- `mongodb_ss_mem_mapped_with_journal` - Mapped with journal

### WiredTiger (if using WiredTiger storage engine)
- `mongodb_ss_wt_cache_bytes` - Cache usage
- `mongodb_ss_wt_cache_max_bytes` - Max cache size

## Test Queries for Grafana

### MongoDB Test Queries
```promql
# List all MongoDB metrics
{__name__=~"mongodb.*"}

# Current connections
mongodb_ss_connections{conn_type="current"}
# OR
mongodb_connections_current

# Operations per second
rate(mongodb_ss_opcounters[5m])
# OR
rate(mongodb_opcounters_total[5m])

# Memory in bytes
mongodb_ss_mem_resident * 1024 * 1024
mongodb_ss_mem_virtual * 1024 * 1024
```

### Elasticsearch Test Queries  
```promql
# All ES metrics
{__name__=~"elasticsearch.*"}

# JVM Memory
elasticsearch_jvm_memory_used_bytes{area="heap"}
elasticsearch_jvm_memory_max_bytes{area="heap"}

# Cluster health
elasticsearch_cluster_health_status
elasticsearch_cluster_health_active_shards
```

## Debugging Steps

1. In Grafana, go to Explore mode
2. Try each query pattern to see which metrics exist
3. Use the metric browser to find exact metric names
4. Check labels with: `mongodb_ss_connections` (without any labels) to see all label combinations