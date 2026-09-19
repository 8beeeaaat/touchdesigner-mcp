"""Tests for the TouchDesigner error/warning message parser.

Every sample here is verbatim output from TD 099.2025.33230 unless a test says
otherwise. The parser is where the risk in this area lives: the TypeScript
tests hand-write its output as their input, so they cannot catch a parser bug
by construction.
"""

from mcp.services.api_service import _parse_op_messages

PROBE = "/project1/jev_probe"

# errors(recurse=True) on a container holding two broken Python expressions
# and two operators with no input. The first two failures each span three
# lines; the last two are single lines that repeat their own path.
ERRORS_RAW = (
	f"{PROBE}/bad_res:  Error: AttributeError: 'NoneType' object has no attribute 'par' \n"
	", line 1, in <module>\n"
	f"Context:(Parameter: Resolution) ({PROBE}/bad_res)\n"
	f"{PROBE}/bad_expr:  Error: AttributeError: 'NoneType' object has no attribute 'par' \n"
	", line 1, in <module>\n"
	f"Context:(Parameter: const0value) ({PROBE}/bad_expr)\n"
	f"{PROBE}/downstream_comp:  Error: Not enough sources specified ({PROBE}/downstream_comp)\n"
	f"{PROBE}/no_input_displace:  Error: Not enough sources specified ({PROBE}/no_input_displace)"
)

# warnings(recurse=True) on the same container. Note the missing space after
# the colon, which errors() does not have.
WARNINGS_RAW = (
	f"{PROBE}/bad_glsl:Warning: The GLSL Shader has compile errors (Use Info DAT to see details). ({PROBE}/bad_glsl)\n"
	f'{PROBE}/bad_select:Warning: Invalid path for node "/project1/does_not_exist" referenced by parameter "TOP" ({PROBE}/bad_select)\n'
	f"{PROBE}/missing_movie:Warning: Failed to open file. ({PROBE}/missing_movie)"
)

BROKEN_OPS = [
	f"{PROBE}/bad_res",
	f"{PROBE}/bad_expr",
	f"{PROBE}/downstream_comp",
	f"{PROBE}/no_input_displace",
	f"{PROBE}/bad_glsl",
	f"{PROBE}/bad_select",
	f"{PROBE}/missing_movie",
]


class TestRealOutput:
	def test_one_entry_per_failure_not_per_line(self, scene):
		node = scene(PROBE, BROKEN_OPS)

		entries = _parse_op_messages(ERRORS_RAW, "error", node)

		# Splitting on newlines would report 8. Two of these span three lines.
		assert len(entries) == 4

	def test_each_entry_names_the_operator_that_failed(self, scene):
		node = scene(PROBE, BROKEN_OPS)

		entries = _parse_op_messages(ERRORS_RAW, "error", node)

		assert [e["nodePath"] for e in entries] == [
			f"{PROBE}/bad_res",
			f"{PROBE}/bad_expr",
			f"{PROBE}/downstream_comp",
			f"{PROBE}/no_input_displace",
		]

	def test_traceback_lines_stay_with_their_failure(self, scene):
		node = scene(PROBE, BROKEN_OPS)

		first = _parse_op_messages(ERRORS_RAW, "error", node)[0]

		assert "AttributeError" in first["message"]
		assert ", line 1, in <module>" in first["message"]
		assert "Context:(Parameter: Resolution)" in first["message"]

	def test_redundant_trailing_path_is_dropped(self, scene):
		node = scene(PROBE, BROKEN_OPS)

		entries = _parse_op_messages(ERRORS_RAW, "error", node)

		assert entries[2]["message"] == "Not enough sources specified"

	def test_warning_stream_parses_despite_the_missing_space(self, scene):
		node = scene(PROBE, BROKEN_OPS)

		entries = _parse_op_messages(WARNINGS_RAW, "warning", node)

		assert len(entries) == 3
		assert {e["level"] for e in entries} == {"warning"}
		assert entries[2]["message"] == "Failed to open file."


