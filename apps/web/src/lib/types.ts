// V2Board API shapes mirrored on the client. Keep field names snake_case
// because the legacy API still emits PHP-style identifiers.

export interface UserInfo {
  id: number;
  email: string;
  invite_user_id: number | null;
  telegram_id: number | null;
  balance: number;
  commission_balance: number;
  commission_type: number;
  commission_rate: number | null;
  discount: number | null;
  t: number;
  u: number | string;
  d: number | string;
  total_used: number | string;
  transfer_enable: number | string;
  device_limit: number | null;
  banned: number;
  is_admin: number;
  is_staff: number;
  last_login_at: number | null;
  last_login_ip: string | null;
  uuid: string;
  group_id: number | null;
  plan_id: number | null;
  plan_name: string | null;
  speed_limit: number | null;
  auto_renewal: number;
  remind_expire: number;
  remind_traffic: number;
  token: string;
  subscribe_url: string;
  expired_at: number | null;
  remarks: string | null;
  created_at: number;
  updated_at: number;
  alive_ip: number;
  avatar_url?: string;
  plan?: Plan;
}

export interface Plan {
  id: number;
  group_id: number | null;
  transfer_enable: number;
  device_limit: number | null;
  name: string;
  speed_limit: number | null;
  show: number;
  sort: number | null;
  renew: number;
  content: string | null;
  month_price: number | null;
  quarter_price: number | null;
  half_year_price: number | null;
  year_price: number | null;
  two_year_price: number | null;
  three_year_price: number | null;
  onetime_price: number | null;
  reset_price: number | null;
  reset_traffic_method: number | null;
  capacity_limit: number | null;
  created_at: number | null;
  updated_at: number | null;
  count?: number;
}

export interface Order {
  id: number;
  invite_user_id: number | null;
  user_id: number;
  plan_id: number;
  coupon_id: number | null;
  payment_id: number | null;
  type: number;
  period: string;
  trade_no: string;
  callback_no: string | null;
  total_amount: number;
  handling_amount: number | null;
  discount_amount: number | null;
  surplus_amount: number | null;
  refund_amount: number | null;
  balance_amount: number | null;
  surplus_order_ids: string | null;
  status: number;
  commission_status: number;
  commission_balance: number;
  actual_commission_balance: number | null;
  paid_at: number | null;
  created_at: number;
  updated_at: number;
  plan?: Plan;
}

export interface PaymentMethod {
  id: number;
  name: string;
  payment: string;
  icon: string | null;
}

export interface InviteCode {
  id: number;
  user_id: number;
  code: string;
  status: number;
  pv: number;
  created_at: number;
  updated_at: number;
}

export interface InviteStat {
  codes: InviteCode[];
  stat: number[]; // [activeCodes, invitedUsers, commissionCount, commissionTotal]
}

export interface CommissionLog {
  id: number;
  invite_user_id: number;
  user_id: number;
  trade_no: string;
  order_amount: number;
  get_amount: number;
  created_at: number;
  updated_at: number;
}

export interface Ticket {
  id: number;
  user_id: number;
  subject: string;
  level: number;
  status: number;
  reply_status: number;
  created_at: number;
  updated_at: number;
  message?: TicketMessage[];
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id: number;
  message: string;
  created_at: number;
  updated_at: number;
  is_me?: boolean;
}

export interface KnowledgeItem {
  id: number;
  language: string;
  category: string;
  title: string;
  body: string;
  sort: number | null;
  show: boolean;
  created_at: number;
  updated_at: number;
}

export interface Notice {
  id: number;
  title: string;
  content: string;
  show: boolean;
  img_url: string | null;
  tags: string | null;
  created_at: number;
  updated_at: number;
}

export interface TrafficLogRow {
  record_at: number;
  u: number | string;
  d: number | string;
  user_id?: number;
  server_rate: number | string;
}

