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

	def test_quoted_file_inside_the_subtree_is_not_an_anchor(self, scene):
		# Same shape, but the quoted path sits under the queried node. Being
		# in the subtree is not enough; it has to be a real operator.
		node = scene(PROBE, [f"{PROBE}/cb"])

		entries = _parse_op_messages(
			f"{PROBE}/cb:  Error: ValueError raised\n"
			f"{PROBE}/data.csv: Error: bad row",
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

		entries = _parse_op_messages(
			"  Error: boom (/project1/shared)", "error", node
		)

		assert entries[0]["nodePath"] == PROBE


	def test_a_path_spelled_like_a_file_is_never_an_anchor(self, scene):
		# TouchDesigner refuses an operator name containing a dot, so this is
		# decidable without asking it, and nothing about it is ambiguous.
		node = scene(PROBE, [f"{PROBE}/cb"])
		declined = []

		entries = _parse_op_messages(
			f"{PROBE}/cb:  Error: ValueError raised\n"
			f"{PROBE}/data.csv: Error: bad row",
			"error",
			node,
			declined,
		)

		assert len(entries) == 1
		assert declined == []

	def test_a_declined_trailing_path_is_reported_too(self, scene):
		# Falling back to the queried node is a misattribution whichever code
		# path got there, so the anchor branch is not the only one that says so.
		node = scene(PROBE, [])
		declined = []

		_parse_op_messages(
			f"  Error: boom ({PROBE}/gone)", "error", node, declined
		)

		assert declined == [f"{PROBE}/gone"]


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
