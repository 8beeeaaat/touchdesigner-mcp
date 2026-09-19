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
import type {
	FormatterOptions,
	TruncationNotice,
} from "./responseFormatter.js";
import {
	describeTruncation,
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

	// The list is capped once, here, and the capped list is what both the
	// rendered text and the payload are built from. Capping only the text left
	// `classListSummary.md` rendering `{{#classes}}` from an unbounded context
	// — the template never renders the text at all — so `limit` was reaching
	// nobody, in markdown as much as in json and yaml.
	const { items: shownClasses } = limitArray(classes, opts.limit);
	const text =
		opts.detailLevel === "minimal"
			? classListMinimalText(classes, shownClasses, modules)
			: classListSummaryText(classes, shownClasses, modules);

	const ctx: Record<string, unknown> = {
		classCount: classes.length,
		classes: shownClasses.map((cls) => ({
			description: cls.description,
			name: cls.name,
		})),
		moduleCount: modules.length,
		modules,
	};
	const truncation = describeTruncation(opts.limit, {
		classes: { returned: shownClasses.length, total: classes.length },
	});

	return finalizeFormattedText(text, opts, {
		// The omission notice goes to the markdown context only. The payload
		// gets the machine-readable `truncation` record instead, so neither
		// side has to parse a sentence meant for the other.
		context: withOmissionFields(ctx, truncation, "classes"),
		structured: ctx,
		template: "classListSummary",
		truncation,
	});
}

/**
 * Add the fields `{{#truncated}}` needs, and only when there is a cut.
 *
 * Adding them unconditionally would put `truncated: false` into every payload
 * that shares this object, which would change the response for a caller who
 * passed no `limit` at all.
 */
function withOmissionFields(
	context: Record<string, unknown>,
	truncation: TruncationNotice | undefined,
	collection: string,
): Record<string, unknown> {
	const cut = truncation?.collections[collection];
	if (!cut) {
		return context;
	}
	return { ...context, omittedCount: cut.omitted, truncated: true };
}

/**
 * Format class details
 */
export function formatClassDetails(
	data: ClassDetailsData | undefined,
	options?: FormatterOptions,
): string {
	const opts = mergeFormatterOptions(options);

	if (!data?.name) {
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
	// Minimal drops every member by design rather than by `limit`, so it
	// declares no truncation: a notice naming `limit` there would blame the
	// cap for a choice the detail level made.
	const truncation =
		opts.detailLevel === "minimal"
			? undefined
			: describeTruncation(opts.limit, {
					methods: {
						returned: context.methodsShown,
						total: context.methodsTotal,
					},
					properties: {
						returned: context.propertiesShown,
						total: context.propertiesTotal,
					},
				});

	return finalizeFormattedText(text, opts, {
		context: ctx,
		structured: ctx,
		template: "classDetailsSummary",
		truncation,
	});
}

function classListMinimalText(
	classes: TdPythonClassInfo[],
	shownClasses: TdPythonClassInfo[],
	modules: string[],
) {
	let text = `Classes (${classes.length}): ${shownClasses
		.map((c) => c.name)
		.join(", ")}`;
	if (shownClasses.length < classes.length) {
		text += `\n💡 ${classes.length - shownClasses.length} more classes omitted.`;
	}
	if (modules.length > 0) {
		text += `\nModules (${modules.length}): ${modules.join(", ")}`;
	}
	return text;
}

function classListSummaryText(
	classes: TdPythonClassInfo[],
	shownClasses: TdPythonClassInfo[],
	modules: string[],
) {
	return `Classes (${classes.length}):\n${shownClasses
		.map((c) => `- ${c.name} — ${c.description || ""}`)
		.join("\n")}\n\nModules (${modules.length}):\n${modules
		.map((m) => `- ${m}`)
		.join("\n")}`;
}

function formatClassDetailsMinimal(data: ClassDetailsData) {
	const text = `Class: ${data.name}\nType: ${data.type}`;
	return {
		context: {
			description: data.description,
			methods: [],
			methodsShown: 0,
			methodsTotal: data.methods?.length ?? 0,
			name: data.name,
			properties: [],
			propertiesShown: 0,
			propertiesTotal: data.properties?.length ?? 0,
			truncated: false,
			type: data.type,
		},
		text,
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
		context: {
			description: data.description,
			methods: limitedMethods.map((method) => ({
				signature: method.signature || `${method.name}()`,
				summary: method.description?.split("\n")[0] ?? "",
			})),
			methodsShown: limitedMethods.length,
			methodsTotal: methods.length,
			name: data.name,
			properties: limitedProps.map((prop) => ({
				name: prop.name,
				type: prop.type,
			})),
			propertiesShown: limitedProps.length,
			propertiesTotal: properties.length,
			truncated: methodsTruncated || propsTruncated,
			type: data.type,
		},
		text,
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
			context: {
				payloadFormat,
				title,
			},
			detailLevel: "detailed",
			structured: data,
			template: "detailedPayload",
			text: title,
		},
		payloadFormat,
	);
}
