MATCH (f:Feature {id: $featureId})
OPTIONAL MATCH (f)-[*1..3]->(n)
RETURN f, n;
