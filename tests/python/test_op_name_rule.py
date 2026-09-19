"""The measurements the parser's guards rest on, kept where they can be rerun.

Several comments in ``mcp/services/api_service.py`` cite TouchDesigner
behaviour: which characters it refuses in an operator name, that a working
operator reports an empty string, that ``recurse=True`` never anchors outside
the queried subtree. Each was measured before the guard was written, and one
of those comments tells the next maintainer to get "the same live evidence
these have" — which was true of the author and not of the repository.

This file is that evidence. The probe is a script rather than a test, because
running it needs a live TouchDesigner with the WebServer DAT loaded; what is
checked here is that the rule the code carries still matches the recorded
result, so an edit to the rule has to come with a rerun.

Recorded against TouchDesigner 099.2025.33230, macOS 27.0, Python 3.11.15.
Rerun with:

    python tests/python/test_op_name_rule.py

which prints one line per character. Every character below raised
``tdError: Illegal node name specified`` from
``op('/project1').create('constantTOP', 'a' + c + 'b')``, and no printable
ASCII outside the set was refused. Non-ASCII names were refused too — ``ノード1``,
``café``, ``Ω``, ``a·b`` — but are deliberately left out of the rule so a build
that starts accepting them fails visibly through the lookup rather than
silently through the spelling check.
"""

import pytest

# Verbatim from the recorded run. Kept as a literal rather than derived from
# the rule, so a change to the rule shows up here as a diff to be justified.
REJECTED_BY_TOUCHDESIGNER = set(" !\"#$%&'()*+,-./:;<=>?@[\\]^`{|}~")

PROBE = "/project1/probe"


def _rule():
	"""Import lazily: the probe below runs without conftest's td stub."""

	from mcp.services.api_service import _ILLEGAL_IN_OP_NAME, _looks_like_op_path

	return _ILLEGAL_IN_OP_NAME, _looks_like_op_path


def test_the_rule_matches_what_was_measured():
	illegal, _ = _rule()

	assert illegal == REJECTED_BY_TOUCHDESIGNER


def test_every_recorded_character_is_refused_in_a_path():
	_, looks_like_op_path = _rule()

	# "/" is the path separator, so it cannot appear inside a component and
	# is carried in the set only to keep it a faithful record of the probe.
	for char in sorted(REJECTED_BY_TOUCHDESIGNER - {"/"}):
		assert not looks_like_op_path(f"{PROBE}/a{char}b"), char


def test_a_name_of_letters_digits_and_underscore_is_accepted():
	# `1leading` is accepted by TouchDesigner, so the rule is not "a valid
	# Python identifier" and cannot be replaced by one.
	_, looks_like_op_path = _rule()

	for name in ("a1_B2", "__x__", "1leading", "x9_Y"):
		assert looks_like_op_path(f"{PROBE}/{name}"), name


def test_the_generated_schema_is_ascii():
	"""TouchDesigner's Python opens the schema with the platform default.

	`import_modules.setup()` now passes encoding="utf-8", so this is belt and
	braces — but one non-ASCII character in a description took down every
	route once, because the failure is not "this description is unreadable",
	it is "the schema did not load", and the exec endpoint that would let you
	fix it lives in the schema.
	"""

	from pathlib import Path

	schema = (
		Path(__file__).resolve().parents[2]
		/ "td"
		/ "modules"
		/ "td_server"
		/ "openapi_server"
		/ "openapi"
		/ "openapi.yaml"
	)
	if not schema.exists():
		# Generated output, gitignored. Skipping is visible in the report;
		# returning would show a green tick for a check that never ran.
		pytest.skip("run `npm run gen` first: the schema is generated output")

	schema.read_bytes().decode("ascii")


def test_a_non_ascii_name_is_left_to_the_lookup():
	# TouchDesigner refuses these too, but they are deliberately absent from
	# the rule: a build that starts accepting them should fail visibly through
	# the lookup rather than silently through the spelling check. Stated in
	# the module docstring, and pinned here because an unpinned prose contract
	# is what this branch has had to correct twice already.
	_, looks_like_op_path = _rule()

	for name in ("\u30ce\u30fc\u30c91", "caf\u00e9", "\u03a9"):
		assert looks_like_op_path(f"{PROBE}/{name}"), name


def test_a_component_anywhere_in_the_path_is_checked():
	_, looks_like_op_path = _rule()

	assert not looks_like_op_path(f"{PROBE}/my.folder/op1")


if __name__ == "__main__":  # pragma: no cover - the live probe
	import json
	import urllib.request

	candidates = "".join(sorted(REJECTED_BY_TOUCHDESIGNER))
	script = f"""
import json as _json
root = op('/project1')
old = root.op('name_rule_probe')
if old: old.destroy()
p = root.create('baseCOMP', 'name_rule_probe')
out = {{}}
for c in {candidates!r}:
    try:
        n = p.create('constantTOP', 'a' + c + 'b'); n.destroy()
        out[c] = 'ACCEPTED'
    except Exception:
        out[c] = 'rejected'
p.destroy()
result = _json.dumps(out)
"""

	request = urllib.request.Request(
		"http://127.0.0.1:9981/api/td/server/exec",
		data=json.dumps({"script": script}).encode(),
		headers={"Content-Type": "application/json"},
		method="POST",
	)
	body = json.loads(urllib.request.urlopen(request, timeout=60).read().decode())
	for char, verdict in json.loads(body["data"]["result"]).items():
		print(f"{char!r:6} {verdict}")
