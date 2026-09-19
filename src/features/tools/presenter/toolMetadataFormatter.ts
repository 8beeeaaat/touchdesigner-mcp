import type { ToolMetadata } from "../metadata/touchDesignerToolMetadata.js";
import {
	type FormatterOptions,
	finalizeFormattedText,
	mergeFormatterOptions,
} from "./responseFormatter.js";

interface ToolMetadataFormatterOptions extends Partial<FormatterOptions> {
	filter?: string;
}

export function formatToolMetadata(
	entries: ToolMetadata[],
	options?: ToolMetadataFormatterOptions,
): string {
	const { detailLevel, responseFormat } = mergeFormatterOptions(options);
	if (entries.length === 0) {
		return finalizeFormattedText(
			"No tools matched the requested criteria.",
			{ detailLevel, responseFormat },
			{
				context: { filter: options?.filter, totalTools: 0 },
			},
		);
	}

	const sortedEntries = [...entries].sort((a, b) =>
		a.modulePath.localeCompare(b.modulePath),
	);

	// `example` is carried only at `detailed`. It used to reach no output at
	// all: the only thing that read it built a string handed over as `text`,
	// and neither path out renders that — the detailedPayload template prints
	// the title and the serialized payload, and json/yaml serialize this
	// object, which did not carry the field. So thirteen examples were written
	// and maintained for nothing, and two changes to them this cycle were made
	// on the assumption they landed somewhere.
	//
	// Detailed only, because that is the level whose job is "give me
	// everything": measured at 3613 bytes across the thirteen tools, roughly
	// 900 tokens, which is worth paying once on an explicit request and not on
	// every summary listing.
	const withExamples = detailLevel === "detailed";
	const structured = sortedEntries.map((entry) => ({
		category: entry.category,
		description: entry.description,
		...(withExamples ? { example: entry.example } : {}),
		functionName: entry.functionName,
		modulePath: entry.modulePath,
		notes: entry.notes,
		parameters: entry.parameters,
		returns: entry.returns,
		tool: entry.tool,
	}));

	const text = buildText(sortedEntries, detailLevel);

	return finalizeFormattedText(
		text,
		{ detailLevel, responseFormat },
		{
			context: {
				filter: options?.filter,
				totalTools: sortedEntries.length,
			},
			structured,
			template: detailLevel === "detailed" ? "detailedPayload" : undefined,
		},
	);
}

function buildText(
	entries: ToolMetadata[],
	detailLevel: NonNullable<FormatterOptions["detailLevel"]>,
): string {
	switch (detailLevel) {
		case "minimal":
			return formatTree(entries);
		case "detailed":
			return formatDetailed(entries);
		default:
			return formatSummary(entries);
	}
}

function formatTree(entries: ToolMetadata[]): string {
	const segmentsList = entries.map((entry) =>
		entry.modulePath.replace(/^\.\//, "").split("/"),
	);
	const commonSegments = findCommonDirectorySegments(segmentsList);
	const basePath =
		commonSegments.length > 0 ? `${commonSegments.join("/")}/` : "./";

	const relativePaths = entries.map((entry, index) => {
		const segments = segmentsList[index];
		const relative = segments.slice(commonSegments.length).join("/");
		const connector = index === entries.length - 1 ? "└──" : "├──";
		return `${connector} ${relative} — ${entry.description}`;
	});

	return ["Filesystem blueprint:", basePath, ...relativePaths].join("\n");
}

function formatSummary(entries: ToolMetadata[]): string {
	return entries
		.map((entry) => {
			const params =
				entry.parameters.length > 0
					? entry.parameters
							.map(
								(param) =>
									`- ${param.name}${param.required ? "" : "?"} (${param.type})${param.description ? ` — ${param.description}` : ""}`,
							)
							.join("\n")
					: "- (no parameters)";

			return `${entry.functionName} (${entry.modulePath})
Tool: ${entry.tool}
Category: ${entry.category}
Description: ${entry.description}
Parameters:
${params}
Returns: ${entry.returns}`;
		})
		.join("\n\n");
}

function formatDetailed(entries: ToolMetadata[]): string {
	return entries
		.map((entry) => {
			const params =
				entry.parameters.length > 0
					? entry.parameters
							.map(
								(param) =>
									`- ${param.name}${param.required ? "" : "?"} (${param.type})${param.description ? ` — ${param.description}` : ""}`,
							)
							.join("\n")
					: "- (no parameters)";

			const sections = [
				`### ${entry.functionName} (${entry.tool})`,
				`Module: ${entry.modulePath}`,
				`Category: ${entry.category}`,
				`Description: ${entry.description}`,
				"Parameters:",
				params,
				`Returns: ${entry.returns}`,
				"Example:",
				"```ts",
				entry.example.trim(),
				"```",
			];

			if (entry.notes) {
				sections.push(`Notes: ${entry.notes}`);
			}

			return sections.join("\n");
		})
		.join("\n\n---\n\n");
}

function findCommonDirectorySegments(segmentsList: string[][]): string[] {
	if (segmentsList.length === 0) {
		return [];
	}

	const directories = segmentsList.map((parts) =>
		parts.slice(0, Math.max(parts.length - 1, 0)),
	);

	let prefix = directories[0];
	for (let i = 1; i < directories.length; i += 1) {
		const current = directories[i];
		let j = 0;
		while (
			j < prefix.length &&
			j < current.length &&
			prefix[j] === current[j]
		) {
			j += 1;
		}
		prefix = prefix.slice(0, j);
		if (prefix.length === 0) {
			break;
		}
	}
	return prefix;
}
