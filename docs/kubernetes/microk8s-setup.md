# MicroK8s Setup Guide

## Overview

This guide covers the complete setup of MicroK8s on the Raspberry Pi 5 cluster for ARM64 architecture. MicroK8s is chosen for its simplicity, built-in addons, and excellent ARM64 support.

## Prerequisites

### System Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **RAM** | 2GB | 4GB+ | Per node |
| **Storage** | 20GB | 50GB+ | System + container images |
| **Network** | 100Mbps | 1Gbps | Inter-node communication |
| **OS** | Ubuntu 20.04+ | Ubuntu 22.04+ | ARM64 architecture |

### Pre-Installation Checklist

- [ ] All Raspberry Pi 5 nodes have static IP addresses
- [ ] SSH access configured on all nodes
- [ ] Local network connectivity verified
- [ ] System updates applied (download packages beforehand if no internet)
- [ ] Docker/containerd conflicts resolved

## Node Preparation

### 1. System Configuration

Execute on all nodes:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget gnupg2 software-properties-common

# Configure system limits
echo "fs.inotify.max_user_instances = 524288" | sudo tee -a /etc/sysctl.conf
echo "fs.inotify.max_user_watches = 524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Enable cgroups for Kubernetes
sudo sed -i 's/$/ cgroup_enable=memory cgroup_memory=1 cgroup_enable=cpuset/' /boot/firmware/cmdline.txt
```

### 2. Network Configuration

Set static IP addresses (adjust for each node):

```bash
# Configure static IP (example for fractal1)
sudo nmcli connection modify "Wired connection 1" \
    ipv4.addresses 10.0.1.3/24 \
    ipv4.gateway 10.0.1.1 \
    ipv4.dns "10.0.1.1" \
    ipv4.method manual

# Apply network configuration
sudo nmcli connection down "Wired connection 1"
sudo nmcli connection up "Wired connection 1"

# Verify configuration
ip addr show eth0
```

### 3. Kernel Modules

Enable required kernel modules:

```bash
# Add kernel modules
sudo tee /etc/modules-load.d/k8s.conf <<EOF
overlay
br_netfilter
EOF

# Load modules immediately
sudo modprobe overlay
sudo modprobe br_netfilter

# Configure sysctl parameters
sudo tee /etc/sysctl.d/k8s.conf <<EOF
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

# Apply sysctl parameters
sudo sysctl --system
```

### 4. Disable Swap

```bash
# Disable swap permanently
sudo dphys-swapfile swapoff
sudo dphys-swapfile uninstall
sudo systemctl disable dphys-swapfile

# Remove swap from fstab
sudo sed -i '/swap/d' /etc/fstab

# Verify swap is disabled
free -h
```

## MicroK8s Installation

### 1. Install Snap (if not present)

```bash
# Install snapd
sudo apt install -y snapd

# Enable snapd service
sudo systemctl enable snapd
sudo systemctl start snapd

# Wait for snap to be ready
sudo snap wait system seed.loaded

# Install core snap
sudo snap install core
sudo snap refresh core
```

### 2. Install MicroK8s

```bash
# Install MicroK8s (latest stable)
sudo snap install microk8s --classic --channel=1.30/stable

# Add user to microk8s group
sudo usermod -a -G microk8s $USER
newgrp microk8s

# Set up kubectl alias
echo 'alias kubectl="microk8s kubectl"' >> ~/.bashrc
source ~/.bashrc

# Wait for MicroK8s to be ready
sudo microk8s status --wait-ready
```

### 3. Verify Installation

```bash
# Check MicroK8s status
microk8s status

# Check node status
microk8s kubectl get nodes

# Check system pods
microk8s kubectl get pods -n kube-system
```

## Cluster Formation

### 1. Initialize Control Plane (fractal1)

```bash
# On fractal1 (control plane node)
microk8s status --wait-ready

# Generate join token
microk8s add-node

# Note the output - you'll need the join commands
```

Example output:
```
From the node you wish to join to this cluster, run the following:
microk8s join 10.0.1.3:25000/92b2db237a40621c730ae6a5440bd0654bb88d42/d6c3e42b9a1f

