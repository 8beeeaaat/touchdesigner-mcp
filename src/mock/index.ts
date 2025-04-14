async function initMocks() {
	const { node } = await import("./node.js");
	node.listen();
}

export { initMocks };
