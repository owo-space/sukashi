-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "NodeProtocol" AS ENUM ('shadowsocks', 'vless', 'hysteria2', 'tuic', 'anytls');

-- CreateTable
CREATE TABLE "failed_jobs" (
    "id" BIGSERIAL NOT NULL,
    "connection" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "exception" TEXT NOT NULL,
    "failed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failed_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_commission_log" (
    "id" SERIAL NOT NULL,
    "invite_user_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "trade_no" VARCHAR(36) NOT NULL,
    "order_amount" INTEGER NOT NULL,
    "get_amount" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_commission_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_coupon" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "show" BOOLEAN NOT NULL DEFAULT false,
    "limit_use" INTEGER,
    "limit_use_with_user" INTEGER,
    "limit_plan_ids" TEXT,
    "limit_period" TEXT,
    "started_at" INTEGER NOT NULL,
    "ended_at" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_giftcard" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "value" INTEGER,
    "plan_id" INTEGER,
    "limit_use" INTEGER,
    "used_user_ids" VARCHAR(16384),
    "started_at" INTEGER NOT NULL,
    "ended_at" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_giftcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_invite_code" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "pv" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_invite_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_knowledge" (
    "id" SERIAL NOT NULL,
    "language" VARCHAR(5) NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sort" INTEGER,
    "show" BOOLEAN NOT NULL DEFAULT false,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_log" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "level" VARCHAR(32),
    "host" TEXT,
    "uri" TEXT NOT NULL,
    "method" VARCHAR(16) NOT NULL,
    "data" TEXT,
    "ip" VARCHAR(128),
    "context" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_mail_log" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(128) NOT NULL,
    "subject" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "error" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_mail_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_notice" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "show" BOOLEAN NOT NULL DEFAULT false,
    "img_url" TEXT,
    "tags" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_order" (
    "id" SERIAL NOT NULL,
    "invite_user_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "coupon_id" INTEGER,
    "payment_id" INTEGER,
    "type" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "trade_no" VARCHAR(36) NOT NULL,
    "callback_no" TEXT,
    "total_amount" INTEGER NOT NULL,
    "handling_amount" INTEGER,
    "discount_amount" INTEGER,
    "surplus_amount" INTEGER,
    "refund_amount" INTEGER,
    "balance_amount" INTEGER,
    "surplus_order_ids" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "commission_status" INTEGER NOT NULL DEFAULT 0,
    "commission_balance" INTEGER NOT NULL DEFAULT 0,
    "actual_commission_balance" INTEGER,
    "paid_at" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_payment" (
    "id" SERIAL NOT NULL,
    "uuid" VARCHAR(32) NOT NULL,
    "payment" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "config" JSONB NOT NULL,
    "notify_domain" VARCHAR(128),
    "handling_fee_fixed" INTEGER,
    "handling_fee_percent" DECIMAL(5,2),
    "enable" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_plan" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "transfer_enable" INTEGER NOT NULL,
    "device_limit" INTEGER,
    "name" TEXT NOT NULL,
    "speed_limit" INTEGER,
    "show" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER,
    "renew" BOOLEAN NOT NULL DEFAULT true,
    "content" TEXT,
    "month_price" INTEGER,
    "quarter_price" INTEGER,
    "half_year_price" INTEGER,
    "year_price" INTEGER,
    "two_year_price" INTEGER,
    "three_year_price" INTEGER,
    "onetime_price" INTEGER,
    "reset_price" INTEGER,
    "reset_traffic_method" INTEGER,
    "capacity_limit" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_server_group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_server_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_server_route" (
    "id" SERIAL NOT NULL,
    "remarks" TEXT NOT NULL,
    "match" JSONB NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "action_value" JSONB,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_server_route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_server_shadowsocks" (
    "id" SERIAL NOT NULL,
    "group_id" TEXT NOT NULL,
    "route_id" TEXT,
    "parent_id" INTEGER,
    "tags" TEXT,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "host" TEXT NOT NULL,
    "port" VARCHAR(64) NOT NULL,
    "server_port" INTEGER NOT NULL,
    "cipher" TEXT NOT NULL,
    "obfs" VARCHAR(64),
    "obfs_settings" TEXT,
    "show" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_server_shadowsocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_server_vless" (
    "id" SERIAL NOT NULL,
    "group_id" TEXT NOT NULL,
    "route_id" TEXT,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "server_port" INTEGER NOT NULL,
    "tls" INTEGER NOT NULL,
    "tls_settings" JSONB,
    "flow" VARCHAR(64),
    "network" VARCHAR(32) NOT NULL,
    "network_settings" JSONB,
    "encryption" VARCHAR(64),
    "encryption_settings" JSONB,
    "tags" TEXT,
    "rate" DECIMAL(10,2) NOT NULL,
    "show" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_server_vless_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_server_hysteria" (
    "id" SERIAL NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 2,
    "group_id" TEXT NOT NULL,
    "route_id" TEXT,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "host" TEXT NOT NULL,
    "port" VARCHAR(64) NOT NULL,
    "server_port" INTEGER NOT NULL,
    "tags" TEXT,
    "rate" DECIMAL(10,2) NOT NULL,
    "show" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER,
    "up_mbps" INTEGER NOT NULL,
    "down_mbps" INTEGER NOT NULL,
    "obfs" VARCHAR(64),
    "obfs_password" TEXT,
    "server_name" VARCHAR(64),
    "insecure" BOOLEAN NOT NULL DEFAULT false,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_server_hysteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_server_tuic" (
    "id" SERIAL NOT NULL,
    "group_id" TEXT NOT NULL,
    "route_id" TEXT,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "host" TEXT NOT NULL,
    "port" VARCHAR(64) NOT NULL,
    "server_port" INTEGER NOT NULL,
    "tags" TEXT,
    "rate" DECIMAL(10,2) NOT NULL,
    "show" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER,
    "server_name" VARCHAR(64),
    "insecure" BOOLEAN NOT NULL DEFAULT false,
    "disable_sni" BOOLEAN NOT NULL DEFAULT false,
    "udp_relay_mode" VARCHAR(64),
    "zero_rtt_handshake" BOOLEAN NOT NULL DEFAULT false,
    "congestion_control" VARCHAR(64),
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_server_tuic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_server_anytls" (
    "id" SERIAL NOT NULL,
    "group_id" TEXT NOT NULL,
    "route_id" TEXT,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "host" TEXT NOT NULL,
    "port" VARCHAR(64) NOT NULL,
    "server_port" INTEGER NOT NULL,
    "tags" TEXT,
    "rate" DECIMAL(10,2) NOT NULL,
    "show" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER,
    "server_name" VARCHAR(64),
    "insecure" BOOLEAN NOT NULL DEFAULT false,
    "padding_scheme" JSONB,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_server_anytls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_server_v2node" (
    "id" SERIAL NOT NULL,
    "group_id" TEXT NOT NULL,
    "route_id" TEXT,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "host" TEXT NOT NULL,
    "listen_ip" TEXT NOT NULL DEFAULT '0.0.0.0',
    "port" VARCHAR(64) NOT NULL,
    "server_port" INTEGER NOT NULL,
    "tags" TEXT,
    "rate" DECIMAL(10,2) NOT NULL,
    "show" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER,
    "protocol" "NodeProtocol" NOT NULL,
    "tls" INTEGER NOT NULL,
    "tls_settings" JSONB,
    "flow" VARCHAR(64),
    "network" VARCHAR(32) NOT NULL,
    "network_settings" JSONB,
    "encryption" VARCHAR(64),
    "encryption_settings" JSONB,
    "disable_sni" BOOLEAN NOT NULL DEFAULT false,
    "udp_relay_mode" VARCHAR(64),
    "zero_rtt_handshake" BOOLEAN NOT NULL DEFAULT false,
    "congestion_control" VARCHAR(64),
    "cipher" VARCHAR(64),
    "up_mbps" INTEGER NOT NULL,
    "down_mbps" INTEGER NOT NULL,
    "obfs" VARCHAR(64),
    "obfs_password" TEXT,
    "padding_scheme" JSONB,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_server_v2node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_stat" (
    "id" SERIAL NOT NULL,
    "record_at" INTEGER NOT NULL,
    "record_type" VARCHAR(1) NOT NULL,
    "order_count" INTEGER NOT NULL,
    "order_total" INTEGER NOT NULL,
    "commission_count" INTEGER NOT NULL,
    "commission_total" INTEGER NOT NULL,
    "paid_count" INTEGER NOT NULL,
    "paid_total" INTEGER NOT NULL,
    "register_count" INTEGER NOT NULL,
    "invite_count" INTEGER NOT NULL,
    "transfer_used_total" VARCHAR(32) NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_stat_server" (
    "id" SERIAL NOT NULL,
    "server_id" INTEGER NOT NULL,
    "server_type" VARCHAR(32) NOT NULL,
    "u" BIGINT NOT NULL,
    "d" BIGINT NOT NULL,
    "record_type" VARCHAR(1) NOT NULL,
    "record_at" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_stat_server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_stat_user" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "server_rate" DECIMAL(10,2) NOT NULL,
    "u" BIGINT NOT NULL,
    "d" BIGINT NOT NULL,
    "record_type" VARCHAR(2) NOT NULL,
    "record_at" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_stat_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_ticket" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "reply_status" INTEGER NOT NULL DEFAULT 0,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_ticket_message" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_ticket_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_user" (
    "id" SERIAL NOT NULL,
    "invite_user_id" INTEGER,
    "telegram_id" BIGINT,
    "email" VARCHAR(128) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "password_algo" VARCHAR(32),
    "password_salt" VARCHAR(32),
    "balance" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER,
    "commission_type" INTEGER NOT NULL DEFAULT 0,
    "commission_rate" INTEGER,
    "commission_balance" INTEGER NOT NULL DEFAULT 0,
    "t" INTEGER NOT NULL DEFAULT 0,
    "u" BIGINT NOT NULL DEFAULT 0,
    "d" BIGINT NOT NULL DEFAULT 0,
    "transfer_enable" BIGINT NOT NULL DEFAULT 0,
    "device_limit" INTEGER,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" INTEGER,
    "is_staff" BOOLEAN NOT NULL DEFAULT false,
    "last_login_ip" VARCHAR(128),
    "uuid" VARCHAR(36) NOT NULL,
    "group_id" INTEGER,
    "plan_id" INTEGER,
    "speed_limit" INTEGER,
    "auto_renewal" BOOLEAN NOT NULL DEFAULT false,
    "remind_expire" BOOLEAN NOT NULL DEFAULT true,
    "remind_traffic" BOOLEAN NOT NULL DEFAULT true,
    "token" VARCHAR(64) NOT NULL,
    "expired_at" BIGINT DEFAULT 0,
    "remarks" TEXT,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,

    CONSTRAINT "v2_user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "v2_order_trade_no_key" ON "v2_order"("trade_no");

-- CreateIndex
CREATE INDEX "idx_order_user" ON "v2_order"("user_id");

-- CreateIndex
CREATE INDEX "idx_order_user_status" ON "v2_order"("user_id", "status");

-- CreateIndex
CREATE INDEX "v2_server_v2node_protocol_show_sort_idx" ON "v2_server_v2node"("protocol", "show", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "v2_stat_record_at_key" ON "v2_stat"("record_at");

-- CreateIndex
CREATE INDEX "v2_stat_server_record_at_idx" ON "v2_stat_server"("record_at");

-- CreateIndex
CREATE INDEX "v2_stat_server_server_id_idx" ON "v2_stat_server"("server_id");

-- CreateIndex
CREATE UNIQUE INDEX "server_id_server_type_record_at" ON "v2_stat_server"("server_id", "server_type", "record_at");

-- CreateIndex
CREATE INDEX "v2_stat_user_user_id_idx" ON "v2_stat_user"("user_id");

-- CreateIndex
CREATE INDEX "v2_stat_user_record_at_idx" ON "v2_stat_user"("record_at");

-- CreateIndex
CREATE INDEX "v2_stat_user_server_rate_idx" ON "v2_stat_user"("server_rate");

-- CreateIndex
CREATE UNIQUE INDEX "server_rate_user_id_record_at" ON "v2_stat_user"("server_rate", "user_id", "record_at");

-- CreateIndex
CREATE UNIQUE INDEX "v2_user_email_key" ON "v2_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "v2_user_uuid_key" ON "v2_user"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "v2_user_token_key" ON "v2_user"("token");
