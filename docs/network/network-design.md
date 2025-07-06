# Network Design

## Overview

The Epic Interactive NoSQL Showdown uses a flat Layer 2 network design with static IP addressing for all Raspberry Pi nodes. This design prioritizes simplicity and reliability while providing sufficient performance for the demonstration workload.

## Network Topology

### Physical Network Layout

```
                    ┌─────────────────────┐
                    │   FortiGate 50G    │ 10.0.1.1/24
                    │   (Router/L3)      │ (No WAN uplink)
                    └─────────┬───────────┘
                              │ LAN Port 1
                              │
                    ┌─────────▼─────────┐
                    │ UniFi Lite 8 PoE  │
                    │   (L2 Switch)     │
                    └─┬─┬─┬─┬─┬─┬─┬─┬─┘
                      │ │ │ │ │ │ │ │
                      │ │ │ │ │ │ │ └─ Port 8: Admin Laptop (ngrok host)
                      │ │ │ │ │ │ └─── Port 7: fractal6 (10.0.1.8)
                      │ │ │ │ │ └───── Port 6: fractal5 (10.0.1.7)
                      │ │ │ │ └─────── Port 5: fractal4 (10.0.1.6)
                      │ │ │ └───────── Port 4: fractal3 (10.0.1.5)
                      │ │ └─────────── Port 3: fractal2 (10.0.1.4)
                      │ └───────────── Port 2: fractal1 (10.0.1.3)
                      └─────────────── Port 1: FortiGate uplink
```

**Note:** The cluster operates in isolated mode without upstream internet connectivity. External access is provided via ngrok tunnels from the admin laptop.

### Logical Network Diagram

```
           [Internet Access via ngrok tunnels on Admin Laptop]
                                  ┊
                                  ┊ ngrok
                                  ┊
                         ┌────────▼────────┐
                         │  Admin Laptop   │
                         │   10.0.1.50     │
                         └────────┬────────┘
                                  │
                         ┌────────▼────────┐
                         │ FortiGate 50G   │
                         │   10.0.1.1/24   │
                         │ (Isolated LAN)  │
                         └────────┬────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │              Physical LAN (10.0.1.0/24)         │
         └───┬───┬───┬───┬───┬───┬─────────────┬──────────┘
             │   │   │   │   │   │             │
         ┌───▼─┐ │   │   │   │   │         ┌───▼────┐
         │ f1  │ │   │   │   │   │         │MetalLB │
         │.1.3 │ │   │   │   │   │         │  IPs   │
         └─────┘ │   │   │   │   │         │.240-250│
             ┌───▼─┐ │   │   │   │         └────────┘
             │ f2  │ │   │   │   │
             │.1.4 │ │   │   │   │
             └─────┘ │   │   │   │
                 ┌───▼─┐ │   │   │
                 │ f3  │ │   │   │
                 │.1.5 │ │   │   │
                 └─────┘ │   │   │
                     ┌───▼─┐ │   │
                     │ f4  │ │   │
                     │.1.6 │ │   │
                     └─────┘ │   │
                         ┌───▼─┐ │
                         │ f5  │ │
                         │.1.7 │ │
                         └─────┘ │
                             ┌───▼─┐
                             │ f6  │
                             │.1.8 │
                             └─────┘
```

## IP Addressing Scheme

### Primary Subnet: 10.0.1.0/24

**Subnet Details:**
- **Network Address:** 10.0.1.0
- **Subnet Mask:** 255.255.255.0 (/24)
- **Gateway:** 10.0.1.1 (FortiGate)
- **DNS Servers:** 8.8.8.8, 1.1.1.1
- **Broadcast:** 10.0.1.255
- **Usable IPs:** 10.0.1.1 - 10.0.1.254 (254 addresses)

### IP Address Allocation

| IP Range | Purpose | Assignment Method | Count |
|----------|---------|-------------------|--------|
| 10.0.1.1 | Gateway/Router | Static | 1 |
| 10.0.1.2 | Admin Laptop (fallback) | Static | 1 |
| 10.0.1.3-8 | Raspberry Pi Cluster | Static | 6 |
| 10.0.1.9-49 | Reserved (future expansion) | Static | 41 |
| 10.0.1.50-199 | DHCP Pool | Dynamic | 150 |
| 10.0.1.200-239 | Reserved | Static | 40 |
| 10.0.1.240-250 | MetalLB LoadBalancer | Static | 11 |
| 10.0.1.251-254 | Reserved | Static | 4 |

### Node IP Assignments

