"""Import td/modules with a stubbed ``td`` so TD-side logic can be tested off-TD.

``api_service`` reaches TouchDesigner only through ``import td``; nothing else
in its import graph touches TD at module scope. A stub module is therefore the
whole harness, in the same spirit as ``mcp/services/node_layout.py``, which
avoids ``import td`` outright so its geometry can be verified here.
"""

import fnmatch
from pathlib import Path
import sys
import types

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "td" / "modules"))


class FakeOp:
	"""The slice of OP the error parser touches.

	``errors``/``warnings`` are absent unless a test asks for them, which is
	how an older TouchDesigner build without ``OP.warnings`` behaves.
	"""

	def __init__(self, path: str, op_type: str = "constantTOP"):
		self.path = path
		self.name = path.rsplit("/", 1)[-1] or "root"
		self.OPType = op_type
		self.valid = True
		# TouchDesigner only writes a prefixed line for an operator that has
		# something to say, so an operator a test puts in a scene has a
		# message of its own by default. `healthy=` registers one that does
		# not, which is what a traceback quoting a working sibling looks like.
		self.errors = lambda recurse=True: "  Error: something"
		self.warnings = lambda recurse=True: "Warning: something"

	def without_streams(self):
		"""Drop both message streams, as an older TouchDesigner build has."""

		del self.errors
		del self.warnings
		return self

	def reports(self, errors="", warnings=""):
		"""Give this operator messages of its own, as TouchDesigner would.

		An operator that is fine returns an empty string, which is the
		evidence that separates a real anchor from a path quoted in somebody
		else's traceback.
		"""

		return self.with_streams(errors=errors, warnings=warnings)

	def with_streams(self, errors=None, warnings=None):
		"""Attach message streams. A string is returned; an Exception raises."""

		def make(value):
			def stream(recurse=True):
				if isinstance(value, Exception):
					raise value
				return value

			return stream

		if errors is not None:
			self.errors = make(errors)
		if warnings is not None:
			self.warnings = make(warnings)
		return self


class FakeTd:
	"""Stands in for the ``td`` module, backed by a dict of operators."""

	def __init__(self):
		self.ops: dict[str, FakeOp] = {}
		self.op_raises = False
		self.op_raises_for: set[str] = set()
		# path -> the path td.op() answers with, as a glob match would
		self.answer_with: dict[str, str] = {}

	def op(self, path: str):
		# td.op() takes a glob, so malformed text reaching it can raise.
		if self.op_raises or path in self.op_raises_for:
			raise RuntimeError(f"bad pattern: {path}")
		if path in self.answer_with:
			return self.ops.get(self.answer_with[path])
		if path in self.ops:
			return self.ops[path]
		# A pattern returns whichever operator it matched, as TouchDesigner
		# does — the behaviour the exact-match check exists to reject.
		matches = fnmatch.filter(sorted(self.ops), path)
		return self.ops[matches[0]] if matches else None


_fake_td = FakeTd()
_td_module = types.ModuleType("td")
_td_module.op = lambda path: _fake_td.op(path)
sys.modules.setdefault("td", _td_module)


@pytest.fixture
def scene():
	"""Build a fake project and return the node a report would be queried on."""

	def make(
		queried: str = "/project1/probe",
		ops=(),
		op_type: str = "baseCOMP",
		healthy=(),
	):
		_fake_td.ops.clear()
		_fake_td.op_raises = False
		_fake_td.op_raises_for = set()
		_fake_td.answer_with = {}
		for path in ops:
			_fake_td.ops[path] = FakeOp(path)
		for path in healthy:
			_fake_td.ops[path] = FakeOp(path).with_streams(errors="", warnings="")
		node = FakeOp(queried, op_type)
		_fake_td.ops[queried] = node
		return node

	yield make
	_fake_td.ops.clear()
	_fake_td.op_raises = False
	_fake_td.op_raises_for = set()
	_fake_td.answer_with = {}


@pytest.fixture
def td_stub():
	"""Direct handle on the stub, for tests that need td.op() to misbehave."""

	return _fake_td
