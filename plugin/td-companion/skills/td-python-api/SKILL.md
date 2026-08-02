---
name: td-python-api
description: This skill should be used when writing, editing, or debugging Python code that runs inside TouchDesigner — scripts, expressions, DAT callbacks, Extensions, or one-off snippets passed to execute_python_script — or whenever there is uncertainty about a `td` class's methods, members, or module-level API. Trigger phrases include "TD Python", "op()", "AttributeError in TouchDesigner", "what method does X have", "write a Python expression for this parameter", "does this CHOP/TOP/DAT support Y", and any request to script TouchDesigner behavior.
version: 0.1.0
---

# TD Python API Discipline

## Core rule

Never guess a TouchDesigner Python API signature. Treat every method name, attribute name, and parameter name on a `td` class as unverified until it has been looked up or probed in the live session. Do not pattern-match from general Python knowledge, from other creative-coding frameworks, or from a plausible-sounding name.

This rule exists for a concrete reason: the `td` module is large (hundreds of operator classes, each with its own methods and parameters), it changes across TouchDesigner versions (a method present in one build can be renamed, removed, or gain new required arguments in another), and it is thinly and unevenly represented in general-purpose training data compared to mainstream libraries. A guess that "looks right" is exactly the failure mode to guard against, because it will often be subtly wrong — a slightly incorrect parameter name, a method that exists on `OP` but not on the specific operator subclass in question, or a signature from a different TD version. Verify before writing any non-trivial script, and especially before writing anything that mutates the project (creating nodes, changing parameters, deleting nodes, running exports).

Trivial, well-established usage (see "Safe core APIs" below) does not need a fresh lookup every time. Everything else does.

## The lookup ladder

Work through these steps in order, stopping as soon as the needed information is confirmed. Do not skip straight to writing a full script when the API surface involved is unfamiliar.

1. **Find the class.** Use `get_td_classes` to search the catalogue of TouchDesigner Python classes and modules. Use this when the exact class name is unknown — for example, unsure whether the relevant class is `textTOP`, `topOP`, or something else entirely.
2. **Inspect the class.** Use `get_td_class_details` with the resolved class name to retrieve its methods and members. Read the returned signatures carefully — argument names, defaults, and return types matter. This is the step that catches "that method doesn't take a `path` argument" or "this is a read-only property, not a callable."
3. **Read module-level docs.** Use `get_td_module_help` to pull the Python `help()` text for a module or class when behavior, not just signature, is in question — for example, how a family of related methods interact, or what a parameter's accepted value range is.
4. **Probe interactively.** Before committing to a full script, run a tiny snippet through `execute_python_script` to check reality directly against a live node: `print(dir(op('/project1/text1')))` to list everything available, `print(type(op('/project1/text1')))` to confirm the resolved class, or `print(repr(op('/project1/text1').par.text.eval()))` to inspect an actual value. This step catches version drift and instance-specific quirks that static docs cannot.

Only after one or more of these steps confirms the API surface should the real script be written. When several unfamiliar classes are involved, repeat the ladder per class rather than assuming siblings behave the same way.

## Safe core APIs that need no lookup

A small set of TouchDesigner Python idioms are stable enough across versions and documented widely enough to use directly, without going through the lookup ladder first:

- `op('path')` — resolve a node by absolute or relative path; returns `None` if not found, so check before using the result.
- `parent()` / `parent(n)` — resolve an ancestor COMP relative to the running script's owner.
- `me` — the operator currently executing the script (inside DAT text, Parameter Execute DATs, Extensions, etc.).
- `.par.<name>` — access a parameter object; `.eval()` returns the evaluated current value regardless of mode, `.val` reads/writes the raw value of the parameter's current mode, and `.expr` reads/writes the expression string (setting `.expr` switches the parameter to expression mode). Confirm the exact parameter name via `get_td_node_parameters` or `get_td_class_details` when it isn't already known from the node's UI.
- `.name`, `.path`, `.children` — basic node identity and hierarchy properties present on all operators.
- `absTime.seconds`, `absTime.frame` — global absolute time, independent of any component's local timeline.

Everything beyond this list — operator-specific methods (`.cook()`, `.save()`, `.par.<x>.pulse()`, format-specific export calls, CHOP/TOP/SOP-specific accessors) — goes through the lookup ladder first.

## Script structure for execute_python_script

When writing a script to hand to `execute_python_script`, favor small, idempotent, and observable scripts over large speculative ones:

- Keep each script focused on one task. A script that creates a node, wires it, and sets three parameters is fine; a script that tries to build an entire network in one shot is harder to debug when step four fails silently.
- Make scripts idempotent where practical — check whether a node already exists before creating it, guard parameter writes so re-running the script doesn't duplicate side effects.
- Print or return JSON-serializable results (`dict`, `list`, primitives). The tool's result is meant to be inspected by the calling agent, so surface the state that matters — created paths, resolved values, counts — rather than leaving the caller to guess whether something worked.
- Wrap risky operations in `try/except` and print the exception (`print(f"error: {e}")` or include it in the returned payload) rather than letting the script raise silently or letting one failure abort an otherwise-useful batch of operations.
- Never leave the project half-modified on failure. If a script creates several related nodes and one step fails, either roll back what was created or clearly report the partial state so the situation is legible rather than silently inconsistent.

## Debugging failed scripts

When a script returns an error or unexpected result:

1. Read the returned error message and traceback in full before retrying — it usually names the exact attribute, method, or line at fault.
2. Reproduce the failure with the smallest possible snippet. Strip the failing script down to the one expression that raised, and run just that through `execute_python_script`.
3. Re-enter the lookup ladder for whatever class or method the error implicates — an `AttributeError` on a specific operator instance means step 2 (`get_td_class_details`) or step 4 (probing with `dir()`/`type()`) was skipped or gave stale information.
4. Check textport conventions when output seems missing or garbled — TouchDesigner's Textport is line-oriented and can interleave output from other running processes; prefer explicit returned values over relying on print-order when precision matters.

## exec_node_method vs execute_python_script

Choose based on shape of the operation:

- Use `exec_node_method` for a single, well-defined method call on one node — one documented method (a save, an export, a pulse-triggering call, or anything else confirmed via `get_td_class_details` first) invoked once. It takes a node path, a method name, and positional/keyword arguments, and returns that one call's raw result. Prefer it when the whole task is "call this one confirmed method."
- Use `execute_python_script` for anything involving multiple steps, control flow, multiple nodes, or any logic beyond a single call — loops over `findChildren()` results, conditional node creation, aggregating data across a network, or any script where intermediate values need inspecting. It is also the only path to interactive probing (step 4 of the lookup ladder), since `exec_node_method` cannot run arbitrary expressions.

When in doubt, start with `execute_python_script`: it is the more general tool, and reaching for `exec_node_method` only pays off once the exact single method call needed is already confirmed.
