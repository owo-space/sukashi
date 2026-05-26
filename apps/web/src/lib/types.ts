export interface UserInfo {
  id: number;
  email: string;
  is_admin: boolean | number;
  balance: number;
  commission_balance: number;
  transfer_enable: number | null;
  u: number;
  d: number;
  plan_id: number | null;
  plan?: Plan | null;
  expired_at: number | null;
  uuid: string;
  token: string;
  subscribe_url?: string;
  remind_expire?: boolean | number;
  remind_traffic?: boolean | number;
}

export interface Plan {
  id: number;
  group_id?: number | null;
  name: string;
  content?: string;
  transfer_enable: number; // GiB
  show?: boolean | number;
  sort?: number | null;
  renew?: boolean | number;
  reset_price?: number | null;
  reset_traffic_method?: number | null;
  month_price?: number | null;
  quarter_price?: number | null;
  half_year_price?: number | null;
  year_price?: number | null;
  two_year_price?: number | null;
  three_year_price?: number | null;
  onetime_price?: number | null;
  capacity_limit?: number | null;
  device_limit?: number | null;
  speed_limit?: number | null;
}

export interface Order {
  id: number;
  trade_no: string;
  user_id: number;
  plan_id: number;
  period: string;
  total_amount: number;
  status: number;
  type: number;
  created_at: number;
  updated_at: number;
  plan?: Plan;
}

export interface Ticket {
  id: number;
  user_id: number;
  subject: string;
  level: number;
  status: number;
  last_reply_user_id?: number;
  reply_status?: number;
  created_at: number;
  updated_at: number;
}

export interface KnowledgeItem {
  id: number;
  language?: string;
  category?: string;
  title: string;
  body?: string;
  sort?: number | null;
  show?: boolean | number;
  created_at: number;
  updated_at: number;
}

export interface NoticeItem {
  id: number;
  title: string;
  content: string;
  show?: boolean | number;
  img_url?: string | null;
  tags?: string[] | null;
  created_at: number;
  updated_at: number;
}

export interface ServerNode {
  id: number;
  name: string;
  type: string;
  is_online?: boolean | number;
  cache_key?: string;
  last_check_at?: number | null;
  rate?: string | number;
  tags?: string[] | null;
}

export interface InviteStat {
  commission_balance?: number;
  commission_rate?: number;
  commission_balance_pending?: number;
  commission_balance_total?: number;
  invite_user_count?: number;
}

export interface InviteCode {
  id: number;
  code: string;
  status: number;
  created_at: number;
}
