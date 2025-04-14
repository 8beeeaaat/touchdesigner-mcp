import { CheckNode } from "./checkNode.js";

export const PROMPTS = {
	CheckNode,
} as const;

type PROMPT_TYPE = (typeof PROMPTS)[keyof typeof PROMPTS];

export function getPrompt<T extends PROMPT_TYPE["name"]>(
	name: T,
): Extract<PROMPT_TYPE, { name: T }> {
	const prompt = Object.values(PROMPTS).find((p) => p.name === name) as
		| Extract<PROMPT_TYPE, { name: T }>
		| undefined;
	if (!prompt) {
		throw new Error(`Prompt ${name} not found`);
	}
	return prompt;
}
