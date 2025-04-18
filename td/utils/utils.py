def log_message(message, level="INFO"):
    if hasattr(logger, "log"):
        if isinstance(level, str):
            level_upper = level.upper()
            if level_upper == "DEBUG":
                logger.debug(message)
            elif level_upper == "WARNING":
                logger.warning(message)
            elif level_upper == "ERROR":
                logger.error(message)
            else:
                logger.info(message)
        else:
            logger.log(message, level)
    else:
        print(f"[{level}] {message}")


def get_node_type_class(node_family, node_type):
    type = node_type.lower() + node_family
    # Try to get TouchDesigner op class
    try:
        if node_family:
            op_class = getattr(op, type)
            return op_class
        else:
            raise ValueError(f"Unknown node family: {node_family}")
    except AttributeError:
        # Try eval as fallback
        try:
            op_class = eval(type)
            return op_class
        except:
            raise ValueError(f"Cannot find node type class for: {type}")
