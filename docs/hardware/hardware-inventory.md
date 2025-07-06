# Hardware Inventory

## Complete Bill of Materials (BOM)

### Core Computing Units

| Qty | Component | Specification | Purpose | Cost (Est.) |
|-----|-----------|---------------|---------|-------------|
| 2 | Raspberry Pi 5 8GB | BCM2712 quad-core ARM Cortex-A76 @ 2.4GHz<br/>8GB LPDDR4X RAM<br/>VideoCore VII GPU | Control plane + master nodes | $80 each |
| 4 | Raspberry Pi 5 4GB | BCM2712 quad-core ARM Cortex-A76 @ 2.4GHz<br/>4GB LPDDR4X RAM<br/>VideoCore VII GPU | Worker nodes | $60 each |

**Total Computing Cost: $400**

### Storage

| Qty | Component | Specification | Purpose | Cost (Est.) |
|-----|-----------|---------------|---------|-------------|
| 6 | SanDisk Ultra 64GB MicroSD | Class 10, A1, U1<br/>Up to 120MB/s read | Boot and system storage | $10 each |

**Total Storage Cost: $60**

### Power Supply

| Qty | Component | Specification | Purpose | Cost (Est.) |
|-----|-----------|---------------|---------|-------------|
| 6 | Raspberry Pi 27W USB-C PSU | Official Pi 5 power supply<br/>5.1V 5A (27W)<br/>USB-C PD 3.0 | Primary power for each Pi | $12 each |
| 1 | Power Strip (8 outlets) | Surge protected<br/>6ft cord | Centralized power distribution | $25 |

**Total Power Cost: $97**

### Cooling

| Qty | Component | Specification | Purpose | Cost (Est.) |
|-----|-----------|---------------|---------|-------------|
| 6 | Raspberry Pi 5 Active Cooler | Official Pi 5 cooler<br/>Fan + heatsink<br/>PWM controlled | Thermal management | $5 each |

**Total Cooling Cost: $30**

### Networking

| Qty | Component | Specification | Purpose | Cost (Est.) |
|-----|-----------|---------------|---------|-------------|
| 1 | FortiGate 50G | 7x Gigabit Ethernet ports<br/>Hardware-accelerated firewall<br/>VPN support | Gateway/Router/NAT | $200 |
| 1 | UniFi Lite 8 PoE | 8x Gigabit Ethernet ports<br/>4x PoE+ ports<br/>Layer 2 switching | Pi cluster networking | $100 |
| 7 | Cat 6 Ethernet Cable (1m) | Flat design<br/>Gigabit certified | Network connections | $5 each |

**Total Networking Cost: $335**

### Enclosure & Accessories

| Qty | Component | Specification | Purpose | Cost (Est.) |
|-----|-----------|---------------|---------|-------------|
| 1 | Pelican 1560 Case | Wheeled hard case<br/>Airline carry-on compliant<br/>Foam insert custom cut | Transport and protection | $200 |
| 1 | Rack Mount Kit | Custom 3D printed<br/>Stackable Pi mounts | Organization and airflow | $25 |
| 1 | Cable Management Kit | Velcro ties, cable channels | Clean installation | $15 |

**Total Enclosure Cost: $240**

## Total Project Cost: $1,162

## Hardware Specifications Detail

### Raspberry Pi 5 Technical Specifications

**ARM64 Architecture:** BCM2712 SoC (64-bit ARMv8-A)
- **CPU:** 4x ARM Cortex-A76 @ 2.4GHz
- **GPU:** VideoCore VII @ 800MHz
- **Memory:** LPDDR4X (8GB or 4GB variants)
- **Storage:** MicroSD slot + M.2 HAT support
- **USB:** 2x USB 3.0, 2x USB 2.0
- **Network:** Gigabit Ethernet, Wi-Fi 6, Bluetooth 5.0
- **Power:** USB-C PD 3.0 (up to 27W)
- **GPIO:** 40-pin header (compatible with Pi 4)

### Performance Characteristics

| Metric | Pi 5 8GB | Pi 5 4GB | Notes |
|--------|----------|----------|-------|
| **CPU Cores** | 4 | 4 | ARM Cortex-A76 @ 2.4GHz |
| **Memory** | 8GB | 4GB | LPDDR4X-4267 |
| **Storage I/O** | 120MB/s | 120MB/s | MicroSD Class 10 |
| **Network** | 1Gbps | 1Gbps | Gigabit Ethernet |
| **Power Draw** | 8-12W | 6-10W | Under typical load |
| **Operating Temp** | 0-85°C | 0-85°C | With active cooling |

### Node Role Assignments

| Hostname | Hardware | Role | Storage | Workload |
|----------|----------|------|---------|----------|
| `fractal1` | Pi 5 8GB | Control plane + Worker | 64GB SD | etcd, kube-api, MongoDB master |
| `fractal2` | Pi 5 8GB | Worker | 64GB SD | MongoDB replica, Elasticsearch master |
| `fractal3` | Pi 5 4GB | Worker | 64GB SD | MongoDB replica, Elasticsearch data |
| `fractal4` | Pi 5 4GB | Worker | 64GB SD | Elasticsearch data, application pods |
| `fractal5` | Pi 5 4GB | Worker | 64GB SD | Elasticsearch data, monitoring |
| `fractal6` | Pi 5 4GB | Worker | 64GB SD | Spare capacity, ML workloads |

