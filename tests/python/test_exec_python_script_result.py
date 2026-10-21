"""Synthetic result values from execute_python_script are processed recursively."""

from mcp.services.api_service import TouchDesignerApiService


def test_exec_python_script_preserves_nested_data_without_operator_lookup(
	td_stub, monkeypatch
):
	service = TouchDesignerApiService()
	calls = []
	original_op = td_stub.op

	def record_op(value):
		calls.append(value)
		return original_op(value)

	monkeypatch.setattr(td_stub, "op", record_op)
	expected = {
		"a": {
			"component": "/project1/x",
			"select": "u v",
			"nested": [{"id": 1, "name": "synthetic"}],
		},
	}
	script = """result = {
	"a": {
		"component": "/project1/x",
		"select": "u v",
		"nested": [{"id": 1, "name": "synthetic"}],
	}
}"""

	response = service.exec_python_script(script)

	assert response["success"] is True
	assert response["data"]["result"] == expected
	assert calls == [".."]
