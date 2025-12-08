IMAGE_NAME=touchdesigner-mcp-server
CONTAINER_NAME=temp-mcp
SRC_MODULES_PATH=/app/td/modules
DEST_MODULES_PATH=td/

build:
	docker compose build
	docker create --name $(CONTAINER_NAME) $(IMAGE_NAME)
	docker cp $(CONTAINER_NAME):$(SRC_MODULES_PATH) $(DEST_MODULES_PATH)
	docker rm $(CONTAINER_NAME)

dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

dev-down:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down

dev-logs:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
