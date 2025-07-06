# Architecture Documentation

This directory contains the architectural documentation for the Epic Interactive NoSQL Showdown system.

## Files

- **software-architecture.md** - Comprehensive system architecture documentation
- **system-communication-flow.mmd** - Mermaid diagram showing complete communication flow

## System Communication Flow Diagram

The `system-communication-flow.mmd` file contains a visual representation of how all components communicate:

1. **External Access**: Students connect via ngrok tunnels
2. **Admin Laptop**: Acts as the ngrok host bridging external and internal networks
3. **MetalLB LoadBalancers**: Provide stable IPs (10.0.1.240-250) for services
4. **Application Layer**: React UI, Node.js API, and PostgreSQL
5. **Database Layer**: MongoDB and Elasticsearch for benchmarking
6. **Monitoring Layer**: Prometheus and Grafana for real-time metrics

### Viewing the Diagram

You can view the Mermaid diagram in several ways:

1. **GitHub**: GitHub automatically renders `.mmd` files
2. **VS Code**: Install the "Mermaid Preview" extension
3. **Online**: Copy the content to [mermaid.live](https://mermaid.live)
4. **Mermaid CLI**: `mmdc -i system-communication-flow.mmd -o system-communication-flow.png`

### Key Communication Patterns

- **WebSocket**: Real-time bidirectional communication between UI and API
- **Kubernetes DNS**: Internal service discovery
- **MetalLB**: Layer 2 load balancing for service exposure
- **ngrok**: Secure tunneling for external student access 