# dump_operator_pars.py — batch-inspect operator parameters from live TouchDesigner.
#
# Send this through the execute_python_script MCP tool against a live
# TouchDesigner instance. Set OPS to the operator class names to dump
# (batch a handful per call to keep responses small), then inspect the returned
# JSON: `help` is TouchDesigner's official rollover help text, `label` the UI
# label, and `name` the Python name to use with update_td_node_parameters.
import json

import td

OPS = ["noiseTOP"]  # replace with the target batch before sending

parent = op("/project1") or op("/")
rows = {}
for cls_name in OPS:
    cls = getattr(td, cls_name, None)
    if cls is None:
        rows[cls_name] = "MISSING CLASS"
        continue
    n = parent.create(cls, "zztmp_dump")
    try:
        rows[cls_name] = [
            {
                "name": p.name,
                "label": p.label,
                "style": p.style,
                "default": str(p.default),
                "page": p.page.name if p.page else "",
                "menu": list(p.menuNames) if p.isMenu else None,
                "help": p.help,
            }
            for p in n.pars()
            if (p.page.name if p.page else "") not in ("Common",)
        ]
    finally:
        n.destroy()
result = json.dumps(rows)
