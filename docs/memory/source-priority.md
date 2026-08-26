# Source Priority

When sources conflict:

1. Current executable tests / code behavior
2. Current ADR / authoritative architecture documentation
3. Authoritative memory
4. High-confidence memory
5. Medium-confidence memory
6. Low-confidence memory

A conflict should cause memory to be marked `disputed` or `superseded`,
not silently overwrite authoritative sources.