## ARM64 Compatibility Verification

### Base System Compatibility

**Raspberry Pi OS (Bookworm):**
- ✅ Native ARM64 support
- ✅ Container runtime (containerd)
- ✅ Kubernetes (MicroK8s)
- ✅ Docker Engine support

**MicroK8s ARM64 Support:**
- ✅ Kubernetes 1.30+ native ARM64
- ✅ Flannel CNI ARM64 compatible
- ✅ MetalLB ARM64 compatible
- ✅ CoreDNS ARM64 compatible

### Container Image Compatibility

All selected container images support ARM64:

**Database Images:**
- ✅ `postgres:15-alpine` - Official multi-arch
- ✅ `mongo:7.0` - Official multi-arch
- ✅ `docker.elastic.co/elasticsearch/elasticsearch:8.13.4` - Official ARM64

**Application Images:**
- ✅ `node:20-alpine` - Official multi-arch
- ✅ `nginx:alpine` - Official multi-arch

**Monitoring Images:**
- ✅ `prom/prometheus:latest` - Official multi-arch
- ✅ `grafana/grafana:latest` - Official multi-arch

## Physical Dimensions & Weight

### Individual Component Dimensions

| Component | Dimensions (L×W×H) | Weight |
|-----------|-------------------|---------|
| Raspberry Pi 5 | 85mm × 56mm × 17mm | 45g |
| Active Cooler | 85mm × 56mm × 15mm | 25g |
| Power Supply | 78mm × 50mm × 29mm | 200g |

### Complete System Dimensions

**Pelican 1560 Case:**
- External: 557mm × 351mm × 229mm
- Internal: 521mm × 279mm × 193mm
- Weight (empty): 5.6kg
- Weight (loaded): ~12kg

**Rack Mount Assembly:**
- Dimensions: 480mm × 250mm × 150mm
- Weight: 1.5kg (6 Pis + cooling)

## Power Requirements

### Power Consumption Analysis

| Component | Idle | Load | Peak |
|-----------|------|------|------|
| Pi 5 8GB | 3.3W | 8.9W | 12.0W |
| Pi 5 4GB | 2.4W | 6.8W | 9.6W |
| Active Cooler | 0.2W | 1.0W | 1.5W |
| FortiGate 50G | 8.0W | 12.0W | 15.0W |
| UniFi Lite 8 PoE | 5.0W | 8.0W | 10.0W |

### Total System Power

**Estimated Power Draw:**
- **Idle:** 42W
- **Normal Load:** 77W
- **Peak Load:** 105W

**Power Supply Capacity:**
- 6× 27W PSUs = 162W total capacity
- Additional 40W for networking equipment
- **Total Available:** 202W

## Environmental Specifications

### Operating Conditions

| Parameter | Specification | Notes |
|-----------|---------------|-------|
| **Temperature** | 0°C to 40°C | With active cooling |
| **Humidity** | 10% to 90% non-condensing | Typical indoor conditions |
| **Altitude** | 0 to 2000m | Standard atmospheric pressure |
| **Ventilation** | Forced air | Active cooling required |

### Storage Conditions

| Parameter | Specification | Notes |
|-----------|---------------|-------|
| **Temperature** | -20°C to 60°C | In transport case |
| **Humidity** | 5% to 95% non-condensing | Sealed case protection |
| **Shock** | 10G | Pelican case protection |
| **Vibration** | 3G | Foam insert isolation |

## Assembly Tools Required

### Basic Tools

- Phillips head screwdriver (PH1)
- Flat head screwdriver (small)
- Anti-static wrist strap
- Cable ties and organizers
- Label maker
- Multimeter (for power testing)

### Optional Tools

- 3D printer (for custom mounts)
- Soldering iron (for custom connections)
- Heat gun (for heat shrink tubing)
- Dremel tool (for case modifications)

## Maintenance Schedule

### Daily (During Active Use)

- Check temperature readings
- Verify all services running
- Monitor power consumption
- Check network connectivity

### Weekly

- Clean air filters
- Check cable connections
- Verify storage capacity
- Update system logs

### Monthly

- Clean cooling fans
- Check for loose connections
- Update firmware
- Performance benchmarking

### Quarterly

- Deep clean all components
- Replace thermal paste
- Check SD card health
- Capacity planning review

## Warranty Information

| Component | Warranty Period | Support |
|-----------|----------------|---------|
| Raspberry Pi 5 | 12 months | Community + official |
| FortiGate 50G | 12 months | Fortinet support |
| UniFi Lite 8 PoE | 24 months | Ubiquiti support |
| Power Supplies | 24 months | Manufacturer |

## Upgrade Path

### Short-term Upgrades (6-12 months)

- **NVMe HAT:** Add M.2 NVMe drives for high-performance storage
- **PoE HAT:** Power Pis via PoE from switch
- **Compute Module:** Upgrade to Pi Compute Module 5 for better I/O

### Long-term Upgrades (12-24 months)

- **Pi 6:** Upgrade to next-generation Pi hardware
- **10GbE:** Upgrade network to 10 Gigabit Ethernet
- **More Nodes:** Expand cluster to 8-12 nodes

This hardware configuration provides a robust, portable, and ARM64-compatible foundation for the Epic Interactive NoSQL Showdown demonstration system. 