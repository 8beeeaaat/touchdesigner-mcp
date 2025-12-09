export interface HtmlDocumentOptions {
	bodyAttributes?: string[];
	bodyContent: string;
	head?: string[];
	htmlAttributes?: string;
	title: string;
}

export function buildHtmlDocument({
	bodyAttributes,
	bodyContent,
	head = [],
	htmlAttributes = 'lang="ja"',
	title,
}: HtmlDocumentOptions): string {
	const headTags = head.join("\n    ");

	return `<!doctype html>
<html ${htmlAttributes}>
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <title>${escapeHtml(title)}</title>
    ${headTags}
</head>
<body ${bodyAttributes?.map((attr) => escapeHtml(attr)).join(" ") ?? ""}>
${bodyContent}
</body>
</html>`;
}

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
