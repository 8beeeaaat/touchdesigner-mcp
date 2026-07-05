"""Pure geometry helpers for laying out newly created nodes.

This module intentionally has **no** ``import td`` so the placement logic can be
unit-verified outside TouchDesigner. All coordinates use TouchDesigner's node
space: ``(x, y)`` is the lower-left corner and ``y`` grows upward.
"""

# Default grid layout tuning. Kept internal so create_node's API contract is unchanged.
DEFAULT_COLS = 5
DEFAULT_GAP = 20.0
_MAX_CELLS = 100_000

# Box = (x, y, width, height): lower-left corner plus size.


def boxes_overlap(a, b, margin=0.0):
	"""True if boxes ``a`` and ``b`` are closer than ``margin`` on both axes.

	With ``margin == gap`` this doubles as a clearance check: touching exactly at
	``gap`` distance is treated as free (uses strict ``<``).
	"""
	ax, ay, aw, ah = a
	bx, by, bw, bh = b
	return (
		ax < bx + bw + margin
		and bx < ax + aw + margin
		and ay < by + bh + margin
		and by < ay + ah + margin
	)


def _cell_box(k, width, height, cols, gap, origin):
	"""Box for the ``k``-th grid cell, row-major, wrapping every ``cols`` columns."""
	col = k % cols
	row = k // cols
	x = origin[0] + col * (width + gap)
	y = origin[1] - row * (height + gap)
	return (x, y, width, height)


def first_free_cell(
	existing,
	width,
	height,
	cols=DEFAULT_COLS,
	gap=DEFAULT_GAP,
	origin=(0.0, 0.0),
):
	"""Return ``(x, y)`` for the first grid cell that clears every ``existing`` box.

	Cells are visited row-major (wrapping every ``cols``). A cell is accepted when
	its box keeps at least ``gap`` clearance from all boxes in ``existing``.
	Deterministic. Raises ``RuntimeError`` if no free cell is found within the
	safety bound.
	"""
	for k in range(_MAX_CELLS):
		box = _cell_box(k, width, height, cols, gap, origin)
		if all(not boxes_overlap(box, e, gap) for e in existing):
			return (box[0], box[1])
	raise RuntimeError("first_free_cell: no free grid cell within safety bound")