| Hostname | IP Address | MAC Address | Role | Notes |
|----------|------------|-------------|------|-------|
| fractal1 | 10.0.1.3 | `dc:a6:32:xx:xx:xx` | Control plane + Worker | Pi 5 8GB |
| fractal2 | 10.0.1.4 | `dc:a6:32:xx:xx:xx` | Worker | Pi 5 8GB |
| fractal3 | 10.0.1.5 | `dc:a6:32:xx:xx:xx` | Worker | Pi 5 4GB |
| fractal4 | 10.0.1.6 | `dc:a6:32:xx:xx:xx` | Worker | Pi 5 4GB |
| fractal5 | 10.0.1.7 | `dc:a6:32:xx:xx:xx` | Worker | Pi 5 4GB |
| fractal6 | 10.0.1.8 | `dc:a6:32:xx:xx:xx` | Worker | Pi 5 4GB |

### Service IP Assignments (MetalLB)

| Service | IP Address | Port | Purpose |
|---------|------------|------|---------|
| Kubernetes Dashboard | 10.0.1.240 | 443 | Web UI for cluster management |
| Elasticsearch | 10.0.1.241 | 9200 | Database access |
| Kibana | 10.0.1.242 | 5601 | Elasticsearch visualization |
| React UI | 10.0.1.243 | 80 | Frontend application |
| Node.js API | 10.0.1.244 | 4000 | Backend API |
| Grafana | 10.0.1.245 | 3000 | Monitoring dashboards |
| Prometheus | 10.0.1.246 | 9090 | Metrics collection |
| MongoDB Express | 10.0.1.247 | 8081 | MongoDB web interface |
| ArgoCD | 10.0.1.248 | 80 | GitOps deployment |
| Ingress Controller | 10.0.1.249 | 80/443 | HTTP/HTTPS routing |

## Network Segmentation

### VLAN Design (Optional)

While the current design uses a flat network, VLANs can be implemented for enhanced security:

| VLAN ID | Name | Subnet | Purpose |
|---------|------|--------|---------|
| 1 | Default | 10.0.1.0/24 | Current flat network |
| 10 | Management | 10.0.10.0/24 | Pi management interfaces |
| 20 | Cluster | 10.0.20.0/24 | Kubernetes pod network |
| 30 | Storage | 10.0.30.0/24 | Database traffic |
| 40 | Monitoring | 10.0.40.0/24 | Metrics and logging |
| 50 | Guest | 10.0.50.0/24 | Student device access |

### Network Security Zones

```
┌─────────────────────────────────────────────────────────────────┐
│                    Internet (via ngrok)                        │
│                      (Untrusted)                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ ngrok tunnels
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    Admin Laptop Zone                           │
│                   (Gateway/Proxy)                              │
│                    10.0.1.50                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ Local network access
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   Application Zone                             │
│               (MetalLB LoadBalancers)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   React UI      │  │   Grafana       │  │    Kibana       │ │
│  │  10.0.1.243     │  │  10.0.1.245     │  │  10.0.1.242     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ Kubernetes internal
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                     Cluster Zone                               │
│                      (Trusted)                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Node.js API   │  │   Databases     │  │   Kubernetes    │ │
│  │   (Backend)     │  │   (Data)        │  │   (Control)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Network Performance Specifications

### Bandwidth Requirements

| Traffic Type | Bandwidth | Notes |
|--------------|-----------|-------|
| Student Web Access | 1 Mbps per user | 50 concurrent users = 50 Mbps |
| Database Replication | 100 Mbps | MongoDB + Elasticsearch sync |
| Monitoring Data | 10 Mbps | Prometheus metrics collection |
| Admin Access | 10 Mbps | Kubernetes API, SSH access |
| **Total Required** | **170 Mbps** | Peak demonstration load |

### Latency Requirements

| Connection Type | Target Latency | Maximum Latency |
|-----------------|----------------|-----------------|
| Student → UI | < 10ms | < 50ms |
| UI → API | < 2ms | < 10ms |
| API → Database | < 1ms | < 5ms |
| Monitoring | < 5ms | < 20ms |

### Network Capacity Planning

**Current Capacity:**
- Gigabit Ethernet (1000 Mbps) per port
- 8 ports total (6 Pi + 1 uplink + 1 admin)
- Aggregate bandwidth: 8 Gbps
- Utilization: ~2% under peak demo load

**Scaling Considerations:**
- Can support 100+ concurrent users
- Database replication traffic is the limiting factor
- Consider 10GbE upgrade for high-throughput workloads

## DNS Configuration

### Internal DNS (CoreDNS)

Kubernetes CoreDNS provides internal service discovery:

```yaml
# Example DNS records
api.default.svc.cluster.local          → 10.96.xxx.xxx
postgres.default.svc.cluster.local     → 10.96.xxx.xxx
mongodb.default.svc.cluster.local      → 10.96.xxx.xxx
elasticsearch.default.svc.cluster.local → 10.96.xxx.xxx
```

### External DNS

Since there's no upstream internet connection, DNS is handled locally:

```
# Local DNS: 10.0.1.1 (FortiGate)
# Admin laptop uses mobile hotspot for ngrok connectivity
```

### Custom DNS Entries

For easier access during demonstrations:

```
# /etc/hosts entries for admin laptop
10.0.1.240    k8s-dashboard.local
10.0.1.241    elasticsearch.local
10.0.1.242    kibana.local
10.0.1.243    showdown.local
10.0.1.244    api.local
10.0.1.245    grafana.local
```

## External Access via ngrok

Since the cluster operates without upstream internet connectivity, we use ngrok tunnels from the admin laptop to provide external access for students.

### ngrok Architecture

```
Students (Internet) → ngrok.io → Admin Laptop → MetalLB IPs → Services
```

### ngrok Configuration

| Service | Local IP:Port | ngrok URL | Purpose |
|---------|---------------|-----------|---------|
| React UI | 10.0.1.243:80 | https://showdown-XXX.ngrok.io | Student web interface |
| API | 10.0.1.244:3000 | https://api-XXX.ngrok.io | Backend API access |
| Kibana | 10.0.1.242:5601 | https://kibana-XXX.ngrok.io | Elasticsearch visualization |
| Grafana | 10.0.1.245:3000 | https://grafana-XXX.ngrok.io | Monitoring dashboards |

### ngrok Setup

1. **Admin Laptop Requirements:**
   - Mobile hotspot or tethering for internet access
   - ngrok client installed
   - Static IP on cluster network (10.0.1.50)

2. **Tunnel Configuration:**
   ```bash
   # Start ngrok tunnels
   ngrok http 10.0.1.243:80 --host-header=rewrite
   
   # Or use configuration file for multiple tunnels
   ngrok start --all --config ngrok.yml
   ```

3. **Share URLs with Students:**
   - Generate QR codes for easy mobile access
   - Display URLs on projector
   - Send via collaboration platform

## Network Monitoring

### SNMP Configuration

Enable SNMP monitoring on network devices:

```yaml
# FortiGate SNMP
Community: public (read-only)
Version: v2c
OID: 1.3.6.1.4.1.12356 (Fortinet)

