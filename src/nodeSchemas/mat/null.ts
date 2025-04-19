import { z } from "zod";
import { createMATSchema } from "./utils.js";

const nullNode = createMATSchema({
	// nullノードは特有のパラメータがほとんどないため、共通パラメータのみを継承
});

export { nullNode };
