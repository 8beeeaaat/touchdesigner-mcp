import { describe, expect, it } from "vitest";
import {
	formatNodeList,
	type NodeListData,
} from "../../../src/features/tools/presenter/nodeListFormatter.js";
import type { TdNode } from "../../../src/gen/endpoints/TouchDesignerAPI.js";

describe("nodeListFormatter", () => {
	describe("formatNodeList", () => {
		const createNode = (id: number, name: string, opType: string): TdNode => ({
			id,
			name,
			opType,
			path: `/project1/${name}`,
			properties: {},
		});

		it("should return message for empty node list", () => {
			const data: NodeListData = {
				nodes: [],
				parentPath: "/project1",
			};

			const result = formatNodeList(data);

			expect(result).toBe("No nodes found.");
		});

		it("should return message for undefined nodes", () => {
			const data: NodeListData = {
				parentPath: "/project1",
			};

			const result = formatNodeList(data);

			expect(result).toBe("No nodes found.");
		});

		it("should format minimal mode with node paths", () => {
			const nodes: TdNode[] = [
				createNode(1, "geo1", "geometry"),
				createNode(2, "text1", "textTOP"),
			];

			const data: NodeListData = {
				nodes,
				parentPath: "/project1",
			};

			const result = formatNodeList(data, { detailLevel: "minimal" });

			expect(result).toContain("Nodes in /project1 (2 total)");
			expect(result).toContain("/project1/geo1");
			expect(result).toContain("/project1/text1");
		});

		it("should format summary mode grouped by type", () => {
			const nodes: TdNode[] = [
				createNode(1, "geo1", "geometry"),
				createNode(2, "geo2", "geometry"),
				createNode(3, "text1", "textTOP"),
			];

			const data: NodeListData = {
				nodes,
				parentPath: "/project1",
			};

			const result = formatNodeList(data, { detailLevel: "summary" });

			expect(result).toContain("Nodes in /project1 (3 total)");
			expect(result).toContain("geometry");
			expect(result).toContain("geo1");
			expect(result).toContain("text1");
		});

		it("should respect limit option", () => {
			const nodes: TdNode[] = [
				createNode(1, "node1", "type1"),
				createNode(2, "node2", "type1"),
				createNode(3, "node3", "type1"),
				createNode(4, "node4", "type1"),
				createNode(5, "node5", "type1"),
			];

			const data: NodeListData = {
				nodes,
				parentPath: "/project1",
			};

			const result = formatNodeList(data, {
				detailLevel: "minimal",
				limit: 3,
			});

			expect(result).toContain("Nodes in /project1 (5 total)");
			expect(result).toContain("2 more node(s) omitted");
		});

		it("should not show omission hint when includeHints is false", () => {
			const nodes: TdNode[] = [
				createNode(1, "node1", "type1"),
				createNode(2, "node2", "type1"),
				createNode(3, "node3", "type1"),
			];

			const data: NodeListData = {
				nodes,
			};

			const result = formatNodeList(data, {
				detailLevel: "minimal",
				includeHints: false,
				limit: 2,
			});

			expect(result).not.toContain("omitted");
		});

		it("should format detailed mode as JSON", () => {
			const nodes: TdNode[] = [createNode(1, "geo1", "geometry")];

			const data: NodeListData = {
				nodes,
				parentPath: "/project1",
				pattern: "*",
			};

			const result = formatNodeList(data, {
				detailLevel: "detailed",
				responseFormat: "json",
			});

			const parsed = JSON.parse(result);
			expect(parsed.nodes).toHaveLength(1);
			expect(parsed.nodes[0].name).toBe("geo1");
			expect(parsed.parentPath).toBe("/project1");
			expect(parsed.pattern).toBe("*");
		});

		it("should handle nodes without parentPath", () => {
			const nodes: TdNode[] = [createNode(1, "geo1", "geometry")];

			const data: NodeListData = {
				nodes,
			};

			const result = formatNodeList(data, { detailLevel: "minimal" });

			expect(result).toContain("Nodes in project (1 total)");
		});

		it("should group unknown types correctly", () => {
			const nodes: TdNode[] = [
				{
					id: 1,
					name: "unknown1",
					opType: "",
					path: "/unknown1",
					properties: {},
				},
				{
					id: 2,
					name: "unknown2",
					opType: "",
					path: "/unknown2",
					properties: {},
				},
			];

			const data: NodeListData = {
				nodes,
			};

			const result = formatNodeList(data, { detailLevel: "summary" });

			expect(result.toLowerCase()).toContain("unknown");
		});
	});
});