# UniFi SNMP
Community: public (read-only)
Version: v2c
OID: 1.3.6.1.4.1.4413 (Ubiquiti)
```

### Network Metrics

Monitor these key network metrics:

| Metric | Source | Threshold | Action |
|--------|--------|-----------|---------|
| Interface Utilization | SNMP | > 80% | Alert |
| Packet Loss | Ping | > 1% | Alert |
| Latency | Ping | > 50ms | Alert |
| Error Rate | SNMP | > 0.1% | Alert |
| CRC Errors | SNMP | > 0 | Alert |

## Disaster Recovery

### Network Failure Scenarios

1. **FortiGate Failure**
   - Fallback: Admin laptop as temporary router
   - Static routes on Pi nodes
   - Continue isolated cluster operation

2. **Switch Failure**
   - Fallback: Direct Pi-to-Pi connections
   - Mesh network topology
   - Reduced redundancy

3. **Admin Laptop Failure**
   - No external access via ngrok
   - Local demonstration only
   - Use backup laptop if available

### Recovery Procedures

```bash
# Emergency network reconfiguration
# 1. Set admin laptop as gateway
sudo ip route add default via 10.0.1.2

# 2. Update Pi nodes
for i in {3..8}; do
    ssh pi@10.0.1.$i "sudo ip route del default; sudo ip route add default via 10.0.1.2"
done

# 3. Verify connectivity
for i in {3..8}; do
    ping -c 3 10.0.1.$i
done
```

## Network Security

### Network Policies (Kubernetes)

```yaml
# Example NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-default
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

## Troubleshooting

### Common Network Issues

1. **Slow Performance**
   - Check interface utilization
   - Verify duplex settings
   - Monitor error rates

2. **Connection Drops**
   - Check cable integrity
   - Verify switch port status
   - Monitor temperature

3. **ngrok Tunnel Issues**
   - Verify admin laptop internet connectivity
   - Check ngrok auth token
   - Restart ngrok service

### Diagnostic Commands

```bash
# Network connectivity tests
ping -c 3 10.0.1.1           # Gateway
ping -c 3 10.0.1.3           # Control plane node
ping -c 3 10.0.1.243         # React UI LoadBalancer IP

# Interface statistics
ip link show                 # Link status
ip addr show                 # IP configuration
ss -tuln                     # Listen ports

# Network performance
iperf3 -c 10.0.1.1          # Bandwidth test
mtr 10.0.1.1                # Network path analysis
```

This network design provides a robust, scalable foundation for the Epic Interactive NoSQL Showdown demonstration system while maintaining simplicity for educational purposes. 