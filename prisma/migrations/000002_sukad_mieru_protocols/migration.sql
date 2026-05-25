-- SukaD uses v2node as the only node backend. The protocol column stores
-- SukaD's internal protocol type.
ALTER TYPE "NodeProtocol" ADD VALUE IF NOT EXISTS 'vmess';
ALTER TYPE "NodeProtocol" ADD VALUE IF NOT EXISTS 'trojan';
ALTER TYPE "NodeProtocol" ADD VALUE IF NOT EXISTS 'mieru';

ALTER TABLE "v2_server_v2node"
  ADD COLUMN IF NOT EXISTS "server_key" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "mieru_settings" JSONB;