Use the '--worker' flag to join a node as a worker only, omitting the control plane.
```

### 2. Join Worker Nodes (fractal2-6)

Execute on each worker node:

```bash
# Join as worker node
microk8s join 10.0.1.3:25000/92b2db237a40621c730ae6a5440bd0654bb88d42/d6c3e42b9a1f --worker

# Wait for join to complete
microk8s status --wait-ready
```

### 3. Verify Cluster Formation

```bash
# Check all nodes from control plane
microk8s kubectl get nodes -o wide

# Expected output:
# NAME       STATUS   ROLES    AGE   VERSION   INTERNAL-IP   EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION      CONTAINER-RUNTIME
# fractal1   Ready    <none>   1m    v1.30.0   10.0.1.3      <none>        Ubuntu 22.04.3 LTS   5.15.0-1040-raspi   containerd://1.6.15
# fractal2   Ready    <none>   1m    v1.30.0   10.0.1.4      <none>        Ubuntu 22.04.3 LTS   5.15.0-1040-raspi   containerd://1.6.15
# ...
```

## Essential Addons

### 1. DNS (CoreDNS)

```bash
# Enable DNS addon
microk8s enable dns

# Verify DNS is working
microk8s kubectl get pods -n kube-system | grep coredns
```

### 2. Storage

```bash
# Enable hostpath-storage
microk8s enable hostpath-storage

# Verify storage class
microk8s kubectl get storageclass
```

### 3. MetalLB Load Balancer

```bash
# Enable MetalLB with IP range
microk8s enable metallb:10.0.1.240-10.0.1.250

# This creates:
# - metallb-system namespace
# - ConfigMap that advertises one /32 IP per service from the pool

# Verify MetalLB deployment
microk8s kubectl get pods -n metallb-system

# Check MetalLB configuration
microk8s kubectl get configmap -n metallb-system config -o yaml
```

#### How LoadBalancer IPs Work (MetalLB Recap)

| Component | What it does | Result |
|-----------|-------------|---------|
| **MetalLB addon** | `microk8s enable metallb:10.0.1.240-10.0.1.250` | Creates metallb-system namespace and ConfigMap that advertises one /32 IP per service from that pool |
| **Service type** | When we patch a Service to:<br/>`spec.type: LoadBalancer`<br/>`spec.loadBalancerIP: 10.0.1.242` | MetalLB's speaker pod on each Pi answers ARP for 10.0.1.242 and NATs traffic to the chosen backend pod/port |
| **Outcome** | Any device on your LAN can reach the service directly | No NodePort, no port-forward needed - exactly like cloud LoadBalancers |

List all MetalLB assignments:
```bash
# View all LoadBalancer services
microk8s kubectl get svc -A | grep LoadBalancer

# View MetalLB speaker logs
microk8s kubectl logs -n metallb-system -l app=metallb,component=speaker
```

### 4. Kubernetes Dashboard

```bash
# Enable dashboard
microk8s enable dashboard

# Get dashboard token
microk8s kubectl -n kube-system create token dashboard-admin

# Create service account for dashboard
microk8s kubectl create serviceaccount dashboard-admin -n kube-system
microk8s kubectl create clusterrolebinding dashboard-admin \
    --clusterrole=cluster-admin \
    --serviceaccount=kube-system:dashboard-admin

# Expose dashboard via LoadBalancer
microk8s kubectl patch svc kubernetes-dashboard \
    -n kube-system \
    -p '{"spec":{"type":"LoadBalancer","loadBalancerIP":"10.0.1.240"}}'
```

### 5. Ingress Controller

```bash
# Enable ingress
microk8s enable ingress

# Verify ingress controller
microk8s kubectl get pods -n ingress-nginx
```

### 6. Observability (Prometheus + Grafana)

```bash
# Enable observability stack
microk8s enable observability

# Wait for all pods to be ready
microk8s kubectl get pods -n observability

# Access Grafana (port-forward method)
microk8s kubectl port-forward -n observability svc/grafana 3000:3000
```

## Node Labels and Taints

### 1. Label Nodes by Role

```bash
# Label control plane node
microk8s kubectl label node fractal1 node-role.kubernetes.io/control-plane=

