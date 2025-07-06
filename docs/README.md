# Epic Interactive NoSQL Showdown Documentation

> A Raspberry Pi-powered micro-datacentre for live university demos

## Overview

This documentation covers the complete setup and operation of a portable Kubernetes laboratory using six Raspberry Pi 5 boards. The system demonstrates real-time database performance comparison between MongoDB and Elasticsearch through interactive student participation.

## 📁 Documentation Structure

### 🏗️ Architecture
- [`software-architecture.md`](architecture/software-architecture.md) - System overview and component relationships
- [`system-communication-flow.mmd`](architecture/system-communication-flow.mmd) - Complete system communication flow diagram
- [`system-topology.md`](architecture/system-topology.md) - Physical and logical network topology
- [`data-flow.md`](architecture/data-flow.md) - End-to-end data flow diagrams

### 🔧 Hardware Setup
- [`hardware-inventory.md`](hardware/hardware-inventory.md) - Complete bill of materials and specifications
- [`physical-setup.md`](hardware/physical-setup.md) - Step-by-step hardware assembly guide
- [`network-wiring.md`](hardware/network-wiring.md) - Physical network configuration

### 🌐 Network Configuration
- [`network-design.md`](network/network-design.md) - IP addressing and subnet design
- [`router-configuration.md`](network/router-configuration.md) - FortiGate setup and configuration
- [`static-ip-setup.md`](network/static-ip-setup.md) - Raspberry Pi network configuration

### ☸️ Kubernetes Cluster
- [`microk8s-setup.md`](kubernetes/microk8s-setup.md) - MicroK8s installation and cluster formation
- [`cluster-configuration.md`](kubernetes/cluster-configuration.md) - Cluster addons and configuration
- [`networking.md`](kubernetes/networking.md) - Flannel CNI and MetalLB setup

### 🗄️ Database Setup
- [`mongodb-setup.md`](databases/mongodb-setup.md) - MongoDB replica set configuration
- [`elasticsearch-setup.md`](databases/elasticsearch-setup.md) - Elasticsearch cluster with ECK
- [`database-benchmarking.md`](databases/database-benchmarking.md) - Performance testing and Rally configuration

### 💻 Application Development
- [`application-architecture.md`](application/application-architecture.md) - React UI and Node.js API design
- [`docker-compose-setup.md`](application/docker-compose-setup.md) - Local development environment
- [`kubernetes-deployment.md`](application/kubernetes-deployment.md) - Production deployment manifests

### 📊 Monitoring & Observability
- [`prometheus-grafana-setup.md`](monitoring/prometheus-grafana-setup.md) - Metrics collection and visualization
- [`alerting-configuration.md`](monitoring/alerting-configuration.md) - Alert rules and notifications
- [`dashboard-templates.md`](monitoring/dashboard-templates.md) - Grafana dashboard configurations

### 🔧 Operations
- [`deployment-procedures.md`](operations/deployment-procedures.md) - Deployment and update procedures
- [`backup-restore.md`](operations/backup-restore.md) - Data backup and recovery procedures
- [`disaster-recovery.md`](operations/disaster-recovery.md) - Cluster disaster recovery procedures

### 🐛 Troubleshooting
- [`common-issues.md`](troubleshooting/common-issues.md) - Common problems and solutions
- [`debugging-guide.md`](troubleshooting/debugging-guide.md) - Debugging procedures and tools
- [`performance-tuning.md`](troubleshooting/performance-tuning.md) - Performance optimization guide

### 🔄 Development Workflow
- [`local-development.md`](development/local-development.md) - Local development setup with Docker Compose
- [`ci-cd-pipeline.md`](development/ci-cd-pipeline.md) - Continuous integration and deployment
- [`testing-strategy.md`](development/testing-strategy.md) - Testing procedures and automation

## 🎯 Quick Start

1. **Hardware Setup**: Follow the [hardware setup guide](hardware/physical-setup.md)
2. **Network Configuration**: Configure static IPs using the [network setup guide](network/static-ip-setup.md)
3. **Kubernetes Cluster**: Install and configure MicroK8s using the [cluster setup guide](kubernetes/microk8s-setup.md)
4. **Database Deployment**: Deploy MongoDB and Elasticsearch using the [database setup guides](databases/)
5. **Application Deployment**: Deploy the React UI and Node.js API using the [application deployment guide](application/kubernetes-deployment.md)
6. **Monitoring Setup**: Configure Prometheus and Grafana using the [monitoring guide](monitoring/prometheus-grafana-setup.md)

## 🎮 Demo Execution

The system is designed for interactive educational demonstrations where students can:
- Enter their names and join the competition
- Send stress test requests to both MongoDB and Elasticsearch
- View real-time performance metrics and leaderboards
- Witness live cluster healing demonstrations

## 📋 Prerequisites

- 6× Raspberry Pi 5 boards (2× 8GB, 4× 4GB)
- FortiGate 50G router
- UniFi Lite 8-PoE switch
- USB-C power supplies and Cat-6 cables
- Basic knowledge of Kubernetes and Docker

## 🔗 External Resources

- [Raspberry Pi OS](https://www.raspberrypi.org/software/)
- [MicroK8s Documentation](https://microk8s.io/docs)
- [Elastic Cloud on Kubernetes](https://www.elastic.co/guide/en/cloud-on-k8s/current/index.html)
- [MongoDB Kubernetes Operator](https://github.com/mongodb/mongodb-kubernetes-operator)

## 🤝 Contributing

See the [development workflow documentation](development/local-development.md) for information on contributing to this project.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details. 