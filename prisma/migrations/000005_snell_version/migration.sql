-- Add per-node Snell protocol version (3 / 4 / 5; null falls back to 4).
ALTER TABLE "v2_server_v2node"
  ADD COLUMN IF NOT EXISTS "snell_version" INTEGER;