# Label worker nodes
microk8s kubectl label node fractal2 node-role.kubernetes.io/worker=
microk8s kubectl label node fractal3 node-role.kubernetes.io/worker=
microk8s kubectl label node fractal4 node-role.kubernetes.io/worker=
microk8s kubectl label node fractal5 node-role.kubernetes.io/worker=
microk8s kubectl label node fractal6 node-role.kubernetes.io/worker=
```

### 2. Label Nodes by Hardware

```bash
# Label 8GB nodes
microk8s kubectl label node fractal1 hardware=pi5-8gb
microk8s kubectl label node fractal2 hardware=pi5-8gb

# Label 4GB nodes
microk8s kubectl label node fractal3 hardware=pi5-4gb
microk8s kubectl label node fractal4 hardware=pi5-4gb
microk8s kubectl label node fractal5 hardware=pi5-4gb
microk8s kubectl label node fractal6 hardware=pi5-4gb
```

### 3. Label Nodes for Database Workloads

```bash
# Label nodes for MongoDB
microk8s kubectl label node fractal1 database=mongodb
microk8s kubectl label node fractal2 database=mongodb
microk8s kubectl label node fractal3 database=mongodb

# Label nodes for Elasticsearch
microk8s kubectl label node fractal4 database=elasticsearch
microk8s kubectl label node fractal5 database=elasticsearch
microk8s kubectl label node fractal6 database=elasticsearch
```

## ARM64 Specific Configuration

### 1. Verify ARM64 Support

```bash
# Check node architecture
microk8s kubectl get nodes -o wide | grep -i arch

# Verify container runtime supports ARM64
microk8s kubectl get nodes -o jsonpath='{.items[*].status.nodeInfo.architecture}'
```

### 2. Configure Image Pull Policy

```bash
# Create daemon configuration for ARM64
sudo tee /var/snap/microk8s/current/args/containerd-template.toml <<EOF
[plugins."io.containerd.grpc.v1.cri".registry]
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
      endpoint = ["https://registry-1.docker.io"]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."registry.k8s.io"]
      endpoint = ["https://registry.k8s.io"]
EOF

# Restart MicroK8s
sudo snap restart microk8s
```

### 3. Test ARM64 Container

```bash
# Deploy ARM64 test pod
microk8s kubectl run test-arm64 --image=arm64v8/nginx:alpine --restart=Never

# Check if pod runs successfully
microk8s kubectl get pod test-arm64
microk8s kubectl describe pod test-arm64

# Clean up
microk8s kubectl delete pod test-arm64
```

## Network Configuration

### 1. Configure Flannel CNI

```bash
# Check current CNI configuration
microk8s kubectl get pods -n kube-system | grep flannel

# Verify pod networking
microk8s kubectl get pods -o wide -A
```

### 2. Verify MetalLB Configuration

```bash
# MetalLB is already configured with the IP pool 10.0.1.240-10.0.1.250
# Verify the configuration
microk8s kubectl get configmap -n metallb-system config -o yaml

# Check MetalLB speaker pods are running
microk8s kubectl get pods -n metallb-system -l app=metallb,component=speaker

# View current LoadBalancer assignments
microk8s kubectl get svc -A -o wide | grep LoadBalancer
```

### 3. Test Load Balancer

```bash
# Deploy test service
microk8s kubectl create deployment test-lb --image=nginx:alpine
microk8s kubectl expose deployment test-lb --port=80 --type=LoadBalancer

# Check assigned IP
microk8s kubectl get svc test-lb

# Test connectivity
curl http://10.0.1.241  # Should show nginx welcome page

# Clean up
microk8s kubectl delete deployment test-lb
microk8s kubectl delete svc test-lb
```

## External Access with ngrok

Since there is no upstream WAN connection, we use ngrok to expose services to the internet for student access.

### 1. Install ngrok

```bash
# Download ngrok for ARM64
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz

# Extract and install
tar xvzf ngrok-v3-stable-linux-arm64.tgz
sudo mv ngrok /usr/local/bin/