class TestAttribution:
	def test_level_comes_from_the_stream_not_the_anchor_word(self, scene):
		# Otherwise a "Warning:"-anchored line arriving on the errors stream
		# yields errorCount 0 from a non-empty errors blob.
		node = scene("/project1", ["/project1/m"])

		entries = _parse_op_messages(
			"/project1/m:  Warning: File not found.\n", "error", node
		)

		assert [e["level"] for e in entries] == ["error"]

	def test_quoted_path_outside_the_subtree_is_not_an_anchor(self, scene):
		# A callback raising ValueError("/project1/shared: Error: ...") must
		# not split its own traceback and blame an unrelated operator.
		node = scene(PROBE, [f"{PROBE}/script1", "/project1/shared"])

		entries = _parse_op_messages(
			f"{PROBE}/script1:  Error: ValueError: rejected\n"
			"/project1/shared: Error: downstream note\n"
			f'  File "{PROBE}/script1", line 3',
			"error",
			node,
		)

		assert len(entries) == 1
		assert entries[0]["nodePath"] == f"{PROBE}/script1"
		assert "downstream note" in entries[0]["message"]

	def test_an_operator_loud_on_the_other_stream_is_still_an_anchor(self, scene):
		# The anchor word and the blob it arrives in are independent — the
		# level comes from the stream precisely because the word cannot be
		# trusted. So an operator that failed on warnings, named by a line in
		# the errors blob, is a real anchor. Probing only the stream being
		# parsed would find nothing and fold its lines into the entry above,
		# silently, which is the defect the probe was added to prevent.
		node = scene(PROBE, [f"{PROBE}/cb"])
		node_warn_only = scene(PROBE, [f"{PROBE}/cb"])
		import conftest

		conftest._fake_td.ops[f"{PROBE}/quiet_on_errors"] = conftest.FakeOp(
			f"{PROBE}/quiet_on_errors"
		).with_streams(errors="", warnings="Warning: Failed to open file.")
		declined = []

		entries = _parse_op_messages(
			f"{PROBE}/cb:  Error: first\n{PROBE}/quiet_on_errors: Warning: second",
			"error",
			node_warn_only,
			declined,
		)

		assert [e["nodePath"] for e in entries] == [
			f"{PROBE}/cb",
			f"{PROBE}/quiet_on_errors",
		]
		assert declined == []
		assert node is not None

	def test_a_capitalised_operator_is_still_an_anchor(self, scene):
		# Every other operator name in this suite is lowercase, so widening
		# the name rule to reject capitals would pass every test while folding
		# a real failure into its neighbour — and capitalised COMP names are
		# ordinary in a TouchDesigner project.
		node = scene(PROBE, [f"{PROBE}/cb", f"{PROBE}/MyComp"])
		declined = []

		entries = _parse_op_messages(
			f"{PROBE}/cb:  Error: first failure\n"
			f"{PROBE}/MyComp:  Error: second failure",
			"error",
			node,
			declined,
		)

		assert [e["nodePath"] for e in entries] == [
			f"{PROBE}/cb",
			f"{PROBE}/MyComp",
		]
		assert declined == []

	def test_a_sibling_sharing_the_query_prefix_is_outside_the_subtree(self, scene):
		# The containment test is a string prefix, so it has to end at a path
		# separator. "/project1/probe2" starts with "/project1/probe" and is a
		# different container; without the trailing slash its operators would
		# be treated as anchors and blamed for the queried node's failures.
		# Derived from PROBE, not written out: a literal drifts from the
		# constant the code reads, and then the line is declined by the
		# containment check instead of reaching it — which is how this test
		# passed under the very mutation it was written to catch.
		node = scene(PROBE, [f"{PROBE}/cb", f"{PROBE}2/x"])
		declined = []

		entries = _parse_op_messages(
			f"{PROBE}/cb:  Error: ValueError raised\n"
			f"{PROBE}2/x: Error: quoted by the callback",
			"error",
			node,
			declined,
		)

		assert [e["nodePath"] for e in entries] == [f"{PROBE}/cb"]
		assert declined == []

	def test_a_quoted_healthy_sibling_is_not_an_anchor(self, scene):
		# The hardest case: the quoted path is in the subtree, spelled like an
		# operator, and resolves to a real one. Every test but the last clears
		# it. What separates them is that TouchDesigner writes a prefixed line
		# only for an operator that has something to say, and `shared` is fine.
		node = scene(PROBE, [f"{PROBE}/cb"], healthy=[f"{PROBE}/shared"])
		declined = []

		entries = _parse_op_messages(
			f"{PROBE}/cb:  Error: ValueError raised\n"
			f"{PROBE}/shared: Error: referenced while handling\n"
			f'  File "{PROBE}/cb", line 3',
			"error",
			node,
			declined,
		)

		assert len(entries) == 1
		assert entries[0]["nodePath"] == f"{PROBE}/cb"
		assert "referenced while handling" in entries[0]["message"]
		# Positive evidence that it is quoted text, so nothing is ambiguous.
		assert declined == []

	def test_quoted_file_inside_the_subtree_is_not_an_anchor(self, scene):
		# Same shape, but the quoted path sits under the queried node. Being
		# in the subtree is not enough; it has to be a real operator.
		node = scene(PROBE, [f"{PROBE}/cb"])

		entries = _parse_op_messages(
			f"{PROBE}/cb:  Error: ValueError raised\n{PROBE}/data.csv: Error: bad row",
			"error",
			node,
		)

		assert len(entries) == 1
		assert entries[0]["nodePath"] == f"{PROBE}/cb"

	def test_root_query_does_not_invent_operators(self, scene):
		# Querying "/" makes a subtree test vacuous, since every absolute path
		# starts with "/". A traceback carrying a filesystem path must not
		# become an entry for an operator that does not exist.
		node = scene("/", ["/project1/dat1"], op_type="rootCOMP")

		entries = _parse_op_messages(
			"/project1/dat1:  Error: Python error in Execute DAT\n"
			"Traceback (most recent call last):\n"
			"/Volumes/media/clip.mov: Error: cannot open",
			"error",
			node,
		)

		assert len(entries) == 1
		assert entries[0]["nodePath"] == "/project1/dat1"
		assert "cannot open" in entries[0]["message"]

	def test_unprefixed_output_recovers_its_owner_from_the_suffix(self, scene):
		# recurse=False carries no "<path>:" prefix but still names the owner
		# at the end. Blaming the queried node instead would be wrong.
		node = scene(PROBE, [f"{PROBE}/bad_res"])

		entries = _parse_op_messages(
			"  Error: AttributeError: boom \n"
			", line 1, in <module>\n"
			f"Context:(Parameter: Resolution) ({PROBE}/bad_res)",
			"error",
			node,
		)

		assert len(entries) == 1
		assert entries[0]["nodePath"] == f"{PROBE}/bad_res"

	def test_unprefixed_output_ignores_a_suffix_outside_the_subtree(self, scene):
		node = scene(PROBE, ["/project1/shared"])

		entries = _parse_op_messages("  Error: boom (/project1/shared)", "error", node)

		assert entries[0]["nodePath"] == PROBE

	def test_a_path_spelled_like_a_file_is_never_an_anchor(self, scene):
		# TouchDesigner refuses an operator name containing a dot, so this is
		# decidable without asking it, and nothing about it is ambiguous.
		node = scene(PROBE, [f"{PROBE}/cb"])
		declined = []

		entries = _parse_op_messages(
			f"{PROBE}/cb:  Error: ValueError raised\n{PROBE}/data.csv: Error: bad row",
			"error",
			node,
			declined,
		)

		assert len(entries) == 1
		assert declined == []

	def test_a_lookup_answering_with_another_operator_is_rejected(self, scene, td_stub):
		# td.op() takes a glob and answers with whichever operator it matched,
		# so what comes back is not necessarily what was asked for. The
		# spelling rule cannot catch this - the path is spelled cleanly - so
		# only requiring owner.path == path does.
		node = scene(PROBE, [f"{PROBE}/cb", f"{PROBE}/alpha"])
		td_stub.answer_with = {f"{PROBE}/beta": f"{PROBE}/alpha"}
		declined = []

		entries = _parse_op_messages(
			f"{PROBE}/cb:  Error: ValueError raised\n"
			f"{PROBE}/beta:  Error: matched something else",
			"error",
			node,
			declined,
		)

		# Without the guard the second anchor is accepted and an entry is
		# fabricated blaming alpha, which never failed.
		assert [e["nodePath"] for e in entries] == [f"{PROBE}/cb"]
		assert [(n.path, n.kind) for n in declined] == [(f"{PROBE}/beta", "unresolved")]

	def test_a_wildcard_is_rejected_before_any_lookup(self, scene):
		node = scene(PROBE, [f"{PROBE}/cb", f"{PROBE}/alpha"])
		declined = []

		entries = _parse_op_messages(
			f"{PROBE}/cb:  Error: ValueError raised\n"
			f"{PROBE}/*:  Error: matched something",
			"error",
			node,
			declined,
		)

		assert len(entries) == 1
		assert declined == []

	def test_a_dot_in_a_middle_component_is_enough(self, scene):
		node = scene(PROBE, [f"{PROBE}/cb"])
		declined = []

		_parse_op_messages(
			f"{PROBE}/cb:  Error: raised\n{PROBE}/my.folder/op1:  Error: quoted",
			"error",
			node,
			declined,
		)

		assert declined == []

	def test_a_declined_trailing_path_is_reported_too(self, scene):
		# Falling back to the queried node is a misattribution whichever code
		# path got there, so the anchor branch is not the only one that says so.
		node = scene(PROBE, [])
		declined = []

		_parse_op_messages(f"  Error: boom ({PROBE}/gone)", "error", node, declined)

		assert [(n.path, n.kind) for n in declined] == [
			(f"{PROBE}/gone", "misattributed")
		]


