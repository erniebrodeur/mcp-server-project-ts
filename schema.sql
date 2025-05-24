-- SQLite schema for MCP server index
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS modules (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL,
  summary TEXT
);
CREATE TABLE IF NOT EXISTS exports (
  id INTEGER PRIMARY KEY,
  module_id INTEGER,
  name TEXT,
  kind TEXT,
  summary TEXT,
  FOREIGN KEY(module_id) REFERENCES modules(id)
);
CREATE TABLE IF NOT EXISTS deps (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT,
  homepage TEXT,
  repository TEXT,
  docs TEXT
);