import { z } from "zod";
import { createMATSchema } from "./utils.js";

const depth = createMATSchema({
	// depthノードは特有のパラメータがほぼないため、共通パラメータのみを継承
});

export { depth };
