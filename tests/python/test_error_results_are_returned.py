"""Every "here is what went wrong" message in the service, checked end to end.

``error_result()`` builds a ``Result`` dict. Nine call sites handed that dict
to ``raise``, and ``raise <dict>`` cannot work: Python rejects it with
``TypeError: exceptions must derive from BaseException`` before the dict is
ever looked at. The generated handler catches that TypeError and reports it,
so a caller asking about a node that is not there was told

    Handler for 'get_nodes' failed: exceptions must derive from BaseException

instead of

    Parent node not found at path: /project1/test_base_comp

Every one of the nine messages was unreachable, and the nine that mattered
most: they are the ones that say the thing the caller got wrong. The defect
predates this branch (it arrived in 37ed1f1) and was found from the outside,
when a live integration run lost its sandbox mid-run and the suite could not
say so.

These tests pin the messages rather than the mechanism, because the mechanism
is what was wrong. Restoring any ``raise`` makes the corresponding test fail
with TypeError — that is the check that this file discriminates.
"""

import pytest

from mcp.services.api_service import TouchDesignerApiService

PROBE = "/project1/probe"
ABSENT = "/project1/not_here"


@pytest.fixture
def service():
	return TouchDesignerApiService()


def failure_of(result):
	"""Assert the call reported a failure, and hand back its message."""

	assert result["success"] is False, result
	return result["error"]


class TestANodeThatIsNotThere:
	"""The path a caller most often gets wrong, across every method."""

	def test_get_node_detail_names_the_path(self, service, scene):
		scene(PROBE, [])

		message = failure_of(service.get_node_detail(ABSENT))

		assert message == f"Node not found at path: {ABSENT}"

	def test_get_nodes_says_it_was_the_parent(self, service, scene):
		# The wording differs from the others on purpose: the caller supplied
		# a parent, and "node not found" would send them looking at the wrong
		# argument.
		scene(PROBE, [])

		message = failure_of(service.get_nodes(ABSENT))

		assert message == f"Parent node not found at path: {ABSENT}"

	def test_exec_node_method_names_the_path(self, service, scene):
		scene(PROBE, [])

		message = failure_of(
			service.exec_node_method(ABSENT, "ops", [], {}),
		)

		assert message == f"Node not found at path: {ABSENT}"

	def test_update_node_names_the_path(self, service, scene):
		scene(PROBE, [])

		message = failure_of(service.update_node(ABSENT, {"tx": 1}))

		assert message == f"Node not found at path: {ABSENT}"


class TestAMethodThatIsNotThere:
	def test_an_absent_method_names_both_the_method_and_the_node(
		self, service, scene
	):
		node = scene(PROBE, [])

		message = failure_of(
			service.exec_node_method(node.path, "no_such_method", [], {}),
		)

		assert message == f"Method no_such_method not found on node {node.path}"

	def test_an_attribute_that_is_not_callable_is_refused(self, service, scene):
		# `path` exists on every operator and is a string, so it reaches the
		# callable check rather than the hasattr one above.
		node = scene(PROBE, [])

		message = failure_of(service.exec_node_method(node.path, "path", [], {}))

		# Only the stable half is asserted. The message interpolates the
		# attribute's value rather than its name, because the loop rebinds
		# `method` before formatting; that is a separate defect and pinning it
		# here would make it look intended.
		assert "is not a callable method" in message


class TestAClassThatIsNotThere:
	def test_an_unknown_class_names_what_was_asked_for(self, service):
		message = failure_of(
			service.get_td_python_class_details("NoSuchClassAnywhere"),
		)

		assert message == "Class or module not found: NoSuchClassAnywhere"


class TestNothingWasUpdated:
	"""The two ends of update_node's else branch, which say different things.

	One means "your properties were rejected", the other means "you asked for
	nothing". A caller debugging a silent update needs to know which.
	"""

	def test_properties_that_all_failed_say_so(self, service, scene):
		# FakeOp has no `par`, so every property raises inside the loop's own
		# try and lands in failed_properties — the same shape as a real
		# operator refusing every parameter it was handed.
		node = scene(PROBE, [])

		message = failure_of(service.update_node(node.path, {"tx": 1}))

		assert message == "Failed to update any properties"

	def test_an_empty_request_is_not_reported_as_a_failure_to_update(
		self, service, scene
	):
		node = scene(PROBE, [])

		message = failure_of(service.update_node(node.path, {}))

		assert message == "No matching properties to update"
