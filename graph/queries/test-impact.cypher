MATCH (n {id: $targetId})
OPTIONAL MATCH (t:Test)-[:COVERS]->(n)
RETURN t;
