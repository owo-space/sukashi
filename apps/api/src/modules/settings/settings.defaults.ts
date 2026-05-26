export const EMAIL_WHITELIST_DEFAULT = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "qq.com",
  "163.com",
  "126.com",
  "foxmail.com",
  "yahoo.com",
  "icloud.com",
  "live.com",
  "msn.com"
];

export const WITHDRAW_METHOD_DEFAULT = ["USDT", "Alipay", "WeChat"];

/**
 * Default values for every setting key. Matches V2Board's ConfigController.fetch
 * shape so the admin UI never sees an undefined key.
 */
export const SETTING_DEFAULTS: Record<string, unknown> = {
  // ticket
  ticket_status: 0,
  // deposit
  deposit_bounus: [],
  // invite & commission
  invite_force: 0,
  invite_commission: 10,
  invite_gen_limit: 5,
  invite_never_expire: 0,
  commission_first_time_enable: 1,
  commission_auto_check_enable: 1,
  commission_withdraw_limit: 100,
  commission_withdraw_method: WITHDRAW_METHOD_DEFAULT,
  withdraw_close_enable: 0,
  commission_distribution_enable: 0,
  commission_distribution_l1: null,
  commission_distribution_l2: null,
  commission_distribution_l3: null,
  // site
  logo: null,
  force_https: 0,
  stop_register: 0,
  app_name: "透かし",
  app_description: "自由への道",
  app_url: null,
  subscribe_url: null,
  subscribe_path: null,
  try_out_plan_id: 0,
  try_out_hour: 1,
  tos_url: null,
  currency: "CNY",
  currency_symbol: "¥",
  // subscribe
  plan_change_enable: 1,
  reset_traffic_method: 0,
  surplus_enable: 1,
  allow_new_period: 0,
  new_order_event_id: 0,
  renew_order_event_id: 0,
  change_order_event_id: 0,
  show_info_to_server_enable: 0,
  show_subscribe_method: 0,
  show_subscribe_expire: 5,
  // frontend (user-facing panel)
  frontend_theme: "default",
  frontend_theme_sidebar: "light",
  frontend_theme_header: "dark",
  frontend_theme_color: "default",
  frontend_background_url: null,
  // admin panel theme (separate from user-facing)
  admin_theme_sidebar: "light",
  admin_theme_header: "light",
  admin_theme_color: "default",
  // server
  server_api_url: null,
  server_token: null,
  server_pull_interval: 60,
  server_push_interval: 60,
  server_node_report_min_traffic: 0,
  server_device_online_min_traffic: 0,
  device_limit_mode: 0,
  // email
  email_template: "default",
  email_host: null,
  email_port: null,
  email_username: null,
  email_password: null,
  email_encryption: null,
  email_from_address: null,
  // telegram
  telegram_bot_enable: 0,
  telegram_bot_token: null,
  telegram_discuss_link: null,
  // app
  windows_version: null,
  windows_download_url: null,
  macos_version: null,
  macos_download_url: null,
  android_version: null,
  android_download_url: null,
  // safe
  email_verify: 0,
  safe_mode_enable: 0,
  secure_path: null,
  email_whitelist_enable: 0,
  email_whitelist_suffix: EMAIL_WHITELIST_DEFAULT,
  email_gmail_limit_enable: 0,
  recaptcha_enable: 0,
  recaptcha_key: null,
  recaptcha_site_key: null,
  register_limit_by_ip_enable: 0,
  register_limit_count: 3,
  register_limit_expire: 60,
  password_limit_enable: 1,
  password_limit_count: 5,
  password_limit_expire: 60
};

/**
 * Setting keys grouped exactly as V2Board's admin config UI expects, so
 * GET /config/fetch returns the legacy shape.
 */
