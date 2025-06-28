IMAGE_NAME=touchdesigner-mcp-server
CONTAINER_NAME=temp-mcp
SRC_MODULES_PATH=/app/td/modules
DEST_MODULES_PATH=td/

# Docker-based build
build:
	docker-compose build
	docker create --name $(CONTAINER_NAME) $(IMAGE_NAME)
	docker cp $(CONTAINER_NAME):$(SRC_MODULES_PATH) $(DEST_MODULES_PATH)
	docker rm $(CONTAINER_NAME)

# Docker-based CI build
ci-build:
	@echo "Building with Docker..."
	docker-compose build
	docker create --name $(CONTAINER_NAME) $(IMAGE_NAME)
	docker cp $(CONTAINER_NAME):$(SRC_MODULES_PATH) $(DEST_MODULES_PATH)
	docker cp $(CONTAINER_NAME):/app/dist ./
	docker rm $(CONTAINER_NAME)
	@echo "Creating selective td directory package..."
	mkdir -p temp_td
	cp td/import_modules.py temp_td/
	cp td/mcp_webserver_base.tox temp_td/
	cp -r td/modules temp_td/
	cd temp_td && zip -r ../touchdesigner-mcp-td.zip .
	rm -rf temp_td
	@echo "Docker-based CI build completed!"