export interface ServerNode {
  id: number;
  type: string; // protocol family
  protocol: string;
  name: string;
  host: string;
  port: string;
  server_port: number;
  rate: number | string;
  show: number;
  sort: number | null;
  tls: number;
  network: string;
  group_id: string[];
  route_id: string[];
  parent_id: number | null;
  tags: string[];
  cipher: string | null;
  server_key: string | null;
  flow: string | null;
  up_mbps: number;
  down_mbps: number;
  obfs: string | null;
  obfs_password: string | null;
  available_status: number;
  is_online: number;
  last_check_at: number | null;
  last_push_at: number | null;
  online: number;
  install_command?: string;
  mieru_settings?: unknown;
  insecure?: number | boolean;
  server_name?: string | null;
  tls_settings?: unknown;
  network_settings?: unknown;
  encryption?: string | null;
  encryption_settings?: unknown;
  disable_sni?: number;
  udp_relay_mode?: string | null;
  zero_rtt_handshake?: number;
  congestion_control?: string | null;
  padding_scheme?: string | null;
  listen_ip?: string;
  created_at?: number | null;
  updated_at?: number | null;
}

export interface ServerGroup {
  id: number;
  name: string;
  user_count?: number;
  plan_count?: number;
  server_count?: number;
  created_at: number;
  updated_at: number;
}

export interface ServerRoute {
  id: number;
  remarks: string;
  match: unknown;
  action: string;
  action_value: unknown;
  created_at: number;
  updated_at: number;
}

export interface PaymentRow {
  id: number;
  uuid: string;
  payment: string;
  name: string;
  icon: string | null;
  config: Record<string, unknown>;
  notify_domain: string | null;
  handling_fee_fixed: number | null;
  handling_fee_percent: string | null;
  enable: boolean;
  sort: number | null;
  created_at: number;
  updated_at: number;
}

export interface Coupon {
  id: number;
  code: string;
  name: string;
  type: number;
  value: number;
  show: boolean;
  limit_use: number | null;
  limit_use_with_user: number | null;
  limit_plan_ids: string | null;
  limit_period: string | null;
  started_at: number;
  ended_at: number;
  created_at: number;
  updated_at: number;
}

export interface Giftcard {
  id: number;
  code: string;
  name: string;
  type: number;
  value: number | null;
  plan_id: number | null;
  limit_use: number | null;
  used_user_ids: string | null;
  started_at: number;
  ended_at: number;
  created_at: number;
  updated_at: number;
}

export interface StatOverview {
  online_user: number;
  month_income: number;
  month_register_total: number;
  day_register_total: number;
  ticket_pending_total: number;
  commission_pending_total: number;
  day_income: number;
  last_month_income: number;
  commission_month_payout: number;
  commission_last_month_payout: number;
}

export interface StatOrderPoint {
  type: string;
  date: string;
  value: number;
}

export interface RankRow {
  server_id?: number;
  server_type?: string;
  server_name?: string;
  user_id?: number;
  email?: string;
  total: number;
}

export interface SystemStatus {
  schedule: number;
  horizon: number;
  memory_used: number;
  memory_total: number;
  uptime: number;
}

export interface ConfigTree {
  ticket?: Record<string, unknown>;
  deposit?: Record<string, unknown>;
  invite?: Record<string, unknown>;
  site?: Record<string, unknown>;
  subscribe?: Record<string, unknown>;
  frontend?: Record<string, unknown>;
  server?: Record<string, unknown>;
  email?: Record<string, unknown>;
  telegram?: Record<string, unknown>;
  app?: Record<string, unknown>;
  safe?: Record<string, unknown>;
}

export interface GuestConfig {
  tos_url: string;
  is_email_verify: number;
  is_invite_force: number;
  email_whitelist_suffix: number | string[];
  is_recaptcha: number;
  recaptcha_site_key: string;
  app_description: string;
  app_url: string;
  logo: string;
}

export interface UserCommConfig {
  is_telegram: number;
  telegram_discuss_link: string;
  stripe_pk: string | null;
  withdraw_methods: string[];
  withdraw_close: number;
  currency: string;
  currency_symbol: string;
  commission_distribution_enable: number;
  commission_distribution_l1: number;
  commission_distribution_l2: number;
  commission_distribution_l3: number;
}
