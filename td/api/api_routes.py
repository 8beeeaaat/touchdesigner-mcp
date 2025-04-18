# Initialize routes
if router_available:
    # Create handler instances
    server_info_handler = ServerInfoHandler(logger)
    get_data_handler = GetDataHandler(logger)
    list_nodes_handler = ListNodesHandler(logger)
    node_default_parameters_handler = NodeDefaultParametersHandler(logger)
    get_node_handler = GetNodeHandler(logger)
    create_node_handler = CreateNodeHandler(logger)
    update_node_handler = UpdateNodeHandler(logger)
    delete_node_handler = DeleteNodeHandler(logger)
    send_data_handler = SendDataHandler(logger)

    # GET routes
    router.add_route("GET", r"^/api/server$", server_info_handler)
    router.add_route("GET", r"^/api/data$", get_data_handler)
    router.add_route("GET", r"^/api/nodes$", list_nodes_handler)
    router.add_route(
        "GET", r"^/api/nodes/default-parameters$", node_default_parameters_handler
    )
    router.add_route("GET", r"^/api/nodes(/.*)?$", get_node_handler)

    # POST routes
    router.add_route("POST", r"^/api/data$", send_data_handler)
    router.add_route("POST", r"^/api/nodes$", create_node_handler)

    # PATCH routes
    router.add_route("PATCH", r"^/api/nodes(/.*)?$", update_node_handler)

    # DELETE routes
    router.add_route("DELETE", r"^/api/nodes(/.*)?$", delete_node_handler)

    log_message("API routes initialized successfully")