export const SETTING_GROUPS: Record<string, string[]> = {
  ticket: ["ticket_status"],
  deposit: ["deposit_bounus"],
  invite: [
    "invite_force",
    "invite_commission",
    "invite_gen_limit",
    "invite_never_expire",
    "commission_first_time_enable",
    "commission_auto_check_enable",
    "commission_withdraw_limit",
    "commission_withdraw_method",
    "withdraw_close_enable",
    "commission_distribution_enable",
    "commission_distribution_l1",
    "commission_distribution_l2",
    "commission_distribution_l3"
  ],
  site: [
    "logo",
    "force_https",
    "stop_register",
    "app_name",
    "app_description",
    "app_url",
    "subscribe_url",
    "subscribe_path",
    "try_out_plan_id",
    "try_out_hour",
    "tos_url",
    "currency",
    "currency_symbol"
  ],
  subscribe: [
    "plan_change_enable",
    "reset_traffic_method",
    "surplus_enable",
    "allow_new_period",
    "new_order_event_id",
    "renew_order_event_id",
    "change_order_event_id",
    "show_info_to_server_enable",
    "show_subscribe_method",
    "show_subscribe_expire"
  ],
  frontend: [
    "frontend_theme",
    "frontend_theme_sidebar",
    "frontend_theme_header",
    "frontend_theme_color",
    "frontend_background_url"
  ],
  admin: ["admin_theme_sidebar", "admin_theme_header", "admin_theme_color"],
  server: [
    "server_api_url",
    "server_token",
    "server_pull_interval",
    "server_push_interval",
    "server_node_report_min_traffic",
    "server_device_online_min_traffic",
    "device_limit_mode"
  ],
  email: [
    "email_template",
    "email_host",
    "email_port",
    "email_username",
    "email_password",
    "email_encryption",
    "email_from_address"
  ],
  telegram: ["telegram_bot_enable", "telegram_bot_token", "telegram_discuss_link"],
  app: [
    "windows_version",
    "windows_download_url",
    "macos_version",
    "macos_download_url",
    "android_version",
    "android_download_url"
  ],
  safe: [
    "email_verify",
    "safe_mode_enable",
    "secure_path",
    "email_whitelist_enable",
    "email_whitelist_suffix",
    "email_gmail_limit_enable",
    "recaptcha_enable",
    "recaptcha_key",
    "recaptcha_site_key",
    "register_limit_by_ip_enable",
    "register_limit_count",
    "register_limit_expire",
    "password_limit_enable",
    "password_limit_count",
    "password_limit_expire"
  ]
};

/**
 * Environment variables that seed defaults when the DB doesn't have a value.
 * Matches the PANEL_* names already documented in the project.
 */
export const SETTING_ENV_OVERRIDES: Record<string, string> = {
  app_name: "PANEL_TITLE",
  app_description: "PANEL_DESCRIPTION",
  app_url: "PANEL_APP_URL",
  logo: "PANEL_LOGO",
  tos_url: "PANEL_TOS_URL",
  secure_path: "PANEL_ADMIN_PATH",
  email_host: "MAIL_HOST",
  email_port: "MAIL_PORT",
  email_username: "MAIL_USERNAME",
  email_password: "MAIL_PASSWORD",
  email_encryption: "MAIL_ENCRYPTION",
  email_from_address: "MAIL_FROM_ADDRESS",
  telegram_bot_token: "TELEGRAM_BOT_TOKEN",
  telegram_bot_enable: "PANEL_TELEGRAM_BOT_ENABLE",
  telegram_discuss_link: "PANEL_TELEGRAM_DISCUSS_LINK",
  server_token: "PANEL_SERVER_TOKEN",
  server_api_url: "PANEL_SERVER_API_URL",
  recaptcha_enable: "PANEL_RECAPTCHA_ENABLE",
  recaptcha_site_key: "PANEL_RECAPTCHA_SITE_KEY",
  recaptcha_key: "PANEL_RECAPTCHA_SECRET_KEY",
  email_verify: "PANEL_EMAIL_VERIFY",
  invite_force: "PANEL_INVITE_FORCE",
  stop_register: "PANEL_STOP_REGISTER",
  allow_new_period: "PANEL_ALLOW_NEW_PERIOD",
  currency: "PANEL_CURRENCY",
  currency_symbol: "PANEL_CURRENCY_SYMBOL",
  windows_version: "PANEL_WINDOWS_VERSION",
  windows_download_url: "PANEL_WINDOWS_DOWNLOAD_URL",
  macos_version: "PANEL_MACOS_VERSION",
  macos_download_url: "PANEL_MACOS_DOWNLOAD_URL",
  android_version: "PANEL_ANDROID_VERSION",
  android_download_url: "PANEL_ANDROID_DOWNLOAD_URL",
  withdraw_close_enable: "PANEL_WITHDRAW_CLOSE_ENABLE",
  commission_distribution_enable: "PANEL_COMMISSION_DISTRIBUTION_ENABLE",
  commission_distribution_l1: "PANEL_COMMISSION_DISTRIBUTION_L1",
  commission_distribution_l2: "PANEL_COMMISSION_DISTRIBUTION_L2",
  commission_distribution_l3: "PANEL_COMMISSION_DISTRIBUTION_L3"
};
