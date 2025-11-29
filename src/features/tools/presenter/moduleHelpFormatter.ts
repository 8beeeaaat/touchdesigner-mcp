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
	success?: boolean;
	data?: {
		moduleName?: string;
		helpText?: string;
	};
	[key: string]: unknown;
}

interface ModuleHelpContext {
	moduleName: string;
	helpPreview: string;
	fullLength: number;
	sections: string[];
}

/**
 * Format module help result
 */
export function formatModuleHelp(
	data: ModuleHelpData | undefined,
	options?: FormatterOptions,
): string {
	const opts = mergeFormatterOptions(options);

	if (!data || !data.data?.helpText) {
		return "No help information available.";
	}

	const moduleName = data.data.moduleName ?? "Unknown";
	const helpText = data.data.helpText;

	if (opts.detailLevel === "detailed") {
		return formatDetailed(moduleName, helpText, opts.responseFormat);
	}

	let formattedText = "";
	let context: ModuleHelpContext | undefined;

	switch (opts.detailLevel) {
		case "minimal":
			formattedText = formatMinimal(moduleName, helpText);
			context = buildHelpContext(moduleName, helpText);
			break;
		case "summary": {
			const summary = formatSummary(moduleName, helpText);
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
 * Minimal mode: Module name and brief excerpt
 */
function formatMinimal(moduleName: string, helpText: string): string {
	const preview = extractHelpPreview(helpText, 200);
	return `✓ Help for ${moduleName}:\n\n${preview}`;
}

/**
 * Summary mode: Module name with key sections
 */
function formatSummary(
	moduleName: string,
	helpText: string,
): { text: string; context: ModuleHelpContext } {
	const sections = extractHelpSections(helpText);
	const preview = extractHelpPreview(helpText, 500);

	let formatted = `✓ Help information for ${moduleName}\n\n`;

	if (sections.length > 0) {
		formatted += `Sections: ${sections.join(", ")}\n\n`;
	}

	formatted += `${preview}`;

	if (helpText.length > 500) {
		formatted += `\n\n💡 Use detailLevel='detailed' to see full documentation (${helpText.length} chars total).`;
	}

	return {
		context: {
			fullLength: helpText.length,
			helpPreview: preview,
			moduleName,
			sections,
		},
		text: formatted,
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
function buildHelpContext(
	moduleName: string,
	helpText: string,
): ModuleHelpContext {
	return {
		fullLength: helpText.length,
		helpPreview: extractHelpPreview(helpText, 200),
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
