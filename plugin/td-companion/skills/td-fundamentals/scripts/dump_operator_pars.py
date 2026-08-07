# dump_operator_pars.py — batch-inspect operator parameters from live TouchDesigner.
#
# Send this through the execute_python_script MCP tool against a live
# TouchDesigner instance. NOTE: this writes to the project — it creates a
# temporary operator per class and destroys it again, so the project is left
# unmodified but becomes dirty/unsaved, and classes that grab hardware on
# construction (videodeviceinTOP, audiodeviceoutCHOP) will do so briefly.
# Common-page parameters are omitted from the output on purpose; drop the
# page filter below if one is needed. Set OPS to the operator class names to dump
# (batch a handful per call to keep responses small), then inspect the returned
# JSON: `help` is TouchDesigner's official rollover help text, `label` the UI
# label, and `name` the Python name to use with update_td_node_parameters.
import json

import td

OPS = ["noiseTOP"]  # replace with the target batch before sending

# No /project1 in a project opened straight from a .tox — fall back to root,
# which is where the temporary operators will then be created.
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
