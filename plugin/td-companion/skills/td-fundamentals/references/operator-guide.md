# TouchDesigner Live Lookup

Operator families, type names, parameter names, defaults, menu options, and documentation all belong to the **installed TouchDesigner build**, not to this plugin. Fetch them from the running instance when needed.

Nothing below is a roster to memorize. Every section is a procedure that produces the current answer, so the installed build stays the ground truth and this file cannot go stale against it.

## Discovering families and operator types

Families are the direct subclasses of `td.OP`. A concrete operator class carries a `family` class attribute; abstract intermediates (the family classes themselves, and types like `ObjectCOMP` / `PanelCOMP`) do not. That structure — not a pattern match on names, and not a hardcoded list — is what identifies them:

```python
import td, json
from collections import Counter

families = sorted(cls.__name__ for cls in td.OP.__subclasses__())

counts = Counter()
for name in dir(td):
    cls = getattr(td, name, None)
    if not (isinstance(cls, type) and issubclass(cls, td.OP)):
        continue
    family = getattr(cls, 'family', None)   # abstract intermediates drop out here
    if family is not None:
        counts[family] += 1

result = json.dumps({'families': families, 'operators_per_family': dict(counts)})
```

Send it through `execute_python_script`. Both the family roster and the per-family counts move between TouchDesigner builds — that is why this is a script rather than a table.

Family membership decides which wires are legal: operators of the same family connect directly, output connector into input connector. Crossing families always needs an explicit converter operator (see below) or a parameter-level link, never a plain wire.

### Confirming a single type name

`getattr(td, 'someTOP', None)` through `execute_python_script` is the cheapest existence check for one class name — use it before passing an uncertain `nodeType` to `create_td_node`. To browse the roster instead, `get_td_classes` returns it; pass `limit` and `detailLevel`, because the full listing runs to tens of thousands of characters on a current build.

### Finding a cross-family converter

Converters follow a `<source>to<TARGET>` naming pattern. Discover the ones the installed build actually ships rather than recalling a pair from memory:

```python
import td, re

pattern = re.compile(r'^[a-z]+to(' + '|'.join(cls.__name__ for cls in td.OP.__subclasses__()) + r')$')
result = sorted(name for name in dir(td) if pattern.match(name))
```

The real set is substantially larger than the handful usually cited, and it grows whenever a new family lands.

## Discovering an operator's parameters

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

Never write a parameter value from a name recalled from memory — look the name up first via step 1 or 2.
