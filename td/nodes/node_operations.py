def createNode(nodeName, family, nodeType, parameters):
    try:
        # Get node class and create node
        node_class = get_node_type_class(family, nodeType)
        new_node = op(parent().parent()).create(node_class, nodeName)
        new_node.viewer = True
        # Process parameters
        if parameters:
            # Use common utilities
            result = parse_json_params(parameters)
            if result.success:
                params_dict = result.data
                logger.info(
                    f"Parameters parsed successfully: {len(params_dict)} parameters"
                )

                # Set parameters on node
                for k, v in params_dict.items():
                    try:
                        setattr(new_node.par, k, v)
                        logger.info(f"Set parameter {k} = {v}")
                    except Exception as param_err:
                        logger.error(f"Error setting parameter {k}: {param_err}")
            else:
                logger.error(f"Parameter parsing failed: {result.error}")

        return new_node
    except Exception as e:
        logger.error(f"Error creating node: {e}", exception=e)
        raise


def updateNode(node, parameters, connection=None):
    log_message(f"Updating node: {node.name}", "INFO")

    try:
        # Update parameters
        if parameters:
            _update_node_parameters(node, parameters)

        # Update connections
        if connection:
            _handle_node_connection(connection)

        log_message("Node update completed successfully")
        return node
    except Exception as e:
        log_message(f"Error updating node: {e}", "ERROR")
        traceback.print_exc()
        raise


def deleteNode(nodePath):
    log_message(f"Deleting node: {nodePath}")

    try:
        # Check if node exists
        node = op(nodePath)
        if not node:
            raise ValueError(f"Node not found: {nodePath}")

        # Delete node
        node.destroy()
        log_message(f"Node {nodePath} deleted successfully")
        return True
    except Exception as e:
        log_message(f"Error deleting node: {e}", "ERROR")
        raise


def _update_node_parameters(node, parameters):
    log_message(f"Updating {len(parameters)} parameters...")

    for k, v in parameters.items():
        try:
            log_message(f"Processing parameter: {k} = {v}")

            if hasattr(node.par, k):
                setattr(node.par, k, v)
                log_message(f"Updated parameter {k} = {v}")
            else:
                log_message(f"Parameter {k} not found on node {node.name}", "WARNING")
        except Exception as param_err:
            log_message(f"Error updating parameter {k}: {param_err}", "ERROR")
            traceback.print_exc()


def _handle_node_connection(connection):
    if not connection:
        log_message("No connection data provided", "WARNING")
        return

    # Check required parameters
    if not connection.get("fromNodePath"):
        log_message("Missing required parameter: fromNodePath", "ERROR")
        raise ValueError("Missing required parameter: fromNodePath")

    if not connection.get("toNodePath"):
        log_message("Missing required parameter: toNodePath", "ERROR")
        raise ValueError("Missing required parameter: toNodePath")

    from_node_path = connection.get("fromNodePath")
    to_node_path = connection.get("toNodePath")
    to_index = connection.get("toIndex", 0)
    out_index = connection.get("outIndex", 0)
    clear_existing = connection.get("clearExisting", False)

    log_message(
        f"Connecting {from_node_path}[{out_index}] -> {to_node_path}[{to_index}]"
    )

    # Get nodes
    from_node = op(from_node_path)
    if not from_node:
        log_message(f"Source node not found: {from_node_path}", "ERROR")
        raise ValueError(f"Source node not found: {from_node_path}")

    to_node = op(to_node_path)
    if not to_node:
        log_message(f"Target node not found: {to_node_path}", "ERROR")
        raise ValueError(f"Target node not found: {to_node_path}")

    # Clear existing connections
    if clear_existing:
        log_message(f"Clearing existing connections on {to_node_path} input {to_index}")
        to_node.inputConnectors[to_index].disconnect()

    # Connect nodes
    try:
        from_node.outputConnectors[out_index].connect(to_node.inputConnectors[to_index])
        log_message(f"Connection successful")
    except Exception as e:
        log_message(f"Error connecting nodes: {e}", "ERROR")
        traceback.print_exc()
        raise
