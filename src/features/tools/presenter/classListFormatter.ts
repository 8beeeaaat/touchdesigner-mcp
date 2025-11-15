/**
 * Class List Formatter
 *
 * Formats TouchDesigner Python class/module lists with token optimization.
 * Used by GET_TD_CLASSES and GET_TD_CLASS_DETAILS tools.
 */

import type {
	TdPythonClassDetails,
	TdPythonClassInfo,
} from "../../../gen/endpoints/TouchDesignerAPI.js";
import {
	DEFAULT_PRESENTER_FORMAT,
	type PresenterFormat,
	presentStructuredData,
} from "./presenter.js";
import type { FormatterOptions } from "./responseFormatter.js";
import {
	finalizeFormattedText,
	limitArray,
	mergeFormatterOptions,
} from "./responseFormatter.js";

/**
 * Class list data structure (matches API response)
 */
export interface ClassListData {
	classes?: TdPythonClassInfo[];
	modules?: string[];
	totalCount?: number;
	[key: string]: unknown;
}

/**
 * Class details data structure (matches API response)
 */
export type ClassDetailsData = TdPythonClassDetails;

/**
 * Format class/module list
 */
export function formatClassList(
	data: ClassListData | undefined,
	options?: FormatterOptions,
): string {
	const opts = mergeFormatterOptions(options);

	if (!data) {
		return "No classes or modules found.";
	}

	const classes = data.classes || [];
	const modules = data.modules || [];
	const total = classes.length + modules.length;

	if (total === 0) {
		return "No classes or modules found.";
	}

	if (opts.detailLevel === "detailed") {
		return formatDetailed(data, opts.responseFormat);
	}

	const { text, context } =
		opts.detailLevel === "minimal"
			? formatClassListMinimal(classes, modules, opts.limit)
			: formatClassListSummary(classes, modules, opts.limit);

	const ctx = context as Record<string, unknown>;
	return finalizeFormattedText(text, opts, {
		template: "classListSummary",
		context: ctx,
		structured: ctx,
	});
}

/**
 * Format class details
 */
export function formatClassDetails(
	data: ClassDetailsData | undefined,
	options?: FormatterOptions,
): string {
	const opts = mergeFormatterOptions(options);

	if (!data || !data.name) {
		return "No class details available.";
	}

	if (opts.detailLevel === "detailed") {
		return formatDetailed(data, opts.responseFormat);
	}

	const { text, context } =
		opts.detailLevel === "minimal"
			? formatClassDetailsMinimal(data)
			: formatClassDetailsSummary(data, opts.limit);

	const ctx = context as Record<string, unknown>;
	return finalizeFormattedText(text, opts, {
		template: "classDetailsSummary",
		context: ctx,
		structured: ctx,
	});
}

function formatClassListMinimal(
	classes: TdPythonClassInfo[],
	modules: string[],
	limit?: number,
) {
	const { items: limitedClasses, truncated: classTruncated } = limitArray(
		classes,
		limit,
	);
	let text = `Classes (${classes.length}): ${limitedClasses
		.map((c) => c.name)
		.join(", ")}`;
	if (classTruncated) {
		text += `\n💡 ${classes.length - limitedClasses.length} more classes omitted.`;
	}
	if (modules.length > 0) {
		text += `\nModules (${modules.length}): ${modules.join(", ")}`;
	}
	return {
		text,
		context: buildClassListContext(classes, modules),
	};
}

function formatClassListSummary(
	classes: TdPythonClassInfo[],
	modules: string[],
	limit?: number,
) {
	const { items: limitedClasses } = limitArray(classes, limit);
	const text = `Classes (${classes.length}):\n${limitedClasses
		.map((c) => `- ${c.name} — ${c.description || ""}`)
		.join("\n")}\n\nModules (${modules.length}):\n${modules
		.map((m) => `- ${m}`)
		.join("\n")}`;
	return {
		text,
		context: buildClassListContext(classes, modules),
	};
}

function buildClassListContext(
	classes: TdPythonClassInfo[],
	modules: string[],
) {
	return {
		classCount: classes.length,
		moduleCount: modules.length,
		classes: classes.map((cls) => ({
			name: cls.name,
			description: cls.description,
		})),
		modules,
	};
}

function formatClassDetailsMinimal(data: ClassDetailsData) {
	const text = `Class: ${data.name}\nType: ${data.type}`;
	return {
		text,
		context: {
			name: data.name,
			type: data.type,
			description: data.description,
			methodsShown: 0,
			methodsTotal: data.methods?.length ?? 0,
			methods: [],
			propertiesShown: 0,
			propertiesTotal: data.properties?.length ?? 0,
			properties: [],
			truncated: false,
		},
	};
}

function formatClassDetailsSummary(data: ClassDetailsData, limit?: number) {
	const methods = data.methods || [];
	const properties = data.properties || [];
	const { items: limitedMethods, truncated: methodsTruncated } = limitArray(
		methods,
		limit,
	);
	const { items: limitedProps, truncated: propsTruncated } = limitArray(
		properties,
		limit,
	);

	let text = `${data.name}`;
	if (data.type) text += ` (${data.type})`;
	text += "\n";
	if (data.description) {
		text += `\n${data.description}\n`;
	}

	if (limitedMethods.length > 0) {
		text += `\nMETHODS (${methods.length}):\n`;
		for (const method of limitedMethods) {
			const sig = method.signature || `${method.name}()`;
			const doc = method.description
				? ` - ${method.description.split("\n")[0]}`
				: "";
			text += `  • ${sig}${doc}\n`;
		}
		if (methodsTruncated) {
			text += `  💡 ${methods.length - limitedMethods.length} more methods omitted.\n`;
		}
	}

	if (limitedProps.length > 0) {
		text += `\nPROPERTIES (${properties.length}):\n`;
		for (const prop of limitedProps) {
			const typeInfo = prop.type ? `: ${prop.type}` : "";
			const valueInfo =
				prop.value !== undefined ? ` = ${JSON.stringify(prop.value)}` : "";
			text += `  • ${prop.name}${typeInfo}${valueInfo}\n`;
		}
		if (propsTruncated) {
			text += `  💡 ${properties.length - limitedProps.length} more properties omitted.\n`;
		}
	}

	return {
		text,
		context: {
			name: data.name,
			type: data.type,
			description: data.description,
			methodsShown: limitedMethods.length,
			methodsTotal: methods.length,
			methods: limitedMethods.map((method) => ({
				signature: method.signature || `${method.name}()`,
				summary: method.description?.split("\n")[0] ?? "",
			})),
			propertiesShown: limitedProps.length,
			propertiesTotal: properties.length,
			properties: limitedProps.map((prop) => ({
				name: prop.name,
				type: prop.type,
			})),
			truncated: methodsTruncated || propsTruncated,
		},
	};
}

function formatDetailed(
	data: ClassListData | ClassDetailsData,
	format: PresenterFormat | undefined,
): string {
	const title =
		"name" in (data as ClassDetailsData)
			? `Class ${(data as ClassDetailsData).name ?? "details"}`
			: "TouchDesigner Classes";
	const payloadFormat = format ?? DEFAULT_PRESENTER_FORMAT;
	return presentStructuredData(
		{
			text: title,
			detailLevel: "detailed",
			structured: data,
			context: {
				title,
				payloadFormat,
			},
			template: "detailedPayload",
		},
		payloadFormat,
	);
}
