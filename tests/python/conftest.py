"""Import td/modules with a stubbed ``td`` so TD-side logic can be tested off-TD.

``api_service`` reaches TouchDesigner only through ``import td``; nothing else
in its import graph touches TD at module scope. A stub module is therefore the
whole harness, in the same spirit as ``mcp/services/node_layout.py``, which
avoids ``import td`` outright so its geometry can be verified here.
"""

import sys
import types
from pathlib import Path

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

	def op(self, path: str):
		if self.op_raises:
			# td.op() takes a glob, so malformed text reaching it can raise.
			raise RuntimeError(f"bad pattern: {path}")
		return self.ops.get(path)


_fake_td = FakeTd()
_td_module = types.ModuleType("td")
_td_module.op = lambda path: _fake_td.op(path)
sys.modules.setdefault("td", _td_module)


@pytest.fixture
def scene():
	"""Build a fake project and return the node a report would be queried on."""

	def make(queried: str = "/project1/probe", ops=(), op_type: str = "baseCOMP"):
		_fake_td.ops.clear()
		_fake_td.op_raises = False
		for path in ops:
			_fake_td.ops[path] = FakeOp(path)
		node = FakeOp(queried, op_type)
		_fake_td.ops[queried] = node
		return node

	yield make
	_fake_td.ops.clear()
	_fake_td.op_raises = False


@pytest.fixture
def td_stub():
	"""Direct handle on the stub, for tests that need td.op() to misbehave."""

	return _fake_td
