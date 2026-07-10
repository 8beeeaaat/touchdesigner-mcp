/**
 * Python script builder for GET_TOP_IMAGE.
 *
 * `get_top_image` has no dedicated API endpoint: it reuses the same
 * `execute_python_script` channel as EXECUTE_PYTHON_SCRIPT. This module only
 * builds the script text that gets sent over that channel.
 */

export interface GetTopImageScriptParams {
	nodePath: string;
	maxSize?: number;
}

/**
 * Builds a Python script that captures the current output of a TOP node as a
 * base64-encoded JPEG and assigns it to `result` (the variable the TD-side
 * script executor extracts as the return value).
 *
 * When `maxSize` is set and the TOP's longer dimension exceeds it, a
 * temporary `td.resolutionTOP` is chained onto the node to downscale (aspect
 * preserved) before capture, then destroyed in a `finally` block so the
 * project is left unmodified.
 *
 * OP type constants are referenced via `td.resolutionTOP` (not the bare
 * `resolutionTOP` global) because the bare global is only injected into the
 * exec namespace by TD-side packages that include #185's global injection
 * fix; `import td` + `td.resolutionTOP` works against both older and newer
 * deployed `mcp_webserver_base.tox` packages.
 */
export function buildGetTopImageScript({
	nodePath,
	maxSize,
}: GetTopImageScriptParams): string {
	// JSON string literals are valid Python string literals for the characters
	// that can appear in a node path, so this is a safe way to embed user input.
	const nodePathLiteral = JSON.stringify(nodePath);
	const maxSizeLiteral =
		maxSize === undefined ? "None" : JSON.stringify(maxSize);

	return `import base64
import td

node_path = ${nodePathLiteral}
max_size = ${maxSizeLiteral}

node = op(node_path)
if node is None:
    raise Exception(f"Node not found at path: {node_path}")
if node.family != 'TOP':
    raise Exception(f"Node at {node_path} is not a TOP (family={node.family})")

tmp_top = None
source_top = node
try:
    if max_size is not None:
        width = node.width
        height = node.height
        longest = max(width, height)
        if longest > max_size:
            if width >= height:
                new_w = max_size
                new_h = max(1, round(height * max_size / width))
            else:
                new_h = max_size
                new_w = max(1, round(width * max_size / height))

            parent = node.parent()
            tmp_name = '__mcp_tmp_res__' + node.name
            existing = parent.op(tmp_name)
            if existing is not None:
                existing.destroy()
            tmp_top = parent.create(td.resolutionTOP, tmp_name)
            tmp_top.inputConnectors[0].connect(node)
            tmp_top.par.outputresolution = 'custom'
            tmp_top.par.resolutionw = new_w
            tmp_top.par.resolutionh = new_h
            source_top = tmp_top

    byte_array = source_top.saveByteArray('.jpg')
    if not byte_array:
        raise Exception(f"Failed to capture image from {node_path}: saveByteArray returned no data")

    result = base64.b64encode(bytes(byte_array)).decode('ascii')
finally:
    if tmp_top is not None:
        tmp_top.destroy()
`;
}
