/**
 * Module Help Formatter
 *
 * Formats TouchDesigner module help information with token optimization.
 * Used by GET_MODULE_HELP tool.
 */

import {
	DEFAULT_PRESENTER_FORMAT,
	type PresenterFormat,
	presentStructuredData,
} from "./presenter.js";
import type { FormatterOptions } from "./responseFormatter.js";
import {
	finalizeFormattedText,
	mergeFormatterOptions,
} from "./responseFormatter.js";

/**
 * Module help result structure
 */
export interface ModuleHelpData {
	moduleName?: string;
	helpText?: string;
	[key: string]: unknown;
}

interface ModuleHelpMembers {
	methods: string[];
	properties: string[];
}

interface ModuleHelpContext {
	moduleName: string;
	helpPreview: string;
	fullLength: number;
	sections: string[];
	members: ModuleHelpMembers;
	classInfo?: ClassSummary;
}

/**
 * Format module help result
 */
export function formatModuleHelp(
	data: ModuleHelpData | undefined,
	options?: FormatterOptions,
): string {
	const opts = mergeFormatterOptions(options);

	if (!data?.helpText) {
		return "No help information available.";
	}

	const moduleName = data.moduleName ?? "Unknown";
	const helpText = data.helpText;
	const members = extractModuleMembers(helpText);
	const classInfo = extractClassSummary(helpText);

	if (opts.detailLevel === "detailed") {
		return formatDetailed(moduleName, helpText, opts.responseFormat);
	}

	let formattedText = "";
	let context: ModuleHelpContext | undefined;

	switch (opts.detailLevel) {
		case "minimal":
		case "summary": {
			const summary = formatSummary(moduleName, helpText, members, classInfo);
			formattedText = summary.text;
			context = summary.context;
			break;
		}
	}

	const ctx = context as unknown as Record<string, unknown> | undefined;
	return finalizeFormattedText(formattedText, opts, {
		context: ctx,
		structured: ctx,
		template: "moduleHelp",
	});
}

/**
 * Summary mode: Module name with key sections
 */
function formatSummary(
	moduleName: string,
	helpText: string,
	members: ModuleHelpMembers,
	classInfo?: ClassSummary,
): { text: string; context: ModuleHelpContext } {
	const sections = extractHelpSections(helpText);
	const preview = extractHelpPreview(helpText, 500);
	const memberSummary = formatMemberSummary(members);

	const lines = [`✓ Help information for ${moduleName}`];

	if (classInfo?.definition) {
		lines.push(`Class: ${classInfo.definition}`);
	}

	if (classInfo?.description) {
		lines.push(classInfo.description);
	}

	if (classInfo?.methodResolutionOrder?.length) {
		lines.push(`MRO: ${classInfo.methodResolutionOrder.join(" → ")}`);
	}

	lines.push("");

	if (sections.length > 0) {
		lines.push(`Sections: ${sections.join(", ")}`, "");
	}

	lines.push(preview);

	if (memberSummary) {
		lines.push("", memberSummary);
	}

	if (helpText.length > 500) {
		lines.push(
			"",
			`💡 Use detailLevel='detailed' to see full documentation (${helpText.length} chars total).`,
		);
	}

	return {
		context: {
			classInfo,
			fullLength: helpText.length,
			helpPreview: preview,
			members,
			moduleName,
			sections,
		},
		text: lines.join("\n"),
	};
}

/**
 * Detailed mode: Full help text
 */
function formatDetailed(
	moduleName: string,
	helpText: string,
	format: PresenterFormat | undefined,
): string {
	const title = `Help for ${moduleName}`;
	const payloadFormat = format ?? DEFAULT_PRESENTER_FORMAT;

	// For detailed view, return formatted markdown
	let formatted = `# ${title}\n\n`;
	formatted += "```\n";
	formatted += helpText;
	formatted += "\n```";

	return presentStructuredData(
		{
			context: {
				payloadFormat,
				title,
			},
			detailLevel: "detailed",
			structured: {
				helpText,
				length: helpText.length,
				moduleName,
			},
			template: "moduleHelpDetailed",
			text: formatted,
		},
		payloadFormat,
	);
}

/**
 * Build help context
 */
function _buildHelpContext(
	moduleName: string,
	helpText: string,
	members: ModuleHelpMembers,
	classInfo?: ClassSummary,
): ModuleHelpContext {
	return {
		classInfo,
		fullLength: helpText.length,
		helpPreview: extractHelpPreview(helpText, 200),
		members,
		moduleName,
		sections: extractHelpSections(helpText),
	};
}

/**
 * Extract preview from help text
 */
function extractHelpPreview(helpText: string, maxChars: number): string {
	const trimmed = helpText.trim();

	if (trimmed.length <= maxChars) {
		return trimmed;
	}

	// Try to cut at a natural break point (newline)
	const firstPart = trimmed.substring(0, maxChars);
	const lastNewline = firstPart.lastIndexOf("\n");

	if (lastNewline > maxChars * 0.7) {
		return `${firstPart.substring(0, lastNewline)}...`;
	}

	return `${firstPart}...`;
}

/**
 * Extract section headers from help text
 */
