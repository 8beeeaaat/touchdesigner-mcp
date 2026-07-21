"""
utils package initialization

Marks `modules/utils` as a regular package so it is not treated as an implicit
namespace package that a same-named package on sys.path could shadow.
Submodules are imported on demand (e.g. `from utils.logging import ...`).
"""
