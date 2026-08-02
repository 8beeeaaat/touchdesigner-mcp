# TouchDesigner Operator Live Lookup

Parameter names, defaults, menu options, and documentation must be fetched from the running TouchDesigner instance when needed. This avoids stale static references and makes the installed TouchDesigner build the ground truth.

## Live lookup procedure

Fetch parameter facts on demand, in this order:

1. **An existing node's parameters and current values** — call `get_td_node_parameters` with the node's path. Fastest path when the node is already in the network.

2. **Full metadata + official docs for any operator type** — run this through `execute_python_script` (works whether or not an instance exists yet; creates a throwaway node and destroys it):

   ```python
   import json, td
   CLS = 'noiseTOP'          # operator type to inspect
   parent = op('/project1') or op('/')
   n = parent.create(getattr(td, CLS), 'zztmp_lookup')
   try:
       result = json.dumps([
           {'name': p.name, 'label': p.label, 'style': p.style,
            'default': str(p.default),
            'page': p.page.name if p.page else '',
            'menu': list(p.menuNames) if p.isMenu else None,
            'help': p.help}
           for p in n.pars()
           if (p.page.name if p.page else '') not in ('Common',)])
   finally:
       n.destroy()
   ```

   `help` is TouchDesigner's official rollover documentation for the parameter; `name` is the exact lowercase key to pass to `update_td_node_parameters`; `menu` lists the legal values for menu-style parameters. To inspect an existing node instead, run the same loop over `op(path).pars()` without creating anything. For dumping several operators in one pass, use the batch variant at `../scripts/dump_operator_pars.py`.

3. **Methods and properties of the operator's Python class** — `get_td_class_details` (and `get_td_module_help` for module-level docs). These cover the scripting surface, not parameters.

Never write a parameter value from a name recalled from memory — look the name up first via step 1 or 2. Class-name existence is also checkable cheaply: `getattr(td, 'someTOP', None)` (e.g. `geometryCOMP` and `cameraCOMP` exist; `geoCOMP`/`camCOMP` do not).
