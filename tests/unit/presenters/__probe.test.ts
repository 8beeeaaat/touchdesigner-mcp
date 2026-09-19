import { describe, it } from "vitest";
import { formatNodeErrors, type NodeErrorReportData } from "../../../src/features/tools/presenter/nodeErrorsFormatter.js";

const mk = (over: Partial<NodeErrorReportData> = {}): NodeErrorReportData => ({
  errorCount: 1, warningCount: 1, hasErrors: true, hasWarnings: true,
  nodeName: "probe", nodePath: "/project1/probe", opType: "baseCOMP",
  errors: [
    { level: "error", message: "Not enough sources", nodeName: "a", nodePath: "/project1/probe/a", opType: "displaceTOP" },
    { level: "warning", message: "File not found.", nodeName: "b", nodePath: "/project1/probe/b", opType: "moviefileinTOP" },
  ],
  ...over,
});

const show = (label: string, s: string) => {
  require("node:fs").appendFileSync("/tmp/probe.txt", `\n=========== ${label} ===========\n${s}\n===========END===========\n`);
};

describe("probe", () => {
  it("probes", () => {
    show("A: default (summary/markdown)", formatNodeErrors(mk()));
    show("B: detailLevel minimal, default format", formatNodeErrors(mk(), { detailLevel: "minimal" }));
    show("C: limit 0", formatNodeErrors(mk(), { limit: 0 }));
    show("D: errorCount 5 but errors []", formatNodeErrors(mk({ errors: [], errorCount: 5, warningCount: 2, hasErrors: true })));
    show("E: pipe char in message", formatNodeErrors(mk({ errors: [{ level: "error", message: "bad expr: a | b failed", nodeName: "c", nodePath: "/p/c", opType: "tableDAT" }], errorCount: 1, warningCount: 0 })));
    show("F: limit 1 (errors first, warning dropped)", formatNodeErrors(mk(), { limit: 1 }));
    show("G: empty message string", formatNodeErrors(mk({ errors: [{ level: "error", message: "", nodeName: "d", nodePath: "/p/d", opType: "textTOP" }], errorCount: 1, warningCount: 0 })));
  });
});