# Verify installation
ngrok version
```

### 2. Configure ngrok

```bash
# Sign up at https://ngrok.com and get your auth token
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Create ngrok configuration file
cat <<EOF > ~/.ngrok2/ngrok.yml
version: "2"
authtoken: YOUR_AUTH_TOKEN
tunnels:
  ui-app:
    addr: 10.0.1.243:80
    proto: http
    hostname: nosql-showdown.ngrok.io  # Custom subdomain if you have a paid plan
  api:
    addr: 10.0.1.244:3000
    proto: http
  kibana:
    addr: 10.0.1.242:5601
    proto: http
  grafana:
    addr: 10.0.1.245:3000
    proto: http
EOF
```

### 3. Run ngrok for Student Access

```bash
# Start all tunnels
ngrok start --all

# Or start specific tunnel
ngrok http 10.0.1.243:80 --host-header=rewrite

# The output will show URLs like:
# Forwarding  https://abc123.ngrok.io -> 10.0.1.243:80
```

### 4. Create ngrok Service (Optional)

```bash
# Create systemd service for persistent ngrok
sudo tee /etc/systemd/system/ngrok.service <<EOF
[Unit]
Description=ngrok tunnel service
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/usr/local/bin/ngrok start --all --config /home/pi/.ngrok2/ngrok.yml
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable ngrok
sudo systemctl start ngrok
sudo systemctl status ngrok
```

### 5. Share URLs with Students

```bash
# Get current tunnel URLs
curl -s localhost:4040/api/tunnels | jq '.tunnels[] | {name: .name, public_url: .public_url}'

# Example output:
# {
#   "name": "ui-app",
#   "public_url": "https://abc123.ngrok.io"
# }
```

### 6. Monitor ngrok Status

```bash
# Access ngrok web interface
# Browse to http://localhost:4040

# View traffic logs
curl -s localhost:4040/api/requests/http | jq
```

## Security Configuration

### 1. Enable RBAC

```bash
# RBAC is enabled by default in MicroK8s
# Verify RBAC is enabled
microk8s kubectl auth can-i get pods --as=system:anonymous
```

### 2. Configure Network Policies

```bash
# Install Calico for NetworkPolicy support (optional)
microk8s enable calico

# Test network policy
cat <<EOF | microk8s kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF
```

### 3. Configure Pod Security Standards

```bash
# Enable Pod Security Standards
microk8s kubectl label namespace default \
    pod-security.kubernetes.io/enforce=restricted \
    pod-security.kubernetes.io/audit=restricted \
    pod-security.kubernetes.io/warn=restricted
```

## Storage Configuration

### 1. Configure Persistent Volumes

```bash
# Create storage directory on each node
sudo mkdir -p /opt/microk8s/storage

# Set proper permissions
sudo chown -R root:microk8s /opt/microk8s/storage
sudo chmod -R 775 /opt/microk8s/storage

# Verify hostpath-storage is working
microk8s kubectl get storageclass hostpath-storage
```

### 2. Configure Local Storage for Databases

```bash
# Create database storage directories on SD card
sudo mkdir -p /opt/microk8s/storage/mongodb
sudo mkdir -p /opt/microk8s/storage/elasticsearch
sudo mkdir -p /opt/microk8s/storage/postgres

# Set proper permissions
sudo chown -R root:microk8s /opt/microk8s/storage/
sudo chmod -R 775 /opt/microk8s/storage/
```

## Monitoring and Observability

### 1. Configure Prometheus

```bash
# Verify Prometheus is running
microk8s kubectl get pods -n observability | grep prometheus

# Access Prometheus UI
microk8s kubectl port-forward -n observability svc/prometheus 9090:9090
```

### 2. Configure Grafana

```bash
# Get Grafana admin password
microk8s kubectl get secret grafana-admin -n observability -o jsonpath='{.data.password}' | base64 -d

# Access Grafana UI
microk8s kubectl port-forward -n observability svc/grafana 3000:3000
```

### 3. Enable Metrics Server

```bash
# Enable metrics server
microk8s enable metrics-server

