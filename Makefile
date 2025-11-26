IMAGE_NAME=touchdesigner-mcp-server
CONTAINER_NAME=temp-mcp
SRC_MODULES_PATH=/app/td/modules
SRC_DIST_PATH=/app/dist
MCPB_PATH=/app/touchdesigner-mcp.mcpb
DEST_MODULES_PATH=td/
DEST_DIST_PATH=.

# Docker-based build (copies both dist and td/modules from container)
build:
	docker compose build
	docker create --name $(CONTAINER_NAME) $(IMAGE_NAME)
	docker cp $(CONTAINER_NAME):$(SRC_MODULES_PATH) $(DEST_MODULES_PATH)
	docker cp $(CONTAINER_NAME):$(SRC_DIST_PATH) $(DEST_DIST_PATH)
	docker cp $(CONTAINER_NAME):$(MCPB_PATH) ${DEST_DIST_PATH}
	docker rm $(CONTAINER_NAME)

.PHONY: build
