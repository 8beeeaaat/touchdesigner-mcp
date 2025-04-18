import json
import traceback

from td.api.api_routes import router
from td.handlers.request_handlers import (
    CreateNodeHandler,
    DeleteNodeHandler,
    GetDataHandler,
    GetNodeHandler,
    ListNodesHandler,
    NodeDefaultParametersHandler,
    SendDataHandler,
    ServerInfoHandler,
    UpdateNodeHandler,
)
from td.nodes.node_operations import createNode, deleteNode, updateNode
from td.utils.utils import log_message


# Main server initialization
def main():
    log_message("Starting MCP Web Server...")

    # Initialize routes
    # (This will be done in the api_routes module)

    log_message("MCP Web Server started successfully.")


if __name__ == "__main__":
    main()