function extractHelpSections(helpText: string): string[] {
	const sections: string[] = [];
	const lines = helpText.split("\n");

	// Common help section patterns
	const sectionPatterns = [
		/^([A-Z][A-Za-z\s]+):$/,
		/^\s*([A-Z][A-Z\s]+)$/,
		/^-+\s*$/,
	];

	let lastSection = "";

	for (const line of lines) {
		const trimmed = line.trim();

		// Check for section headers
		for (const pattern of sectionPatterns) {
			const match = trimmed.match(pattern);
			if (match?.[1]) {
				const section = match[1].trim();
				if (section && section !== lastSection && section.length < 50) {
					sections.push(section);
					lastSection = section;
				}
				break;
			}
		}

		// Limit to first 10 sections
		if (sections.length >= 10) {
			break;
		}
	}

	return sections;
}

function extractModuleMembers(helpText: string): ModuleHelpMembers {
	const methods: string[] = [];
	const properties: string[] = [];
	const seenMethods = new Set<string>();
	const seenProperties = new Set<string>();
	const lines = helpText.split("\n");
	let currentCategory: "method" | "property" | undefined;

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		const normalized = trimmed.replace(/^\|/, "").trim();
		const headerMatch = normalized.match(/^(.*?):$/);
		if (headerMatch) {
			const newCategory = categorizeSection(headerMatch[1]);
			if (newCategory) {
				currentCategory = newCategory;
			}
			continue;
		}

		if (!currentCategory) continue;

		const entryMatch = trimmed.match(/^\|\s{2,4}([A-Za-z_][\w]*)/);
		if (!entryMatch) continue;
		const name = entryMatch[1];
		if (!name) continue;

		if (currentCategory === "method") {
			if (!seenMethods.has(name)) {
				seenMethods.add(name);
				methods.push(name);
			}
		} else if (currentCategory === "property") {
			if (!seenProperties.has(name)) {
				seenProperties.add(name);
				properties.push(name);
			}
		}
	}

	return { methods, properties };
}

interface ClassSummary {
	definition?: string;
	description?: string;
	methodResolutionOrder?: string[];
}

function extractClassSummary(helpText: string): ClassSummary | undefined {
	const lines = helpText.split("\n");
	let definition: string | undefined;
	const descriptionLines: string[] = [];
	const methodResolutionOrder: string[] = [];
	let inDescription = false;
	let inMro = false;

	for (let i = 0; i < lines.length; i++) {
		const raw = lines[i];
		const trimmed = raw.trim();

		if (!definition) {
			const defMatch = trimmed.match(/^class\s+(.+)$/);
			if (defMatch) {
				definition = defMatch[1];
				inDescription = true;
				continue;
			}
		}

		if (inDescription) {
			if (!trimmed || trimmed.startsWith("|  Methods defined here:")) {
				inDescription = false;
			} else if (trimmed.startsWith("|")) {
				const desc = trimmed.replace(/^\|\s*/, "");
				if (desc) {
					descriptionLines.push(desc);
				}
			}
		}

		if (trimmed.startsWith("|  Method resolution order:")) {
			inMro = true;
			continue;
		}

		if (inMro) {
			if (!trimmed.startsWith("|")) {
				inMro = false;
				continue;
			}
			const entry = trimmed.replace(/^\|\s*/, "");
			if (entry) {
				methodResolutionOrder.push(entry.trim());
			}
		}

		if (methodResolutionOrder.length > 0 && !inMro && !inDescription) {
			break;
		}
	}

	if (
		!definition &&
		descriptionLines.length === 0 &&
		methodResolutionOrder.length === 0
	) {
		return undefined;
	}

	return {
		definition,
		description: descriptionLines.slice(0, 3).join(" "),
		methodResolutionOrder: methodResolutionOrder.length
			? methodResolutionOrder
			: undefined,
	};
}

function categorizeSection(
	sectionName: string,
): "method" | "property" | undefined {
	const normalized = sectionName.toLowerCase();
	if (normalized.includes("method")) {
		return "method";
	}
	if (
		normalized.includes("descriptor") ||
		normalized.includes("attribute") ||
		normalized.includes("property")
	) {
		return "property";
	}
	return undefined;
}

function formatMemberSummary(
	members: ModuleHelpMembers,
	limitPerGroup?: number,
): string {
	const segments: string[] = [];
	const methodSummary = formatMemberGroup(
		"Methods",
		members.methods,
		limitPerGroup,
	);
	if (methodSummary) {
		segments.push(methodSummary);
	}
	const propertySummary = formatMemberGroup(
		"Properties",
		members.properties,
		limitPerGroup,
	);
	if (propertySummary) {
		segments.push(propertySummary);
	}
	return segments.join("\n\n");
}

function formatMemberGroup(
	label: string,
	items: string[],
	limit?: number,
): string | undefined {
	if (items.length === 0) {
		return undefined;
	}
	const effectiveLimit =
		typeof limit === "number" && Number.isFinite(limit)
			? Math.max(limit, 0)
			: items.length;
	const displayed = items.slice(0, effectiveLimit);
	const suffix = items.length > effectiveLimit ? ", …" : "";
	return `${label} (${items.length}): ${displayed.join(", ")}${suffix}`;
}