class TestRobustness:
	def test_a_raising_op_lookup_keeps_every_entry(self, scene, td_stub):
		# td.op() takes a glob, and the path handed to it comes from message
		# text, so a stray bracket can raise. A lookup that fails says nothing
		# about whether the operators exist, so the anchors are still trusted
		# and no entry is lost.
		node = scene(PROBE, [])
		td_stub.op_raises = True

		entries = _parse_op_messages(
			f"{PROBE}/a:  Error: first\n"
			f"{PROBE}/b:  Error: second\n"
			f"{PROBE}/c:  Error: third",
			"error",
			node,
		)

		assert [e["nodePath"] for e in entries] == [
			f"{PROBE}/a",
			f"{PROBE}/b",
			f"{PROBE}/c",
		]

	def test_lines_that_start_no_entry_join_the_one_above(self, scene):
		# Merging is the intended handling, not an accident: a line that does
		# not begin a message belongs to the message before it.
		node = scene(PROBE, [])

		entries = _parse_op_messages("mystery line\nsecond line", "error", node)

		assert len(entries) == 1
		assert entries[0]["message"] == "mystery line\nsecond line"

	def test_blank_input_yields_nothing(self, scene):
		node = scene(PROBE, [])

		assert _parse_op_messages("\n  \n", "error", node) == []

	def test_unanchored_line_carries_the_queried_node_identity(self, scene):
		node = scene(PROBE, [])

		entries = _parse_op_messages("  Error: orphaned", "error", node)

		assert entries[0]["nodePath"] == PROBE
		assert entries[0]["nodeName"] == "jev_probe"
		assert entries[0]["opType"] == "baseCOMP"
