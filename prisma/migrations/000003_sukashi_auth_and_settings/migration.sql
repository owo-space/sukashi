-- Persistent settings (replaces PHP config/v2board.php file storage).
CREATE TABLE "v2_settings" (
    "key" VARCHAR(64) NOT NULL,
    "value" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_settings_pkey" PRIMARY KEY ("key")
);

-- Persistent user sessions (replaces in-memory Map in auth.service.ts).
CREATE TABLE "v2_user_session" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "auth_data" TEXT NOT NULL,
    "ip" VARCHAR(128),
    "user_agent" TEXT,
    "created_at" INTEGER NOT NULL,
    "last_used_at" INTEGER NOT NULL,

    CONSTRAINT "v2_user_session_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "v2_user_session_user_id_idx" ON "v2_user_session"("user_id");

-- Per-user alive IPs reported by nodes (replaces Redis ALIVE_IP_USER_*).
CREATE TABLE "v2_user_alive_ip" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "node_type" VARCHAR(32) NOT NULL,
    "node_id" INTEGER NOT NULL,
    "ip" VARCHAR(128) NOT NULL,
    "recorded_at" INTEGER NOT NULL,

    CONSTRAINT "v2_user_alive_ip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uniq_user_alive_node_ip" ON "v2_user_alive_ip"("user_id", "node_type", "node_id", "ip");
CREATE INDEX "v2_user_alive_ip_user_id_idx" ON "v2_user_alive_ip"("user_id");
CREATE INDEX "v2_user_alive_ip_recorded_at_idx" ON "v2_user_alive_ip"("recorded_at");

-- Align expired_at with PHP semantics: NULL = permanent, > now = active.
-- Previously defaulted to 0 which PHP would interpret as "expired at epoch".
ALTER TABLE "v2_user" ALTER COLUMN "expired_at" DROP DEFAULT;
UPDATE "v2_user" SET "expired_at" = NULL WHERE "expired_at" = 0;

-- ServerNode gains insecure + serverName so the unified protocol bag carries
-- the same TLS knobs the per-protocol controllers used to expose.
ALTER TABLE "v2_server_v2node"
  ADD COLUMN IF NOT EXISTS "insecure" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "server_name" VARCHAR(128);
