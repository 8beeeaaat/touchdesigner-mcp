"""Tests for get_node_errors itself, not just the parser it calls.

The point of this report is telling a caller the truth about a project it may
not have finished reading. A stream nobody could read must not come back
looking like a stream with nothing in it, and a message whose owner could not
be resolved must not quietly vanish into another operator's entry.
"""

from mcp.services.api_service import TouchDesignerApiService

PROBE = "/project1/probe"


def report_for(node):
	result = TouchDesignerApiService().get_node_errors(node.path)
	assert result["success"], result["error"]
	return result["data"]


class TestStreamsThatCouldNotBeRead:
	def test_a_missing_stream_is_recorded_not_assumed_empty(self, scene):
		# An operator with neither errors() nor warnings() stands in for a
		# TouchDesigner build that does not expose them.
		node = scene(PROBE, [])

		report = report_for(node)

		assert report["incomplete"] is True
		assert {s["stream"] for s in report["skippedStreams"]} == {
			"errors",
			"warnings",
		}
		# The trap: a caller branching on this alone would call it clean.
		assert report["hasErrors"] is False

	def test_a_raising_stream_does_not_lose_the_other_one(self, scene):
		node = scene(PROBE, [f"{PROBE}/a"])
		node.with_streams(
			errors=RuntimeError("cook in progress"),
			warnings=f"{PROBE}/a:Warning: Failed to open file. ({PROBE}/a)",
		)

		report = report_for(node)

		assert report["warningCount"] == 1
		assert report["incomplete"] is True
		assert report["skippedStreams"] == [
			{"stream": "errors", "reason": "cook in progress"}
		]

	def test_a_stream_returning_none_is_not_an_empty_stream(self, scene):
		node = scene(PROBE, [])
		node.with_streams(errors=None, warnings="")
		node.errors = lambda recurse=True: None

		report = report_for(node)

		assert report["incomplete"] is True
		assert any(
			s["stream"] == "errors" and "None" in s["reason"]
			for s in report["skippedStreams"]
		)

	def test_a_parse_failure_is_recorded_rather_than_thrown(self, scene):
		# Parsing runs inside the same guard as the read, so a stream that
		# hands back something unparseable is one more skipped stream, not a
		# dead call that loses the stream next to it.
		node = scene(PROBE, [f"{PROBE}/a"])
		node.errors = lambda recurse=True: ["not", "a", "string"]
		node.warnings = (
			lambda recurse=True: f"{PROBE}/a:Warning: Failed to open file. ({PROBE}/a)"
		)

		report = report_for(node)

		assert report["warningCount"] == 1
		assert [s["stream"] for s in report["skippedStreams"]] == ["errors"]

	def test_both_streams_readable_reports_a_complete_result(self, scene):
		node = scene(PROBE, [f"{PROBE}/a"])
		node.with_streams(
			errors=f"{PROBE}/a:  Error: Not enough sources specified ({PROBE}/a)",
			warnings="",
		)

		report = report_for(node)

		assert report["incomplete"] is False
		assert report["skippedStreams"] == []
		assert report["unresolvedAnchors"] == []
		assert (report["errorCount"], report["warningCount"]) == (1, 0)


class TestAnchorsThatCouldNotBeResolved:
	def test_a_deleted_operator_is_reported_not_silently_merged(self, scene):
		# Requiring an anchor to resolve is what stops a file path in someone's
		# traceback becoming an operator. The cost is that an operator deleted
		# since the message was recorded looks identical, and its lines merge
		# into the entry above. That under-counts, so it has to be visible.
		node = scene(PROBE, [f"{PROBE}/a", f"{PROBE}/c"])
		node.with_streams(
			errors=(
				f"{PROBE}/a:  Error: first\n"
				f"{PROBE}/gone:  Error: second\n"
				f"{PROBE}/c:  Error: third"
			),
			warnings="",
		)

		report = report_for(node)

		assert report["errorCount"] == 2
		assert report["unresolvedAnchors"] == [f"{PROBE}/gone"]
		assert report["incomplete"] is True
		# The text is not lost, only folded into the preceding entry.
		assert "second" in report["errors"][0]["message"]

	def test_every_anchor_unresolvable_collapses_but_says_so(self, scene):
		node = scene(PROBE, [])
		node.with_streams(
			errors=(
				f"{PROBE}/a:  Error: first\n"
				f"{PROBE}/b:  Error: second\n"
				f"{PROBE}/c:  Error: third"
			),
			warnings="",
		)

		report = report_for(node)

		assert report["errorCount"] == 1
		assert report["errors"][0]["nodePath"] == PROBE
		assert report["unresolvedAnchors"] == [
			f"{PROBE}/a",
			f"{PROBE}/b",
			f"{PROBE}/c",
		]
		assert report["incomplete"] is True

	def test_a_quoted_file_path_is_reported_the_same_way(self, scene):
		# Indistinguishable from the deleted-operator case by construction,
		# which is the reason the ambiguity is surfaced instead of decided.
		node = scene(PROBE, [f"{PROBE}/cb"])
		node.with_streams(
			errors=(
				f"{PROBE}/cb:  Error: ValueError raised\n"
				f"{PROBE}/data.csv: Error: bad row"
			),
			warnings="",
		)

		report = report_for(node)

		assert report["errorCount"] == 1
		assert report["errors"][0]["nodePath"] == f"{PROBE}/cb"
		assert report["unresolvedAnchors"] == [f"{PROBE}/data.csv"]


class TestMissingNode:
	def test_an_unknown_path_fails_rather_than_reporting_clean(self, scene):
		scene(PROBE, [])

		result = TouchDesignerApiService().get_node_errors("/project1/nope")

		assert result["success"] is False
		assert "nope" in result["error"]
