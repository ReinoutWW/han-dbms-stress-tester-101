#!/bin/bash

# ARM64 Image Build Script for Raspberry Pi Cluster
# This script builds multi-architecture Docker images that work on both ARM64 and x86_64

set -e

echo "🍓 Building Multi-Architecture Images for Raspberry Pi Cluster"
echo "============================================================"

# Configuration
REGISTRY="${DOCKER_REGISTRY:-docker.io}"
NAMESPACE="${DOCKER_NAMESPACE:-nosql-showdown}"
API_VERSION="${API_VERSION:-pi-1.0.0}"
UI_VERSION="${UI_VERSION:-pi-1.0.0}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    # Check if buildx is available
    if ! docker buildx version &> /dev/null; then
        echo -e "${RED}❌ Docker buildx is not available${NC}"
        echo "Please update Docker to version 19.03 or later"
        exit 1
    fi
    
    # Check if data files exist for API
    if [ ! -f "api/data/kaggle-finance/transactions_data.csv" ]; then
        echo -e "${YELLOW}⚠️  Warning: Kaggle dataset not found in api/data/kaggle-finance/${NC}"
        echo "The API image will be built without embedded data"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to setup buildx
setup_buildx() {
    echo -e "\n${YELLOW}🔧 Setting up Docker buildx...${NC}"
    
    # Check if pi-builder already exists
    if docker buildx ls | grep -q "pi-builder"; then
        echo "Using existing pi-builder"
        docker buildx use pi-builder
    else
        echo "Creating new buildx instance"
        docker buildx create --name pi-builder --use
    fi
    
    # Bootstrap the builder
    docker buildx inspect pi-builder --bootstrap
    
    echo -e "${GREEN}✅ Buildx ready${NC}"
}

# Function to build API image
build_api_image() {
    echo -e "\n${YELLOW}🏗️  Building API image...${NC}"
    
    cd api
    
    # Build multi-architecture image
    echo "Building ${NAMESPACE}/api:${API_VERSION}"
    
    docker buildx build \
        --platform linux/arm64,linux/amd64 \
        --tag ${REGISTRY}/${NAMESPACE}/api:${API_VERSION} \
        --tag ${REGISTRY}/${NAMESPACE}/api:latest-arm64 \
        --file Dockerfile.arm64 \
        --push \
        .
    
    cd ..
    
    echo -e "${GREEN}✅ API image built successfully${NC}"
}

# Function to build UI image
build_ui_image() {
    echo -e "\n${YELLOW}🏗️  Building UI image...${NC}"
    
    cd ui
    
    # Build multi-architecture image
    echo "Building ${NAMESPACE}/ui:${UI_VERSION}"
    
    docker buildx build \
        --platform linux/arm64,linux/amd64 \
        --tag ${REGISTRY}/${NAMESPACE}/ui:${UI_VERSION} \
        --tag ${REGISTRY}/${NAMESPACE}/ui:latest-arm64 \
        --file Dockerfile.arm64 \
        --push \
        .
    
    cd ..
    
    echo -e "${GREEN}✅ UI image built successfully${NC}"
}

# Function to build images without pushing
build_local_images() {
    echo -e "\n${YELLOW}🏗️  Building images locally (no push)...${NC}"
    
    # Build API
    cd api
    docker buildx build \
        --platform linux/arm64 \
        --tag ${NAMESPACE}/api:${API_VERSION} \
        --file Dockerfile.arm64 \
        --load \
        .
    cd ..
    
    # Build UI
    cd ui
    docker buildx build \
        --platform linux/arm64 \
        --tag ${NAMESPACE}/ui:${UI_VERSION} \
        --file Dockerfile.arm64 \
        --load \
        .
    cd ..
    
    echo -e "${GREEN}✅ Local images built successfully${NC}"
}

# Function to save images for offline transfer
save_images_for_transfer() {
    echo -e "\n${YELLOW}💾 Saving images for offline transfer...${NC}"
    
    mkdir -p images
    
    # Save API image
    echo "Saving API image..."
    docker save ${NAMESPACE}/api:${API_VERSION} | gzip > images/nosql-api-${API_VERSION}.tar.gz
    
    # Save UI image
    echo "Saving UI image..."
    docker save ${NAMESPACE}/ui:${UI_VERSION} | gzip > images/nosql-ui-${UI_VERSION}.tar.gz
    
    # Create transfer script
    cat > images/load-images.sh << 'EOF'
#!/bin/bash
# Load images on Raspberry Pi nodes

echo "Loading Docker images..."

for image in *.tar.gz; do
    echo "Loading $image..."
    docker load < $image
done

echo "✅ All images loaded successfully"
echo ""
echo "Images available:"
docker images | grep nosql-showdown
EOF
    
    chmod +x images/load-images.sh
    
    echo -e "${GREEN}✅ Images saved to images/ directory${NC}"
    echo -e "${YELLOW}📋 To transfer to Pi nodes:${NC}"
    echo "  1. Copy images/ directory to each Pi node"
    echo "  2. Run ./load-images.sh on each node"
}

# Main menu
main_menu() {
    echo -e "\n${YELLOW}📋 Build Options:${NC}"
    echo "1. Build and push to registry (recommended)"
    echo "2. Build locally only (for testing)"
    echo "3. Build and save for offline transfer"
    echo "4. Setup buildx only"
    echo "5. Exit"
    
    read -p "Select option (1-5): " choice
    
    case $choice in
        1)
            check_prerequisites
            setup_buildx
            build_api_image
            build_ui_image
            echo -e "\n${GREEN}✅ All images built and pushed to registry${NC}"
            echo -e "${YELLOW}📋 Images available at:${NC}"
            echo "  - ${REGISTRY}/${NAMESPACE}/api:${API_VERSION}"
            echo "  - ${REGISTRY}/${NAMESPACE}/ui:${UI_VERSION}"
            ;;
        2)
            check_prerequisites
            setup_buildx
            build_local_images
            echo -e "\n${GREEN}✅ Local images built${NC}"
            docker images | grep ${NAMESPACE}
            ;;
        3)
            check_prerequisites
            setup_buildx
            build_local_images
            save_images_for_transfer
            ;;
        4)
            setup_buildx
            ;;
        5)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            exit 1
            ;;
    esac
}

# Run main menu
main_menu

echo -e "\n${GREEN}🎉 Build process completed!${NC}"