import {
	formatClassDetails,
	formatClassList,
	formatNodeDetails,
	formatNodeList,
	formatScriptResult,
} from "../src/features/tools/presenter/index.js";
import type { PresenterFormat } from "../src/features/tools/presenter/presenter.js";
import { TouchDesignerClient } from "../src/tdClient/touchDesignerClient.js";

type Measurement = {
	scenario: string;
	legacyChars: number;
	formattedChars: number;
	legacyTokens: number;
	formattedTokens: number;
	reductionPct: string;
};

const AVG_CHARS_PER_TOKEN = 4;
const STRUCTURED_FORMATS: PresenterFormat[] = ["yaml", "json", "markdown"];

const toTokens = (text: string) => Math.ceil(text.length / AVG_CHARS_PER_TOKEN);

async function measureScenario(
	scenario: string,
	legacyPayload: string,
	formattedPayload: string,
): Promise<Measurement> {
	const legacyChars = legacyPayload.length;
	const formattedChars = formattedPayload.length;
	const legacyTokens = toTokens(legacyPayload);
	const formattedTokens = toTokens(formattedPayload);
	const reduction = legacyChars <= 0 ? 0 : 1 - formattedChars / legacyChars;

	return {
		formattedChars,
		formattedTokens,
		legacyChars,
		legacyTokens,
		reductionPct: `${(reduction * 100).toFixed(1)}%`,
		scenario,
	};
}

async function addDetailedMeasurements(
	label: string,
	legacyPayload: string,
	formatFn: (format: PresenterFormat) => string,
	measurements: Measurement[],
): Promise<void> {
	for (const format of STRUCTURED_FORMATS) {
		measurements.push(
			await measureScenario(
				`${label} (${format})`,
				legacyPayload,
				formatFn(format),
			),
		);
	}
}

async function addSummaryMeasurements(
	label: string,
	legacyPayload: string,
	formatFn: (format: PresenterFormat) => string,
	measurements: Measurement[],
): Promise<void> {
	for (const format of STRUCTURED_FORMATS) {
		measurements.push(
			await measureScenario(
				`${label} summary (${format})`,
				legacyPayload,
				formatFn(format),
			),
		);
	}
}

async function main() {
	process.env.TD_WEB_SERVER_HOST ||= "http://127.0.0.1";
	process.env.TD_WEB_SERVER_PORT ||= "9981";

	const tdClient = new TouchDesignerClient();
	const measurements: Measurement[] = [];

	const nodesBasic = await tdClient.getNodes({ parentPath: "/project1" });
	if (!nodesBasic.success) throw nodesBasic.error;
	await addSummaryMeasurements(
		"GET_TD_NODES (pattern='*')",
		JSON.stringify(nodesBasic, null, 2),
		(format) =>
			formatNodeList(nodesBasic.data, {
				detailLevel: "summary",
				responseFormat: format,
			}),
		measurements,
	);
	await addDetailedMeasurements(
		"GET_TD_NODES detailed",
		JSON.stringify(nodesBasic, null, 2),
		(responseFormat) =>
			formatNodeList(nodesBasic.data, {
				detailLevel: "detailed",
				responseFormat,
			}),
		measurements,
	);

	const nodesWithProps = await tdClient.getNodes({
		includeProperties: true,
		parentPath: "/project1",
	});
	if (!nodesWithProps.success) throw nodesWithProps.error;
	await addSummaryMeasurements(
		"GET_TD_NODES (includeProperties=true)",
		JSON.stringify(nodesWithProps, null, 2),
		(format) =>
			formatNodeList(nodesWithProps.data, {
				detailLevel: "summary",
				responseFormat: format,
			}),
		measurements,
	);
	await addDetailedMeasurements(
		"GET_TD_NODES (includeProperties=true) detailed",
		JSON.stringify(nodesWithProps, null, 2),
		(responseFormat) =>
			formatNodeList(nodesWithProps.data, {
				detailLevel: "detailed",
				responseFormat,
			}),
		measurements,
	);

	const nodeDetails = await tdClient.getNodeDetail({
		nodePath: "/project1/mcp_webserver_base/mpc_webserver",
	});
	if (!nodeDetails.success) throw nodeDetails.error;

	await addSummaryMeasurements(
		"GET_TD_NODE_PARAMETERS (webserverDAT)",
		JSON.stringify(nodeDetails, null, 2),
		(format) =>
			formatNodeDetails(nodeDetails.data, {
				detailLevel: "summary",
				limit: 10,
				responseFormat: format,
			}),
		measurements,
	);
	await addDetailedMeasurements(
		"GET_TD_NODE_PARAMETERS detailed",
		JSON.stringify(nodeDetails, null, 2),
		(responseFormat) =>
			formatNodeDetails(nodeDetails.data, {
				detailLevel: "detailed",
				responseFormat,
			}),
		measurements,
	);

	const classList = await tdClient.getClasses();
	if (!classList.success) throw classList.error;
	await addSummaryMeasurements(
		"GET_TD_CLASSES",
		JSON.stringify(classList, null, 2),
		(format) =>
			formatClassList(classList.data, {
				detailLevel: "summary",
				limit: 50,
				responseFormat: format,
			}),
		measurements,
	);
	await addDetailedMeasurements(
		"GET_TD_CLASSES detailed",
		JSON.stringify(classList, null, 2),
		(responseFormat) =>
			formatClassList(classList.data, {
				detailLevel: "detailed",
				responseFormat,
			}),
		measurements,
	);

	const classDetails = await tdClient.getClassDetails("op");
	if (!classDetails.success) throw classDetails.error;
	await addSummaryMeasurements(
		"GET_TD_CLASS_DETAILS (op)",
		JSON.stringify(classDetails, null, 2),
		(format) =>
			formatClassDetails(classDetails.data, {
				detailLevel: "summary",
				limit: 20,
				responseFormat: format,
			}),
		measurements,
	);
	await addDetailedMeasurements(
		"GET_TD_CLASS_DETAILS detailed",
		JSON.stringify(classDetails, null, 2),
		(responseFormat) =>
			formatClassDetails(classDetails.data, {
				detailLevel: "detailed",
				responseFormat,
			}),
		measurements,
	);

	const scriptResult = await tdClient.execPythonScript<{
		result: unknown;
		output?: string;
	}>({
		script: "op('/project1').children",
	});
	if (!scriptResult.success) throw scriptResult.error;

	await addSummaryMeasurements(
		"EXECUTE_PYTHON_SCRIPT",
		JSON.stringify(scriptResult, null, 2),
		(format) =>
			formatScriptResult(scriptResult, "op('/project1').children", {
				detailLevel: "summary",
				responseFormat: format,
			}),
		measurements,
	);
	await addDetailedMeasurements(
		"EXECUTE_PYTHON_SCRIPT detailed",
		JSON.stringify(scriptResult, null, 2),
		(responseFormat) =>
			formatScriptResult(scriptResult, "op('/project1').children", {
				detailLevel: "detailed",
				responseFormat,
			}),
		measurements,
	);

	console.table(measurements);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
