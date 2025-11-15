import { stringify as toYaml } from "yaml";
import { renderMarkdownTemplate } from "./markdownRenderer.js";

export type PresenterFormat = "json" | "yaml" | "markdown";

export const DEFAULT_PRESENTER_FORMAT: PresenterFormat = "yaml";

export interface PresenterPayload {
	text: string;
	detailLevel?: string;
	structured?: unknown;
	context?: Record<string, unknown>;
	template?: string;
}

export function presentStructuredData(
	payload: PresenterPayload,
	format: PresenterFormat = DEFAULT_PRESENTER_FORMAT,
): string {
	switch (format) {
		case "json":
			return JSON.stringify(resolveStructured(payload), null, 2);
		case "yaml":
			return toYaml(resolveStructured(payload));
		case "markdown":
			return formatMarkdown(payload, format);
		default:
			return toYaml(resolveStructured(payload));
	}
}

function resolveStructured(payload: PresenterPayload): unknown {
	if (payload.structured !== undefined) {
		return payload.structured;
	}
	return {
		mode: payload.detailLevel,
		text: payload.text,
		...(payload.context ?? {}),
	};
}

function formatMarkdown(
	payload: PresenterPayload,
	requestedFormat: PresenterFormat,
): string {
	const context = { ...(payload.context ?? {}) } as Record<string, unknown>;
	const inferredTitle = payload.detailLevel
		? `${payload.detailLevel.charAt(0).toUpperCase()}${payload.detailLevel.slice(1)}`
		: "Response";

	const effectiveTemplate =
		payload.template ??
		(payload.detailLevel === "detailed" ? "detailedPayload" : "default");

	const payloadFormat =
		(context.payloadFormat as PresenterFormat | undefined) ??
		(requestedFormat === "markdown"
			? DEFAULT_PRESENTER_FORMAT
			: requestedFormat);

	const resolveStructuredText = () => {
		if (typeof payload.structured === "string") return payload.structured;
		if (payload.structured === undefined) return payload.text ?? "";
		return payloadFormat === "json"
			? JSON.stringify(payload.structured, null, 2)
			: toYaml(payload.structured);
	};

	let bodyText = payload.text?.trim() ?? "";
	if (!bodyText) {
		bodyText = resolveStructuredText();
	}

	if (effectiveTemplate === "detailedPayload") {
		context.title ??= inferredTitle;
		context.payload ??= resolveStructuredText();
		context.payloadFormat ??= payloadFormat;
	}

	if (effectiveTemplate === "default" && !("title" in context)) {
		context.title = inferredTitle;
	}

	return renderMarkdownTemplate(effectiveTemplate, {
		...context,
		text: bodyText,
	});
}
