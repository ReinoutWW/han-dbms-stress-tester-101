#!/bin/bash

# Deployment Script for Raspberry Pi Kubernetes Cluster
# This script automates the deployment of the NoSQL Showdown to a Pi cluster

set -e

echo "🍓 NoSQL Showdown - Raspberry Pi Cluster Deployment"
echo "=================================================="

# Configuration
NAMESPACE_APP="nosql-showdown"
NAMESPACE_DB="databases"
METALLB_RANGE="10.0.1.240-10.0.1.250"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check prerequisites
check_prerequisites() {
    echo -e "\n${YELLOW}📋 Checking prerequisites...${NC}"
    
    # Check if MicroK8s
    if command -v microk8s &> /dev/null; then
        echo -e "${BLUE}ℹ️  Detected MicroK8s installation${NC}"
        # Check cluster connection
        if ! microk8s kubectl cluster-info &> /dev/null; then
            echo -e "${RED}❌ Cannot connect to MicroK8s cluster${NC}"
            echo "Please ensure MicroK8s is running"
            exit 1
        fi
    else
        # Check kubectl
        if ! command -v kubectl &> /dev/null; then
            echo -e "${RED}❌ kubectl not found${NC}"
            exit 1
        fi
        # Check cluster connection
        if ! kubectl cluster-info &> /dev/null; then
            echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
            echo "Please ensure kubectl is configured correctly"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to setup cluster addons
setup_cluster_addons() {
    echo -e "\n${YELLOW}🔧 Setting up cluster addons...${NC}"
    
    if command -v microk8s &> /dev/null; then
        echo "Enabling MicroK8s addons..."
        
        # Enable required addons
        microk8s enable dns || true
        microk8s enable storage || true
        microk8s enable metallb:${METALLB_RANGE} || true
        
        echo -e "${GREEN}✅ MicroK8s addons enabled${NC}"
    else
        echo -e "${BLUE}ℹ️  Assuming addons are already configured${NC}"
    fi
}

# Function to create namespaces
create_namespaces() {
    echo -e "\n${YELLOW}📁 Creating namespaces...${NC}"
    
    # Create application namespace
    microk8s kubectl create namespace ${NAMESPACE_APP} --dry-run=client -o yaml | microk8s kubectl apply -f -
    
    # Create databases namespace
    microk8s kubectl apply -f k8s/namespaces/databases-namespace.yaml
    
    echo -e "${GREEN}✅ Namespaces created${NC}"
}

# Function to deploy databases
deploy_databases() {
    echo -e "\n${YELLOW}🗄️  Deploying databases...${NC}"
    
    # Deploy PostgreSQL
    echo "Deploying PostgreSQL..."
    if [ -f "k8s/deployments/postgres-deployment-pi.yaml" ]; then
        microk8s kubectl apply -f k8s/deployments/postgres-deployment-pi.yaml
    else
        microk8s kubectl apply -f k8s/deployments/postgres-deployment.yaml
    fi
    
    # Deploy MongoDB (Pi-optimized)
    echo "Deploying MongoDB..."
    if [ -f "k8s/databases/mongodb-deployment-pi.yaml" ]; then
        microk8s kubectl apply -f k8s/databases/mongodb-deployment-pi.yaml
    else
        microk8s kubectl apply -f k8s/databases/mongodb-deployment.yaml
    fi
    
    # Deploy Elasticsearch (Pi-optimized)
    echo "Deploying Elasticsearch..."
    if [ -f "k8s/databases/elasticsearch-deployment-pi.yaml" ]; then
        microk8s kubectl apply -f k8s/databases/elasticsearch-deployment-pi.yaml
    else
        microk8s kubectl apply -f k8s/databases/elasticsearch-deployment.yaml
    fi
    
    echo -e "${GREEN}✅ Databases deployed${NC}"
}

# Function to wait for databases
wait_for_databases() {
    echo -e "\n${YELLOW}⏳ Waiting for databases to be ready...${NC}"
    
    # Wait for PostgreSQL
    echo "Waiting for PostgreSQL..."
    microk8s kubectl wait --for=condition=ready pod -l app=postgres -n ${NAMESPACE_APP} --timeout=300s || true
    
    # Wait for MongoDB
    echo "Waiting for MongoDB..."
    microk8s kubectl wait --for=condition=ready pod -l app=mongodb -n ${NAMESPACE_DB} --timeout=300s || true
    
    # Wait for Elasticsearch
    echo "Waiting for Elasticsearch..."
    microk8s kubectl wait --for=condition=ready pod -l app=elasticsearch -n ${NAMESPACE_DB} --timeout=300s || true
    
    echo -e "${GREEN}✅ Databases are ready${NC}"
}

# Function to initialize database schemas
initialize_databases() {
    echo -e "\n${YELLOW}🔨 Initializing database schemas...${NC}"
    
    # Run Prisma migrations
    if [ -f "k8s/jobs/prisma-migrate-job-pi.yaml" ]; then
        echo "Running Prisma migrations..."
        microk8s kubectl apply -f k8s/jobs/prisma-migrate-job-pi.yaml
        # Wait for migration to complete
        microk8s kubectl wait --for=condition=complete job/prisma-migrate -n ${NAMESPACE_APP} --timeout=300s || true
    elif [ -f "k8s/jobs/prisma-migrate-job.yaml" ]; then
        echo "Running Prisma migrations..."
        microk8s kubectl apply -f k8s/jobs/prisma-migrate-job.yaml
        # Wait for migration to complete
        microk8s kubectl wait --for=condition=complete job/prisma-migrate -n ${NAMESPACE_APP} --timeout=300s || true
    fi
    
    echo -e "${GREEN}✅ Database schemas initialized${NC}"
}

# Function to deploy application
deploy_application() {
    echo -e "\n${YELLOW}🚀 Deploying application...${NC}"
    
    # Deploy API (Pi-optimized)
    echo "Deploying API service..."
    if [ -f "k8s/deployments/api-deployment-pi.yaml" ]; then
        microk8s kubectl apply -f k8s/deployments/api-deployment-pi.yaml
    else
        microk8s kubectl apply -f k8s/deployments/api-deployment.yaml
    fi
    microk8s kubectl apply -f k8s/services/api-service.yaml
    
    # Deploy UI (Pi-optimized)
    echo "Deploying UI service..."
    if [ -f "k8s/deployments/ui-deployment-pi.yaml" ]; then
        microk8s kubectl apply -f k8s/deployments/ui-deployment-pi.yaml
    else
        microk8s kubectl apply -f k8s/deployments/ui-deployment.yaml
    fi
    
    echo -e "${GREEN}✅ Application deployed${NC}"
}

# Function to load sample data
load_sample_data() {
    echo -e "\n${YELLOW}📊 Loading sample data...${NC}"
    
    read -p "Do you want to load the Kaggle dataset? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Check if data loading job exists
        if [ -f "k8s/jobs/load-kaggle-data-pi.yaml" ]; then
            echo "Starting data load job..."
            microk8s kubectl apply -f k8s/jobs/load-kaggle-data-pi.yaml
            
            echo -e "${BLUE}ℹ️  Data loading job started. This may take 30-60 minutes.${NC}"
            echo "Monitor progress with: microk8s kubectl logs -n ${NAMESPACE_APP} job/load-kaggle-data -f"
        elif [ -f "k8s/jobs/load-kaggle-data.yaml" ]; then
            echo "Starting data load job..."
            microk8s kubectl apply -f k8s/jobs/load-kaggle-data.yaml
            
            echo -e "${BLUE}ℹ️  Data loading job started. This may take 30-60 minutes.${NC}"
            echo "Monitor progress with: microk8s kubectl logs -n ${NAMESPACE_APP} job/load-kaggle-data -f"
        else
            echo -e "${YELLOW}⚠️  Data loading job not found${NC}"
        fi
    fi
}

# Function to display access information
display_access_info() {
    echo -e "\n${GREEN}✅ Deployment Complete!${NC}"
    echo -e "\n${YELLOW}📋 Access Information:${NC}"
    
    # Get service IPs
    UI_IP=$(microk8s kubectl get svc ui -n ${NAMESPACE_APP} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    API_IP=$(microk8s kubectl get svc api -n ${NAMESPACE_APP} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    
    echo -e "${BLUE}Web UI:${NC} http://${UI_IP:-10.0.1.243}"
    echo -e "${BLUE}API:${NC} http://${API_IP:-10.0.1.244}:3000"
    
    echo -e "\n${YELLOW}📋 Useful Commands:${NC}"
    echo "• Check pod status: microk8s kubectl get pods -A"
    echo "• View logs: microk8s kubectl logs -n ${NAMESPACE_APP} deployment/api"
    echo "• Port forward UI: microk8s kubectl port-forward -n ${NAMESPACE_APP} svc/ui 8080:80"
    echo "• Check data load: microk8s kubectl logs -n ${NAMESPACE_APP} job/load-kaggle-data"
    
    echo -e "\n${YELLOW}📋 Database Access:${NC}"
    echo "• MongoDB: mongodb://admin:mongodb_pass_2024@mongodb.${NAMESPACE_DB}.svc.cluster.local:27017"
    echo "• Elasticsearch: http://elasticsearch.${NAMESPACE_DB}.svc.cluster.local:9200"
    echo "• PostgreSQL: postgresql://showdown_user:showdown_pass_2024@postgres.${NAMESPACE_APP}.svc.cluster.local:5432/showdown_db"
}

# Function to run health checks
run_health_checks() {
    echo -e "\n${YELLOW}🏥 Running health checks...${NC}"
    
    # Check pod status
    echo "Pod Status:"
    microk8s kubectl get pods -n ${NAMESPACE_APP}
    microk8s kubectl get pods -n ${NAMESPACE_DB}
    
    # Check services
    echo -e "\nService Status:"
    microk8s kubectl get svc -n ${NAMESPACE_APP}
    microk8s kubectl get svc -n ${NAMESPACE_DB}
    
    # Test API health
    API_POD=$(microk8s kubectl get pod -n ${NAMESPACE_APP} -l app=api -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ ! -z "$API_POD" ]; then
        echo -e "\nAPI Health Check:"
        microk8s kubectl exec -n ${NAMESPACE_APP} ${API_POD} -- curl -s http://localhost:3000/health || echo "API not ready yet"
    fi
}

# Main deployment flow
main() {
    echo -e "${BLUE}Starting deployment at $(date)${NC}"
    
    check_prerequisites
    setup_cluster_addons
    create_namespaces
    deploy_databases
    wait_for_databases
    initialize_databases
    deploy_application
    
    # Wait for application to be ready
    echo -e "\n${YELLOW}⏳ Waiting for application pods...${NC}"
    sleep 30
    
    run_health_checks
    load_sample_data
    display_access_info
    
    echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
}

# Run main function
main "$@"