# Verify metrics collection
microk8s kubectl top nodes
microk8s kubectl top pods -A
```

## Troubleshooting

### Common Issues

1. **Nodes not joining cluster**
   ```bash
   # Check firewall
   sudo ufw disable
   
   # Check network connectivity
   ping 10.0.1.3
   
   # Check MicroK8s status
   microk8s status
   
   # Reset and retry
   microk8s reset
   ```

2. **Pods stuck in Pending state**
   ```bash
   # Check node resources
   microk8s kubectl describe nodes
   
   # Check events
   microk8s kubectl get events
   
   # Check scheduler
   microk8s kubectl get pods -n kube-system | grep scheduler
   ```

3. **DNS resolution issues**
   ```bash
   # Check CoreDNS
   microk8s kubectl get pods -n kube-system | grep coredns
   
   # Test DNS resolution
   microk8s kubectl run test-dns --image=busybox --restart=Never -- nslookup kubernetes.default
   ```

### Diagnostic Commands

```bash
# Check cluster health
microk8s kubectl cluster-info
microk8s kubectl get componentstatuses

# Check node status
microk8s kubectl get nodes -o wide
microk8s kubectl describe nodes

# Check system pods
microk8s kubectl get pods -n kube-system
microk8s kubectl get pods -n metallb-system
microk8s kubectl get pods -n observability

# Check logs
microk8s kubectl logs -n kube-system -l k8s-app=kube-dns
journalctl -u snap.microk8s.daemon -f
```

## Performance Optimization

### 1. Configure Resource Limits

```bash
# Set kubelet configuration
sudo tee /var/snap/microk8s/current/args/kubelet <<EOF
--max-pods=50
--kube-reserved=cpu=100m,memory=256Mi
--system-reserved=cpu=100m,memory=256Mi
--eviction-hard=memory.available<100Mi
--eviction-soft=memory.available<200Mi
--eviction-soft-grace-period=memory.available=30s
EOF

# Restart MicroK8s
sudo snap restart microk8s
```

### 2. Configure Container Runtime

```bash
# Optimize containerd configuration
sudo tee /var/snap/microk8s/current/args/containerd-template.toml <<EOF
[plugins."io.containerd.grpc.v1.cri"]
  max_container_log_line_size = 16384
  max_concurrent_downloads = 3
[plugins."io.containerd.grpc.v1.cri".containerd]
  snapshotter = "overlayfs"
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
  SystemdCgroup = true
EOF
```

### 3. Configure Kubernetes API Server

```bash
# Configure API server options
sudo tee /var/snap/microk8s/current/args/kube-apiserver <<EOF
--max-requests-inflight=400
--max-mutating-requests-inflight=200
--request-timeout=60s
--min-request-timeout=1800
EOF
```

## Backup and Recovery

### 1. Backup Cluster State

```bash
# Create backup script
cat <<EOF > ~/backup-cluster.sh
#!/bin/bash
BACKUP_DIR="/opt/backup/k8s-$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p $BACKUP_DIR

# Backup etcd
sudo cp -r /var/snap/microk8s/current/var/kubernetes/backend $BACKUP_DIR/

# Backup certificates
sudo cp -r /var/snap/microk8s/current/certs $BACKUP_DIR/

# Backup configuration
sudo cp -r /var/snap/microk8s/current/args $BACKUP_DIR/

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x ~/backup-cluster.sh
```

### 2. Recovery Procedures

```bash
# Stop MicroK8s
sudo snap stop microk8s

# Restore from backup
sudo cp -r /opt/backup/k8s-YYYYMMDD-HHMMSS/* /var/snap/microk8s/current/

# Start MicroK8s
sudo snap start microk8s

# Verify cluster health
microk8s status --wait-ready
```

## Next Steps

After completing the MicroK8s setup:

1. **Deploy Databases**: Install MongoDB and Elasticsearch operators
2. **Configure Monitoring**: Set up detailed monitoring dashboards
3. **Deploy Applications**: Install the React UI and Node.js API
4. **Configure Networking**: Set up ingress controllers and load balancers
5. **Security Hardening**: Implement network policies and RBAC

This MicroK8s cluster provides a robust, ARM64-compatible foundation for the Epic Interactive NoSQL Showdown demonstration system. 