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


class TestCollectionShape:
	def test_errors_holds_only_errors(self, scene):
		# A released MCP server renders every element of `errors` under an
		# "N error(s) found" heading. Mixing warnings in would have it present
		# them as errors to anyone who updated the component but not the
		# server, which the compatibility gate lets through unchanged.
		node = scene(PROBE, [f"{PROBE}/a", f"{PROBE}/b"])
		node.with_streams(
			errors=f"{PROBE}/a:  Error: Not enough sources specified ({PROBE}/a)",
			warnings=f"{PROBE}/b:Warning: Failed to open file. ({PROBE}/b)",
		)

		report = report_for(node)

		assert [e["level"] for e in report["errors"]] == ["error"]
		assert [w["level"] for w in report["warnings"]] == ["warning"]
		assert report["errors"][0]["nodePath"] == f"{PROBE}/a"
		assert report["warnings"][0]["nodePath"] == f"{PROBE}/b"

	def test_counts_match_their_own_collection(self, scene):
		node = scene(PROBE, [f"{PROBE}/a", f"{PROBE}/b"])
		node.with_streams(
			errors=f"{PROBE}/a:  Error: Not enough sources specified ({PROBE}/a)",
			warnings=f"{PROBE}/b:Warning: Failed to open file. ({PROBE}/b)",
		)

		report = report_for(node)

		assert report["errorCount"] == len(report["errors"]) == 1
		assert report["warningCount"] == len(report["warnings"]) == 1
		assert report["hasErrors"] is True
		assert report["hasWarnings"] is True

	def test_a_warnings_only_node_leaves_errors_empty(self, scene):
		node = scene(PROBE, [f"{PROBE}/b"])
		node.with_streams(
			errors="",
			warnings=f"{PROBE}/b:Warning: Failed to open file. ({PROBE}/b)",
		)

		report = report_for(node)

		assert report["errors"] == []
		assert report["errorCount"] == 0
		assert report["hasErrors"] is False
		assert len(report["warnings"]) == 1


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
		assert report["unresolvedAnchors"] == [
			{"path": f"{PROBE}/gone", "stream": "errors"}
		]
		# Not `incomplete`: both streams were read. The content is present,
		# just folded into the entry above, which is a different claim.
		assert report["incomplete"] is False
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
		assert [a["path"] for a in report["unresolvedAnchors"]] == [
			f"{PROBE}/a",
			f"{PROBE}/b",
			f"{PROBE}/c",
		]
		assert report["incomplete"] is False

	def test_a_quoted_file_path_is_not_even_ambiguous(self, scene):
		# TouchDesigner refuses to create an operator whose name contains a
		# dot, so "data.csv" cannot be one. Nothing is uncertain here, and
		# reporting it would train a caller to ignore the list.
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
		assert report["unresolvedAnchors"] == []
		assert report["incomplete"] is False
		assert "bad row" in report["errors"][0]["message"]


	def test_a_warning_side_ambiguity_does_not_taint_the_error_verdict(self, scene):
		# The two streams are tracked separately, so a declined anchor while
		# reading warnings says nothing about whether errorCount is exact.
		node = scene(PROBE, [f"{PROBE}/a"])
		node.with_streams(
			errors="",
			warnings=(
				f"{PROBE}/a:Warning: Failed to open file. ({PROBE}/a)\n"
				f"{PROBE}/gone:Warning: Failed to open file."
			),
		)

		report = report_for(node)

		assert (report["errorCount"], report["warningCount"]) == (0, 1)
		assert report["incomplete"] is False
		assert report["unresolvedAnchors"] == [
			{"path": f"{PROBE}/gone", "stream": "warnings"}
		]


	def test_a_broken_lookup_does_not_collapse_every_anchor(self, scene, td_stub):
		# Nothing resolving is evidence against the lookup, not against the
		# anchors: three operators vanishing between the message being
		# recorded and the report being read is the less likely story. A
		# lookup that raises is therefore not read as "absent".
		node = scene(PROBE, [])
		node.with_streams(
			errors=(
				f"{PROBE}/a:  Error: first\n"
				f"{PROBE}/b:  Error: second\n"
				f"{PROBE}/c:  Error: third"
			),
			warnings="",
		)
		td_stub.op_raises_for = {f"{PROBE}/a", f"{PROBE}/b", f"{PROBE}/c"}

		report = report_for(node)

		assert report["errorCount"] == 3
		assert [e["nodePath"] for e in report["errors"]] == [
			f"{PROBE}/a",
			f"{PROBE}/b",
			f"{PROBE}/c",
		]
		# Accepting the anchors is only half of it: the payload has to say the
		# lookups failed, or an empty opType reads as "this operator is gone" -
		# the reading this branch exists to reject.
		assert [f["path"] for f in report["lookupFailures"]] == [
			f"{PROBE}/a",
			f"{PROBE}/b",
			f"{PROBE}/c",
		]
		assert report["unresolvedAnchors"] == []
		assert [e["nodeName"] for e in report["errors"]] == ["a", "b", "c"]


	def test_a_path_outside_the_subtree_is_not_called_ambiguous(self, scene):
		# With recurse=True TouchDesigner attributes every message to its
		# owning operator and names referenced operators in the body, never
		# the prefix — verified on a live scene. An outside path is therefore
		# quoted text, nothing was under-counted, and saying otherwise would
		# train a caller to ignore the list.
		node = scene(PROBE, [f"{PROBE}/cb", "/project1/shared"])
		node.with_streams(
			errors=(
				f"{PROBE}/cb:  Error: ValueError raised\n"
				"/project1/shared: Error: quoted by the callback"
			),
			warnings="",
		)

		report = report_for(node)

		assert report["errorCount"] == 1
		assert report["unresolvedAnchors"] == []
		assert report["lookupFailures"] == []
		assert "quoted by the callback" in report["errors"][0]["message"]


	def test_a_fallback_owner_is_not_called_a_folded_failure(self, scene):
		# Declining a trailing "(<path>)" has the opposite consequence to
		# declining an anchor: nothing folds, the entry stands on its own and
		# is counted once, but its owner falls back to the queried node while
		# every field still looks resolved. Reporting that as an unresolved
		# anchor would send a caller hunting a merged failure that is not there.
		node = scene(PROBE, [])
		node.with_streams(
			errors=f"  Error: Not enough sources specified ({PROBE}/adder)",
			warnings="",
		)

		report = report_for(node)

		assert report["errorCount"] == 1
		assert report["unresolvedAnchors"] == []
		assert report["fallbackAttributions"] == [
			{"path": f"{PROBE}/adder", "stream": "errors"}
		]
		entry = report["errors"][0]
		assert entry["nodePath"] == PROBE
		# The real owner is still recoverable from the text.
		assert f"({PROBE}/adder)" in entry["message"]

	def test_a_resolvable_trailing_owner_is_not_reported_at_all(self, scene):
		node = scene(PROBE, [f"{PROBE}/adder"])
		node.with_streams(
			errors=f"  Error: Not enough sources specified ({PROBE}/adder)",
			warnings="",
		)

		report = report_for(node)

		assert report["errors"][0]["nodePath"] == f"{PROBE}/adder"
		assert report["fallbackAttributions"] == []
		assert report["unresolvedAnchors"] == []


	def test_one_path_lands_in_one_list_only(self, scene, td_stub):
		# A flaky td.op can answer differently on two lines naming the same
		# path. The lists are presented as a disjoint categorisation, so the
		# first outcome wins rather than the path appearing twice.
		node = scene(PROBE, [])

		class Flaky:
			def __init__(self):
				self.seen = 0

			def __call__(self, recurse=True):
				return (
					f"{PROBE}/gone:  Error: first\n"
					f"{PROBE}/gone:  Error: second"
				)

		node.errors = Flaky()
		node.warnings = lambda recurse=True: ""
		calls = {"n": 0}
		original = td_stub.op

		def flaky_op(path):
			if path == f"{PROBE}/gone":
				calls["n"] += 1
				if calls["n"] > 1:
					raise RuntimeError("flaky")
				return None
			return original(path)

		td_stub.op = flaky_op
		try:
			report = report_for(node)
		finally:
			td_stub.op = original

		paths = [
			a["path"]
			for a in report["unresolvedAnchors"]
			+ report["lookupFailures"]
			+ report["fallbackAttributions"]
		]
		assert paths == [f"{PROBE}/gone"]


class TestMissingNode:
	def test_an_unknown_path_fails_rather_than_reporting_clean(self, scene):
		scene(PROBE, [])

		result = TouchDesignerApiService().get_node_errors("/project1/nope")

		assert result["success"] is False
		assert "nope" in result["error"]
