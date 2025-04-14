import json
from typing import Any, Dict, Generic, Optional, Tuple, TypeVar, Union

T = TypeVar("T")
E = TypeVar("E")


class Result(Generic[T, E]):

    def __init__(
        self, success: bool, data: Optional[T] = None, error: Optional[E] = None
    ):
        self.success = success
        self.data = data
        self.error = error

    @classmethod
    def ok(cls, data: T = None) -> "Result[T, E]":
        return cls(True, data=data)

    @classmethod
    def fail(cls, error: E) -> "Result[T, E]":
        return cls(False, error=error)

    def to_response(self) -> Dict[str, Any]:
        if not self.success:
            return {
                "statusCode": 500,
                "statusReason": "Internal Server Error",
                "data": json.dumps({"error": str(self.error)}),
            }
        return {
            "statusCode": 200,
            "statusReason": "OK",
            "data": json.dumps({"data": self.data}, default=serialize_td_object),
        }


def parse_json_params(value: Union[str, Dict, None]) -> Result[Dict[str, Any], str]:
    if value is None:
        return Result.ok({})

    if isinstance(value, dict):
        return Result.ok(value)

    if isinstance(value, str):
        try:
            return Result.ok(json.loads(value))
        except json.JSONDecodeError as e:
            return Result.fail(f"JSONパースエラー: {e}")

    return Result.fail(
        f"パラメータは文字列または辞書である必要があります: {type(value)}"
    )


def serialize_td_object(obj):
    try:
        if hasattr(obj, "eval"):
            return obj.eval()
        elif isinstance(obj, (int, float, str, bool, type(None))):
            return obj
        elif isinstance(obj, (list, tuple)):
            return [serialize_td_object(o) for o in obj]
        elif isinstance(obj, dict):
            return {str(k): serialize_td_object(v) for k, v in obj.items()}
        elif hasattr(obj, "__class__") and obj.__class__.__name__ == "Page":
            return f"Page:{obj.name}" if hasattr(obj, "name") else str(obj)
        elif hasattr(obj, "__dict__"):
            try:
                return {
                    k: serialize_td_object(v)
                    for k, v in obj.__dict__.items()
                    if not k.startswith("_")
                }
            except:
                return str(obj)
        else:
            return str(obj)
    except Exception as e:
        return f"<error: {e}>"
