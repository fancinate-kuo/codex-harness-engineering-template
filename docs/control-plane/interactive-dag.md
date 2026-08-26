# Interactive DAG Graph

v16 replaces the simple card flow with an SVG-based interactive graph.

Features:
- node positioning by dependency depth
- pan
- zoom
- node selection
- status styling
- dependency edges
- node metadata panel
- live refresh from SSE

The renderer is intentionally dependency-light and can later be replaced by
Vue Flow, Cytoscape, or a custom Canvas renderer without changing task APIs.
