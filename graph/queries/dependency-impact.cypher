MATCH (s:Symbol {id: $symbolId})
OPTIONAL MATCH path=(caller)-[:CALLS|IMPORTS|REFERENCES*1..5]->(s)
RETURN path;
