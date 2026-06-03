import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

export type Locale = "en" | "zh-CN" | "zh-TW" | "ja";

export const LOCALES: Array<{
  code: Locale;
  label: string;
  shortLabel: string;
}> = [
  { code: "zh-CN", label: "简体中文", shortLabel: "简" },
  { code: "zh-TW", label: "繁體中文", shortLabel: "繁" },
  { code: "ja", label: "日本語", shortLabel: "日" },
  { code: "en", label: "English", shortLabel: "EN" }
];

const STORAGE_KEY = "sukashi.locale";
// For each translated text node / attribute we remember both the source
// (the canonical zh-CN string we translate from) and the last output we
// actually wrote into the DOM. That lets the MutationObserver tell apart
// (a) "we are seeing our own previous output, switch source through" from
// (b) "React wrote new content into this node, adopt it as the new source".
const TEXT_STATE = new WeakMap<Text, { source: string; output: string }>();
const ATTR_STATE = new WeakMap<Element, Map<string, { source: string; output: string }>>();
const ATTRS = ["placeholder", "title", "aria-label"] as const;
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "CODE",
  "PRE",
  "TEXTAREA",
  "NOSCRIPT",
  "SVG",
  "CANVAS"
]);

const EN: Record<string, string> = {
  "语言": "Language",
  "簡體中文": "Simplified Chinese",
  "简体中文": "Simplified Chinese",
  "繁體中文": "Traditional Chinese",
  "繁体中文": "Traditional Chinese",
  "菜单": "Menu",
  "设置": "Settings",
  "用户面板": "User Panel",
  "管理面板": "Admin Panel",
  "个人中心": "Profile",
  "退出登录": "Log out",
  "面板": "Panel",
  "仪表盘": "Dashboard",
  "使用文档": "Documentation",
  "订阅": "Subscription",
  "购买订阅": "Buy Subscription",
  "节点状态": "Node Status",
  "财务": "Billing",
  "我的订单": "My Orders",
  "我的邀请": "My Invites",
  "用户": "User",
  "我的工单": "My Tickets",
  "流量明细": "Traffic Details",
  "公告": "Notices",
  "系统配置": "System Settings",
  "支付配置": "Payment Settings",
  "主题配置": "Theme Settings",
  "服务器": "Servers",
  "节点管理": "Nodes",
  "权限组管理": "Permission Groups",
  "路由管理": "Routes",
  "订阅管理": "Subscriptions",
  "订单管理": "Orders",
  "优惠券管理": "Coupons",
  "礼品卡管理": "Gift Cards",
  "用户管理": "Users",
  "公告管理": "Notices",
  "工单管理": "Tickets",
  "知识库管理": "Knowledge Base",
  "系统设置": "System Settings",
  "加载中…": "Loading...",
  "暂无数据": "No data",
  "待实现 — 此页面将按 legacy UI 1:1 复刻。": "Not implemented yet. This page will be recreated to match the legacy UI.",
  "注册": "Register",
  "忘记密码": "Forgot password",
  "返回登入": "Back to sign in",
  "邮箱": "Email",
  "密码": "Password",
  "新密码": "New password",
  "邮箱验证码": "Email verification code",
  "获取验证码": "Get code",
  "发送中…": "Sending...",
  "登录中…": "Signing in...",
  "注册中…": "Registering...",
  "提交中…": "Submitting...",
  "保存中…": "Saving...",
  "取消中…": "Canceling...",
  "跳转中…": "Redirecting...",
  "登入": "Sign in",
  "重置密码": "Reset password",
  "请输入邮箱与密码": "Enter email and password",
  "登录失败": "Sign-in failed",
  "请先填邮箱": "Enter your email first",
  "验证码已发送": "Verification code sent",
  "请填邮箱和密码": "Enter email and password",
  "两次密码不一致": "Passwords do not match",
  "邀请码": "Invite code",
  "邀请码(选填)": "Invite code (optional)",
  "请填齐所有字段": "Fill in all fields",
  "密码已重置": "Password reset",
  "我的订阅": "My Subscription",
  "该订阅长期有效": "This subscription never expires",
  "已用": "Used",
  "总计": "Total",
  "在线设备": "Online devices",
  "当前没有订阅": "No active subscription",
  "立即选购": "Choose a plan",
  "捷径": "Shortcuts",
  "查看教程": "View Guides",
  "学习如何使用 透かし": "Learn how to use Sukashi",
  "一键订阅": "Quick Import",
  "快速将节点导入对应客户端进行使用": "Import nodes into a supported client quickly",
  "续费订阅": "Renew Subscription",
  "对您当前的订阅进行续费": "Renew your current subscription",
  "遇到问题": "Need Help",
  "遇到问题可以通过工单与我们沟通": "Open a ticket if you need help",
  "订阅地址": "Subscription URL",
  "订阅地址已复制": "Subscription URL copied",
  "已复制": "Copied",
  "复制": "Copy",
  "一键导入到客户端 (会唤起对应 App,需先安装):": "Import into a client (opens the app if installed):",
  "选择最适合您的计划": "Choose the plan that fits you best",
  "全部": "All",
  "按周期": "Recurring",
  "按流量": "Traffic",
  "立即订阅": "Subscribe now",
  "月付": "Monthly",
  "季付": "Quarterly",
  "半年付": "Semiannual",
  "年付": "Yearly",
  "两年付": "Two years",
  "三年付": "Three years",
  "一次性": "One-time",
  "重置流量": "Traffic reset",
  "付款周期": "Billing Cycle",
  "有优惠券?": "Have a coupon?",
  "验证": "Verify",
  "输入优惠券代码": "Enter coupon code",
  "优惠券有效": "Coupon is valid",
  "优惠券抵扣": "Coupon discount",
  "订单总额": "Order Summary",
  "下单": "Place order",
  "请先选择购买周期": "Select a billing cycle first",
  "请选择购买周期": "Select a billing cycle",
  "订单创建失败": "Failed to create order",
  "订单已创建": "Order created",
  "订单号": "Order No.",
  "周期": "Cycle",
  "订单金额": "Amount",
  "订单状态": "Status",
  "创建时间": "Created At",
  "操作": "Actions",
  "查看": "View",
  "待支付": "Pending",
  "已支付": "Paid",
  "已取消": "Canceled",
  "已完成": "Completed",
  "已折扣": "Discounted",
  "订单详情": "Order Details",
  "状态": "Status",
  "金额": "Amount",
  "支付": "Payment",
  "暂无可用支付方式": "No payment methods available",
  "立即支付": "Pay now",
  "取消订单": "Cancel order",
  "此订单无需再支付。": "This order does not require payment.",
  "订单已完成": "Order completed",
  "结算失败": "Checkout failed",
  "订单已取消": "Order canceled",
  "订单已支付": "Order paid",
  "日期": "Date",
  "上传": "Upload",
  "下载": "Download",
  "合计": "Total",
  "计算倍率": "Rate",
  "节点": "Node",
  "协议": "Protocol",
  "倍率": "Rate",
  "标签": "Tags",
  "我的钱包(仅消费)": "My Wallet (spending only)",
  "自动续费": "Auto renew",
  "充 值": "Top up",
  "礼品卡": "Gift Card",
  "请输入礼品卡": "Enter gift card",
  "兑 换": "Redeem",
  "修改密码": "Change Password",
  "旧密码": "Old password",
  "请输入旧密码": "Enter old password",
  "请输入新密码": "Enter new password",
  "保 存": "Save",
  "通知": "Notifications",
  "到期邮件提醒": "Expiration email reminder",
  "流量邮件提醒": "Traffic email reminder",
  "重置订阅信息": "Reset Subscription Info",
  "当你的订阅地址或账户发生泄漏被他人滥用时，可以在此重置订阅信息。避免带来不必要的损失。": "Reset subscription info here if your subscription URL or account was leaked and abused.",
  "重 置": "Reset",
  "重置订阅": "Reset Subscription",
  "复制订阅链接": "Copy Subscription URL",
  "订阅链接已复制": "Subscription URL copied",
  "订阅信息已重置": "Subscription info reset",
  "该用户缺少订阅令牌": "This user has no subscription token",
  "复制失败,请手动复制": "Copy failed, please copy manually",
  "暂无可选周期": "No selectable cycle",
  "余额 (CNY 分)": "Balance (CNY cents)",
  "流量重置方式 (0 = 月初, 1 = 购买日, 2 = 不重置)": "Traffic reset (0 = month start, 1 = purchase day, 2 = never)",
  "显示": "Show",
  "生成": "Generate",
  "标题": "Title",
  "更新时间": "Updated At",
  "添加 Stripe": "Add Stripe",
  "设备数": "Devices",
  "— 无 —": "— None —",
  "两次新密码不一致": "New passwords do not match",
  "密码已更新": "Password updated",
  "兑换成功": "Redeemed",
  "邀请码已生成": "Invite code generated",
  "已划转到钱包": "Transferred to wallet",
  "已复制邀请链接": "Invite link copied",
  "当前剩余佣金": "Current commission balance",
  "划 转": "Transfer",
  "推广佣金提现": "Withdraw commission",
  "已注册用户数": "Registered users",
  "佣金比例": "Commission rate",
  "确认中的佣金": "Pending commission",
  "累计获得佣金": "Total commission earned",
  "邀请码管理": "Invite Code Management",
  "生成邀请码": "Generate Invite Code",
  "复制链接": "Copy link",
  "佣金发放记录": "Commission Payout Records",
  "发放时间": "Paid At",
  "佣金": "Commission",
  "工单历史": "Ticket History",
  "新的工单": "New Ticket",
  "主题": "Subject",
  "工单级别": "Priority",
  "工单状态": "Status",
  "最后回复": "Last Reply",
  "低": "Low",
  "中": "Medium",
  "高": "High",
  "已开启": "Open",
  "已关闭": "Closed",
  "新建工单": "New Ticket",
  "级别": "Priority",
  "内容": "Content",
  "提交": "Submit",
  "工单已创建": "Ticket created",
  "关闭工单": "Close ticket",
  "回复内容": "Reply",
  "发送": "Send",
  "搜索文档": "Search docs",
  "其他": "Other",
  "在线人数": "Online Users",
  "今日收入": "Today Revenue",
  "实时注册": "New Signups Today",
  "本月收入": "This Month Revenue",
  "上月收入": "Last Month Revenue",
  "上月佣金支出": "Last Month Commission Payout",
  "本月新增用户": "New Users This Month",
  "今日节点流量排行": "Today's Node Traffic Ranking",
  "昨日节点流量排行": "Yesterday's Node Traffic Ranking",
  "今日用户流量排行": "Today's User Traffic Ranking",
  "昨日用户流量排行": "Yesterday's User Traffic Ranking",
  "流量": "Traffic",
  "保存成功": "Saved",
  "已保存": "Saved",
  "已删除": "Deleted",
  "排序已保存": "Sort order saved",
  "添加订阅": "Add Subscription",
  "排序": "Sort",
  "销售状态": "Sale Status",
  "续费": "Renewal",
  "关闭后,订阅到期不可续费": "When disabled, expired subscriptions cannot be renewed",
  "名称": "Name",
  "统计": "Stats",
  "设备数限制": "Device Limit",
  "编辑": "Edit",
  "删除": "Delete",
  "编辑订阅": "Edit Subscription",
  "新建订阅": "New Subscription",
  "强制更新到用户": "Force update to users",
  "套餐名称": "Plan Name",
  "请输入套餐名称": "Enter plan name",
  "套餐描述": "Plan Description",
  "请输入套餐描述,支持HTML": "Enter plan description, HTML supported",
  "售价设置": "Pricing",
  "重置包": "Reset Package",
  "套餐流量 (GB)": "Plan Traffic (GB)",
  "设备数限制 (留空不限)": "Device Limit (blank for unlimited)",
  "留空则不限制": "Leave blank for unlimited",
  "限速 (Mbps,留空不限)": "Speed Limit (Mbps, blank for unlimited)",
  "权限组": "Permission Group",
  "无权限组": "No permission group",
  "销售设置": "Sale Settings",
  "允许续费": "Allow renewal",
  "对外显示": "Visible",
  "全部状态": "All statuses",
  "查询": "Search",
  "标记已支付": "Mark as paid",
  "无可用操作": "No actions available",
  "输入任意关键字搜索": "Search by keyword",
  "取消": "Cancel",
  "保存排序": "Save order",
  "编辑排序": "Edit order",
  "节点ID": "Node ID",
  "显隐": "Visible",
  "节点名称及在线状态": "Node name and online status",
  "地址": "Address",
  "人数": "Users",
  "当前在线人数": "Current online users",
  "计费倍率,1x 表示按实际流量计费": "Billing rate. 1x means actual traffic is billed",
  "安装脚本": "Install Script",
  "新建": "New",
  "基础信息": "Basic Info",
  "节点名称": "Node Name",
  "例如 AU 1": "e.g. AU 1",
  "地址 (Host)": "Address (Host)",
  "1.2.3.4 或 hostname": "1.2.3.4 or hostname",
  "对外端口": "Public Port",
  "内部端口": "Internal Port",
  "路由规则": "Route Rules",
  "请选择": "Select",
  "不强制": "Not forced",
  "数字越大越靠前": "Higher numbers appear first",
  "协议参数": "Protocol Parameters",
  "加密方式": "Encryption",
  "混淆": "Obfuscation",
  "无": "None",
  "不启用": "Disabled",
  "传输协议": "Transport",
  "传输协议设置 (JSON)": "Transport Settings (JSON)",
  "上行 Mbps": "Upload Mbps",
  "下行 Mbps": "Download Mbps",
  "UDP 中继": "UDP Relay",
  "拥塞控制": "Congestion Control",
  "0-RTT 握手": "0-RTT Handshake",
  "禁用 SNI": "Disable SNI",
  "留空使用默认": "Leave blank to use default",
  "Snell 版本": "Snell Version",
  "常见": "common",
  "最新": "latest",
  "无可选项": "No options",
  "添加权限组": "Add Permission Group",
  "用户数": "Users",
  "节点数": "Nodes",
  "编辑权限组": "Edit Permission Group",
  "新建权限组": "New Permission Group",
  "权限组名称": "Permission Group Name",
  "添加路由": "Add Route",
  "备注": "Remarks",
  "动作": "Action",
  "匹配条目": "Matches",
  "编辑路由": "Edit Route",
  "新建路由": "New Route",
  "拒绝": "Block",
  "解析": "Resolve",
  "直连": "Direct",
  "动作值 (可选)": "Action Value (optional)",
  "可选,例如 8.8.8.8": "Optional, e.g. 8.8.8.8",
  "匹配规则 (一行一条)": "Match Rules (one per line)",
  "Stripe 支付配置": "Stripe Payment Settings",
  "启用": "Enable",
  "货币": "Currency",
  "Stripe 结算用的币种": "Currency used for Stripe settlement",
  "选择货币": "Select currency",
  "选你建的端点": "select the endpoint you created",
  "Webhook 接收地址": "Webhook Endpoint URL",
  "把这个地址填到 Stripe Dashboard": "Enter this URL in Stripe Dashboard",
  "请先保存,生成 uuid 后再复制": "Save first to generate a UUID, then copy",
  "已复制 Webhook 地址": "Webhook URL copied",
  "保存": "Save",
  "生成优惠券": "Generate Coupons",
  "代码": "Code",
  "类型": "Type",
  "数值": "Value",
  "可用次数": "Uses",
  "有效期": "Validity",
  "点击复制": "Click to copy",
  "百分比": "Percentage",
  "固定金额": "Fixed amount",
  "复制代码": "Copy code",
  "编辑优惠券": "Edit Coupon",
  "生成数量": "Quantity",
  "固定金额 (分)": "Fixed amount (cents)",
  "总使用上限": "Total use limit",
  "单用户上限": "Per-user limit",
  "开始时间": "Start time",
  "结束时间": "End time",
  "已生成": "Generated",
  "生成礼品卡": "Generate Gift Cards",
  "金额/Plan": "Amount/Plan",
  "余额": "Balance",
  "金额 (分)": "Amount (cents)",
  "使用上限 (留空不限)": "Use Limit (blank for unlimited)",
  "添加文章": "Add Article",
  "分类": "Category",
  "编辑文章": "Edit Article",
  "新建文章": "New Article",
  "正文 (Markdown / HTML)": "Body (Markdown / HTML)",
  "添加公告": "Add Notice",
  "编辑公告": "Edit Notice",
  "新建公告": "New Notice",
  "图片 URL": "Image URL",
  "正文 (HTML)": "Body (HTML)",
  "待回复": "Awaiting reply",
  "主题配置 — 管理端": "Theme Settings - Admin",
  "此处的设置只影响管理后台。用户端的样式请在「系统配置」→「个性化」中调整。": "These settings only affect the admin panel. User-facing styles are configured under System Settings > Personalization.",
  "主色": "Primary Color",
  "默认蓝": "Default blue",
  "暗蓝": "Dark blue",
  "暗黑": "Dark",
  "青绿": "Teal",
  "侧边栏样式": "Sidebar Style",
  "顶栏样式": "Header Style",
  "浅色": "Light",
  "深色": "Dark",
  "站点": "Site",
  "站点名称": "Site Name",
  "用于显示需要站点名称的地方。": "Displayed wherever the site name is needed.",
  "站点描述": "Site Description",
  "用于显示需要站点描述的地方。": "Displayed wherever the site description is needed.",
  "站点网址": "Site URL",
  "当前网站最新网址,将会在邮件等需要用于网址处使用。": "The current site URL, used in email and other URL references.",
  "强制HTTPS": "Force HTTPS",
  "当站点没有使用HTTPS、CDN或反向代理开启强制HTTPS时需要开启。": "Enable this when HTTPS, CDN, or reverse proxy HTTPS forcing is not already configured.",
  "请输入LOGO URL,末尾不要 /": "Enter LOGO URL without trailing slash",
  "用于显示需要LOGO的地方。": "Displayed wherever the logo is needed.",
  "订阅URL": "Subscription URL",
  "用于订阅时使用,留空则为站点URL。如果多个订阅URL随机获取使用请使用回车进行分割。": "Used for subscriptions. Leave blank to use the site URL. Put each URL on its own line to rotate multiple URLs.",
  "订阅路径": "Subscription Path",
  "用于订阅使用,留空则为/api/v1/client/subscribe。如需要修改不同的订阅路径请设置。": "Used for subscriptions. Leave blank for /api/v1/client/subscribe. Set this to use a custom path.",
  "用户条款(TOS)URL": "Terms of Service URL",
  "请输入用户条款URL,末尾不要 /": "Enter terms URL without trailing slash",
  "用于跳转到用户条款(TOS)。": "Used to link to the terms of service.",
  "停止新用户注册": "Disable New Registrations",
  "开启后任何人都将无法进行注册。": "When enabled, nobody can register.",
  "注册试用": "Trial Plan",
  "选择需要试用的订阅,如果没有选项请先创建订阅管理增加。": "Choose the trial subscription. Create a subscription first if no options are available.",
  "试用时间(小时)": "Trial Duration (hours)",
  "货币单位": "Currency Unit",
  "仅用于展示使用。更改后系统中所有的货币单位都将发生变更。": "Display only. Changing this updates all currency units shown in the system.",
  "货币符号": "Currency Symbol",
  "仅用于展示使用。更改后系统中所有的货币符号都将发生变更。": "Display only. Changing this updates all currency symbols shown in the system.",
  "安全": "Security",
  "邮箱验证": "Email Verification",
  "注册时强制要求验证邮箱验证码。": "Require email verification during registration.",
  "允许更换订阅": "Allow Plan Changes",
  "启用剩余价值抵扣": "Enable Remaining Value Deduction",
  "允许重新选购未到期订阅": "Allow Repurchase Before Expiry",
  "显示订阅链接二维码": "Show Subscription QR Code",
  "订阅到期提醒天数": "Subscription Expiry Reminder Days",
  "流量重置方法 (0/1/2)": "Traffic Reset Method (0/1/2)",
  "充值": "Top-up",
  "充值加成 (JSON)": "Top-up Bonus (JSON)",
  "工单": "Tickets",
  "关闭工单系统": "Disable Ticket System",
  "邀请&佣金": "Invites & Commission",
  "强制邀请注册": "Require Invite to Register",
  "邀请佣金 (%)": "Invite Commission (%)",
  "邀请码生成上限": "Invite Code Generation Limit",
  "邀请码永久有效": "Invite Codes Never Expire",
  "仅首次订单返佣": "Commission Only on First Order",
  "自动审核佣金": "Auto Approve Commission",
  "提现门槛 (CNY)": "Withdrawal Threshold (CNY)",
  "关闭佣金提现": "Disable Commission Withdrawal",
  "多级佣金分配": "Multi-level Commission",
  "一级佣金比例 %": "Level 1 Commission %",
  "二级佣金比例 %": "Level 2 Commission %",
  "三级佣金比例 %": "Level 3 Commission %",
  "个性化": "Personalization",
  "主题模板": "Theme Template",
  "主题色": "Theme Color",
  "背景图 URL": "Background Image URL",
  "节点通讯密钥": "Node Communication Secret",
  "拉取间隔 (秒)": "Pull Interval (seconds)",
  "上报间隔 (秒)": "Report Interval (seconds)",
  "节点最小上报流量 (Bytes)": "Minimum Node Report Traffic (Bytes)",
  "在线设备最小流量 (Bytes)": "Minimum Online Device Traffic (Bytes)",
  "设备限制模式 (0/1)": "Device Limit Mode (0/1)",
  "邮件": "Email",
  "SMTP 主机": "SMTP Host",
  "SMTP 端口": "SMTP Port",
  "用户名": "Username",
  "不加密": "None",
  "发件地址": "Sender Address",
  "启用 Telegram Bot": "Enable Telegram Bot",
  "讨论组链接": "Discussion Group Link",
  "Windows 版本号": "Windows Version",
  "Windows 下载链接": "Windows Download URL",
  "macOS 版本号": "macOS Version",
  "macOS 下载链接": "macOS Download URL",
  "Android 版本号": "Android Version",
  "Android 下载链接": "Android Download URL",
  "选择日期与时间": "Select date and time",
  "正常运行": "Running",
  "已连接(无流量)": "Connected (no traffic)",
  "离线": "Offline",
  "添加节点": "Add node",
  "取 消": "Cancel",
  "提 交": "Submit",
  "关闭": "Close",
  "关闭菜单": "Close menu",
  "已复制安装命令": "Install command copied",
  "复制命令": "Copy Command",
  "节点已创建。在节点服务器以 root 用户执行下面的脚本即可完成 Sukad 安装与连接。": "Node created. Run the script below as root on the node server to install and connect Sukad.",
  "在节点服务器以 root 用户执行下面的脚本即可。": "Run the script below as root on the node server.",
  "(暂无可用的安装命令)": "(No install command available)",
  "(保存后生成)": "(generated after saving)",
  "无效的 JSON": "Invalid JSON",
  "长期有效": "Never expires",
  "搜索邮箱": "Search email",
  "过滤器": "Filters",
  "批量发送邮件 (TODO)": "Batch send email (TODO)",
  "导出 CSV (TODO)": "Export CSV (TODO)",
  "新建用户": "New User",
  "账号": "Account",
  "新密码 (留空保持)": "New password (leave blank to keep)",
  "管理员": "Admin",
  "员工": "Staff",
  "封禁": "Banned",
  "正常": "Normal",
  "解封": "Unban",
  "到期时间": "Expires At",
  "到期时间 (留空 = 长期)": "Expiry Time (blank = never)",
  "流量与限制": "Traffic & Limits",
  "总流量 (GB)": "Total Traffic (GB)",
  "设备限制 (空=不限)": "Device Limit (blank = unlimited)",
  "已用上传 (GB)": "Used Upload (GB)",
  "已用下载 (GB)": "Used Download (GB)",
  "限速 (Mbps,空=不限)": "Speed Limit (Mbps, blank = unlimited)",
  "钱包余额 (分)": "Wallet Balance (cents)",
  "佣金余额 (分)": "Commission Balance (cents)"
};

const JA: Record<string, string> = {
  ...EN,
  "语言": "言語",
  "簡體中文": "簡体字中国語",
  "简体中文": "簡体字中国語",
  "繁體中文": "繁体字中国語",
  "繁体中文": "繁体字中国語",
  "菜单": "メニュー",
  "设置": "設定",
  "用户面板": "ユーザーパネル",
  "管理面板": "管理パネル",
  "个人中心": "プロフィール",
  "退出登录": "ログアウト",
  "面板": "パネル",
  "仪表盘": "ダッシュボード",
  "使用文档": "ドキュメント",
  "订阅": "サブスクリプション",
  "购买订阅": "サブスクリプション購入",
  "节点状态": "ノード状態",
  "财务": "請求",
  "我的订单": "注文",
  "我的邀请": "招待",
  "用户": "ユーザー",
  "我的工单": "チケット",
  "流量明细": "トラフィック明細",
  "公告": "お知らせ",
  "系统配置": "システム設定",
  "支付配置": "決済設定",
  "主题配置": "テーマ設定",
  "服务器": "サーバー",
  "节点管理": "ノード管理",
  "权限组管理": "権限グループ",
  "路由管理": "ルート管理",
  "订阅管理": "サブスクリプション管理",
  "订单管理": "注文管理",
  "优惠券管理": "クーポン管理",
  "礼品卡管理": "ギフトカード管理",
  "用户管理": "ユーザー管理",
  "公告管理": "お知らせ管理",
  "工单管理": "チケット管理",
  "知识库管理": "ナレッジベース管理",
  "加载中…": "読み込み中...",
  "暂无数据": "データなし",
  "注册": "登録",
  "忘记密码": "パスワードを忘れた",
  "返回登入": "ログインへ戻る",
  "邮箱": "メール",
  "密码": "パスワード",
  "新密码": "新しいパスワード",
  "邮箱验证码": "メール認証コード",
  "获取验证码": "コード取得",
  "发送中…": "送信中...",
  "登录中…": "ログイン中...",
  "注册中…": "登録中...",
  "提交中…": "送信中...",
  "保存中…": "保存中...",
  "取消中…": "キャンセル中...",
  "跳转中…": "移動中...",
  "登入": "ログイン",
  "重置密码": "パスワードをリセット",
  "请输入邮箱与密码": "メールとパスワードを入力してください",
  "登录失败": "ログインに失敗しました",
  "请先填邮箱": "先にメールを入力してください",
  "验证码已发送": "認証コードを送信しました",
  "请填邮箱和密码": "メールとパスワードを入力してください",
  "两次密码不一致": "パスワードが一致しません",
  "邀请码": "招待コード",
  "邀请码(选填)": "招待コード (任意)",
  "请填齐所有字段": "すべての項目を入力してください",
  "密码已重置": "パスワードをリセットしました",
  "我的订阅": "サブスクリプション",
  "该订阅长期有效": "このサブスクリプションは無期限です",
  "已用": "使用済み",
  "总计": "合計",
  "在线设备": "オンライン端末",
  "当前没有订阅": "有効なサブスクリプションはありません",
  "立即选购": "今すぐ選ぶ",
  "捷径": "ショートカット",
  "查看教程": "ガイドを見る",
  "学习如何使用 透かし": "透かし の使い方を見る",
  "一键订阅": "クイックインポート",
  "快速将节点导入对应客户端进行使用": "対応クライアントへノードを素早く取り込みます",
  "续费订阅": "サブスクリプション更新",
  "对您当前的订阅进行续费": "現在のサブスクリプションを更新します",
  "遇到问题": "サポート",
  "遇到问题可以通过工单与我们沟通": "問題がある場合はチケットでお問い合わせください",
  "订阅地址": "サブスクリプションURL",
  "订阅地址已复制": "サブスクリプションURLをコピーしました",
  "已复制": "コピー済み",
  "复制": "コピー",
  "一键导入到客户端 (会唤起对应 App,需先安装):": "クライアントへインポート (事前にアプリのインストールが必要):",
  "选择最适合您的计划": "最適なプランを選択",
  "全部": "すべて",
  "按周期": "期間別",
  "按流量": "トラフィック別",
  "立即订阅": "今すぐ購読",
  "月付": "月額",
  "季付": "四半期",
  "半年付": "半年",
  "年付": "年額",
  "两年付": "2年",
  "三年付": "3年",
  "一次性": "買い切り",
  "重置流量": "トラフィックリセット",
  "付款周期": "支払い周期",
  "有优惠券?": "クーポンがありますか？",
  "验证": "確認",
  "输入优惠券代码": "クーポンコードを入力",
  "优惠券有效": "クーポンは有効です",
  "优惠券抵扣": "クーポン割引",
  "订单总额": "注文概要",
  "下单": "注文する",
  "请先选择购买周期": "先に購入周期を選択してください",
  "请选择购买周期": "購入周期を選択してください",
  "订单创建失败": "注文作成に失敗しました",
  "订单已创建": "注文を作成しました",
  "订单号": "注文番号",
  "周期": "周期",
  "订单金额": "注文金額",
  "订单状态": "注文状態",
  "创建时间": "作成日時",
  "操作": "操作",
  "查看": "表示",
  "待支付": "未払い",
  "已支付": "支払い済み",
  "已取消": "キャンセル済み",
  "已完成": "完了",
  "已折扣": "割引済み",
  "订单详情": "注文詳細",
  "状态": "状態",
  "金额": "金額",
  "支付": "支払い",
  "暂无可用支付方式": "利用可能な支払い方法がありません",
  "立即支付": "今すぐ支払う",
  "取消订单": "注文をキャンセル",
  "此订单无需再支付。": "この注文は支払い不要です。",
  "订单已完成": "注文が完了しました",
  "结算失败": "決済に失敗しました",
  "订单已取消": "注文をキャンセルしました",
  "订单已支付": "注文は支払い済みです",
  "日期": "日付",
  "上传": "アップロード",
  "下载": "ダウンロード",
  "合计": "合計",
  "计算倍率": "倍率",
  "节点": "ノード",
  "协议": "プロトコル",
  "倍率": "倍率",
  "标签": "タグ",
  "我的钱包(仅消费)": "ウォレット (支払い専用)",
  "自动续费": "自動更新",
  "充 值": "チャージ",
  "礼品卡": "ギフトカード",
  "请输入礼品卡": "ギフトカードを入力",
  "兑 换": "交換",
  "修改密码": "パスワード変更",
  "旧密码": "現在のパスワード",
  "请输入旧密码": "現在のパスワードを入力",
  "请输入新密码": "新しいパスワードを入力",
  "保 存": "保存",
  "通知": "通知",
  "到期邮件提醒": "期限メール通知",
  "流量邮件提醒": "トラフィックメール通知",
  "重置订阅信息": "サブスクリプション情報をリセット",
  "重 置": "リセット",
  "两次新密码不一致": "新しいパスワードが一致しません",
  "密码已更新": "パスワードを更新しました",
  "兑换成功": "交換しました",
  "邀请码已生成": "招待コードを生成しました",
  "已划转到钱包": "ウォレットへ移動しました",
  "已复制邀请链接": "招待リンクをコピーしました",
  "当前剩余佣金": "現在のコミッション残高",
  "划 转": "移動",
  "推广佣金提现": "コミッション出金",
  "已注册用户数": "登録ユーザー数",
  "佣金比例": "コミッション率",
  "确认中的佣金": "確認中のコミッション",
  "累计获得佣金": "累計コミッション",
  "邀请码管理": "招待コード管理",
  "生成邀请码": "招待コード生成",
  "复制链接": "リンクをコピー",
  "佣金发放记录": "コミッション支払い履歴",
  "发放时间": "支払い日時",
  "佣金": "コミッション",
  "工单历史": "チケット履歴",
  "新的工单": "新規チケット",
  "主题": "件名",
  "工单级别": "優先度",
  "工单状态": "チケット状態",
  "最后回复": "最終返信",
  "低": "低",
  "中": "中",
  "高": "高",
  "已开启": "オープン",
  "已关闭": "クローズ",
  "新建工单": "新規チケット",
  "级别": "優先度",
  "内容": "内容",
  "提交": "送信",
  "工单已创建": "チケットを作成しました",
  "关闭工单": "チケットを閉じる",
  "回复内容": "返信内容",
  "发送": "送信",
  "搜索文档": "ドキュメント検索",
  "其他": "その他",
  "在线人数": "オンライン人数",
  "今日收入": "本日の売上",
  "实时注册": "本日の登録",
  "本月收入": "今月の売上",
  "上月收入": "先月の売上",
  "上月佣金支出": "先月のコミッション支出",
  "本月新增用户": "今月の新規ユーザー",
  "今日节点流量排行": "本日のノードトラフィック順位",
  "昨日节点流量排行": "昨日のノードトラフィック順位",
  "今日用户流量排行": "本日のユーザートラフィック順位",
  "昨日用户流量排行": "昨日のユーザートラフィック順位",
  "保存成功": "保存しました",
  "已保存": "保存しました",
  "已删除": "削除しました",
  "排序已保存": "並び順を保存しました",
  "添加订阅": "サブスクリプション追加",
  "销售状态": "販売状態",
  "续费": "更新",
  "名称": "名前",
  "统计": "統計",
  "设备数限制": "端末数制限",
  "编辑": "編集",
  "删除": "削除",
  "编辑订阅": "サブスクリプション編集",
  "新建订阅": "新規サブスクリプション",
  "强制更新到用户": "ユーザーへ強制更新",
  "套餐名称": "プラン名",
  "套餐描述": "プラン説明",
  "售价设置": "価格設定",
  "重置包": "リセットパック",
  "权限组": "権限グループ",
  "销售设置": "販売設定",
  "对外显示": "公開",
  "全部状态": "すべての状態",
  "查询": "検索",
  "标记已支付": "支払い済みにする",
  "无可用操作": "利用可能な操作なし",
  "输入任意关键字搜索": "キーワードで検索",
  "取消": "キャンセル",
  "保存排序": "並び順を保存",
  "编辑排序": "並び替え",
  "节点ID": "ノードID",
  "显隐": "表示",
  "地址": "アドレス",
  "人数": "人数",
  "安装脚本": "インストールスクリプト",
  "新建": "新規",
  "基础信息": "基本情報",
  "节点名称": "ノード名",
  "地址 (Host)": "アドレス (Host)",
  "对外端口": "公開ポート",
  "内部端口": "内部ポート",
  "路由规则": "ルートルール",
  "请选择": "選択してください",
  "不强制": "強制しない",
  "协议参数": "プロトコル設定",
  "加密方式": "暗号化方式",
  "无": "なし",
  "不启用": "無効",
  "传输协议": "トランスポート",
  "传输协议设置 (JSON)": "トランスポート設定 (JSON)",
  "上行 Mbps": "上り Mbps",
  "下行 Mbps": "下り Mbps",
  "UDP 中继": "UDPリレー",
  "拥塞控制": "輻輳制御",
  "禁用 SNI": "SNIを無効化",
  "Snell 版本": "Snell バージョン",
  "添加权限组": "権限グループ追加",
  "用户数": "ユーザー数",
  "节点数": "ノード数",
  "添加路由": "ルート追加",
  "动作": "アクション",
  "匹配条目": "一致項目",
  "启用": "有効",
  "货币": "通貨",
  "保存": "保存",
  "生成优惠券": "クーポン生成",
  "代码": "コード",
  "类型": "タイプ",
  "数值": "値",
  "可用次数": "使用回数",
  "有效期": "有効期限",
  "百分比": "パーセント",
  "固定金额": "固定金額",
  "复制代码": "コードをコピー",
  "生成数量": "生成数",
  "总使用上限": "総使用上限",
  "单用户上限": "ユーザーごとの上限",
  "开始时间": "開始時刻",
  "结束时间": "終了時刻",
  "已生成": "生成しました",
  "生成礼品卡": "ギフトカード生成",
  "余额": "残高",
  "添加文章": "記事追加",
  "分类": "カテゴリ",
  "编辑文章": "記事編集",
  "新建文章": "新規記事",
  "添加公告": "お知らせ追加",
  "编辑公告": "お知らせ編集",
  "新建公告": "新規お知らせ",
  "待回复": "返信待ち",
  "主色": "メインカラー",
  "侧边栏样式": "サイドバー表示",
  "顶栏样式": "ヘッダー表示",
  "浅色": "ライト",
  "深色": "ダーク",
  "站点": "サイト",
  "站点名称": "サイト名",
  "站点描述": "サイト説明",
  "站点网址": "サイトURL",
  "强制HTTPS": "HTTPSを強制",
  "停止新用户注册": "新規登録を停止",
  "安全": "セキュリティ",
  "邮箱验证": "メール認証",
  "充值": "チャージ",
  "邀请&佣金": "招待とコミッション",
  "个性化": "パーソナライズ",
  "邮件": "メール",
  "用户名": "ユーザー名",
  "不加密": "暗号化なし",
  "选择日期与时间": "日時を選択",
  "正常运行": "正常稼働",
  "已连接(无流量)": "接続済み (通信なし)",
  "离线": "オフライン",
  "添加节点": "ノード追加",
  "取 消": "キャンセル",
  "提 交": "送信",
  "关闭": "閉じる",
  "关闭菜单": "メニューを閉じる",
  "复制命令": "コマンドをコピー",
  "无效的 JSON": "JSONが無効です",
  "长期有效": "無期限",
  "搜索邮箱": "メール検索",
  "过滤器": "フィルター",
  "新建用户": "新規ユーザー",
  "账号": "アカウント",
  "管理员": "管理者",
  "员工": "スタッフ",
  "封禁": "停止",
  "正常": "正常",
  "解封": "停止解除",
  "到期时间": "期限",
  "流量与限制": "トラフィックと制限",
  "备注": "備考"
};

const ZH_TW_TERMS: Record<string, string> = {
  // Ambiguous simplified chars resolved as whole words (these must precede the
  // single-char fallbacks below; convertToTraditional applies longest-first).
  "复刻": "複刻",
  "重复": "重複",
  "恢复": "恢復",
  // Single-char simplified -> traditional fallbacks so any string not covered by
  // a word term above still fully converts (no leftover simplified glyphs).
  "为": "為",
  "习": "習",
  "买": "買",
  "仅": "僅",
  "们": "們",
  "价": "價",
  "余": "餘",
  "兑": "兌",
  "关": "關",
  "击": "擊",
  "则": "則",
  "单": "單",
  "备": "備",
  "对": "對",
  "当": "當",
  "总": "總",
  "换": "換",
  "无": "無",
  "时": "時",
  "显": "顯",
  "样": "樣",
  "点": "點",
  "码": "碼",
  "级": "級",
  "细": "細",
  "结": "結",
  "编": "編",
  "获": "獲",
  "规": "規",
  "计": "計",
  "设": "設",
  "证": "證",
  "该": "該",
  "请": "請",
  "购": "購",
  "费": "費",
  "过": "過",
  "这": "這",
  "选": "選",
  "间": "間",
  "项": "項",
  "验": "驗",
  "仪表盘": "儀表板",
  "使用文档": "使用文件",
  "订阅": "訂閱",
  "节点": "節點",
  "财务": "財務",
  "订单": "訂單",
  "邀请": "邀請",
  "用户": "使用者",
  "个人中心": "個人中心",
  "工单": "工單",
  "流量": "流量",
  "公告": "公告",
  "系统": "系統",
  "配置": "設定",
  "支付": "支付",
  "主题": "主題",
  "服务器": "伺服器",
  "权限组": "權限群組",
  "路由": "路由",
  "优惠券": "優惠券",
  "礼品卡": "禮品卡",
  "知识库": "知識庫",
  "语言": "語言",
  "简体中文": "簡體中文",
  "繁体中文": "繁體中文",
  "加载中": "載入中",
  "暂无数据": "暫無資料",
  "待实现": "待實作",
  "注册": "註冊",
  "忘记密码": "忘記密碼",
  "返回登入": "返回登入",
  "邮箱": "信箱",
  "密码": "密碼",
  "验证码": "驗證碼",
  "获取": "取得",
  "发送": "傳送",
  "登录": "登入",
  "重置": "重設",
  "输入": "輸入",
  "当前": "目前",
  "长期": "長期",
  "有效": "有效",
  "在线": "線上",
  "设备": "裝置",
  "立即": "立即",
  "选购": "選購",
  "查看": "檢視",
  "教程": "教學",
  "快速": "快速",
  "导入": "匯入",
  "对应": "對應",
  "客户端": "用戶端",
  "进行": "進行",
  "续费": "續費",
  "问题": "問題",
  "地址": "位址",
  "复制": "複製",
  "计划": "方案",
  "选择": "選擇",
  "周期": "週期",
  "一次性": "一次性",
  "优惠": "優惠",
  "总额": "總額",
  "状态": "狀態",
  "创建": "建立",
  "待支付": "待支付",
  "已支付": "已支付",
  "已取消": "已取消",
  "已完成": "已完成",
  "折扣": "折扣",
  "详情": "詳情",
  "暂无": "暫無",
  "可用": "可用",
  "方式": "方式",
  "无需": "無需",
  "日期": "日期",
  "上传": "上傳",
  "下载": "下載",
  "合计": "合計",
  "计算": "計算",
  "标签": "標籤",
  "钱包": "錢包",
  "自动": "自動",
  "充值": "儲值",
  "兑换": "兌換",
  "修改": "修改",
  "旧": "舊",
  "新": "新",
  "通知": "通知",
  "到期": "到期",
  "邮件": "郵件",
  "提醒": "提醒",
  "信息": "資訊",
  "账户": "帳戶",
  "泄漏": "洩漏",
  "滥用": "濫用",
  "损失": "損失",
  "成功": "成功",
  "生成": "產生",
  "划转": "劃轉",
  "推广": "推廣",
  "提现": "提現",
  "佣金": "佣金",
  "比例": "比例",
  "确认": "確認",
  "累计": "累計",
  "发放": "發放",
  "历史": "歷史",
  "级别": "級別",
  "开启": "開啟",
  "关闭": "關閉",
  "内容": "內容",
  "搜索": "搜尋",
  "排行": "排行",
  "收入": "收入",
  "新增": "新增",
  "支出": "支出",
  "保存": "儲存",
  "删除": "刪除",
  "排序": "排序",
  "销售": "銷售",
  "统计": "統計",
  "名称": "名稱",
  "套餐": "套餐",
  "描述": "描述",
  "售价": "售價",
  "限制": "限制",
  "显隐": "顯隱",
  "人数": "人數",
  "安装": "安裝",
  "脚本": "腳本",
  "基础": "基礎",
  "对外": "對外",
  "端口": "連接埠",
  "内部": "內部",
  "协议": "協定",
  "参数": "參數",
  "加密": "加密",
  "混淆": "混淆",
  "启用": "啟用",
  "传输": "傳輸",
  "设置": "設定",
  "上行": "上行",
  "下行": "下行",
  "中继": "中繼",
  "拥塞": "壅塞",
  "控制": "控制",
  "禁用": "停用",
  "版本": "版本",
  "最新": "最新",
  "备注": "備註",
  "动作": "動作",
  "匹配": "匹配",
  "条目": "項目",
  "拒绝": "拒絕",
  "解析": "解析",
  "直连": "直連",
  "货币": "貨幣",
  "代码": "代碼",
  "类型": "類型",
  "数值": "數值",
  "百分比": "百分比",
  "金额": "金額",
  "总使用": "總使用",
  "单用户": "單使用者",
  "开始": "開始",
  "结束": "結束",
  "分类": "分類",
  "正文": "正文",
  "图片": "圖片",
  "回复": "回覆",
  "主色": "主色",
  "默认蓝": "預設藍",
  "暗蓝": "深藍",
  "暗黑": "暗黑",
  "青绿": "青綠",
  "浅色": "淺色",
  "深色": "深色",
  "站点": "站點",
  "网址": "網址",
  "强制": "強制",
  "用户条款": "使用者條款",
  "安全": "安全",
  "个性化": "個人化",
  "通讯": "通訊",
  "密钥": "金鑰",
  "间隔": "間隔",
  "上报": "回報",
  "主机": "主機",
  "用户名": "使用者名稱",
  "发件": "寄件",
  "讨论组": "討論群組",
  "链接": "連結",
  "正常运行": "正常執行",
  "离线": "離線",
  "无效": "無效",
  "过滤器": "篩選器",
  "批量": "批次",
  "导出": "匯出",
  "账号": "帳號",
  "管理员": "管理員",
  "员工": "員工",
  "封禁": "封鎖",
  "正常": "正常",
  "解封": "解除封鎖",
  "余额": "餘額"
};

const REPLACEMENTS: Record<Locale, Array<[RegExp, string]>> = {
  en: [
    [/^到期时间 (.+)$/u, "Expires at $1"],
    [/^立即支付 \((.+)\)$/u, "Pay now ($1)"],
    [/^优惠 (.+)$/u, "Discount $1"],
    [/^共 (.+) 个用户$/u, "$1 users total"],
    [/^共 (.+) 笔订单$/u, "$1 orders total"],
    [/^(.+) 条 \/ 页$/u, "$1 / page"],
    [/^(.+) 条\/页$/u, "$1 / page"],
    [/^(.+) 条$/u, "$1 items"],
    [/^(.+)人$/u, "$1 people"],
    [/^保存 (.+)$/u, "Save $1"],
    [/^编辑用户 (.+)$/u, "Edit User $1"],
    [/^删除用户 (.+)？$/u, "Delete user $1?"],
    [/^删除(.+)？$/u, "Delete$1?"],
    [/^节点(.+) 安装命令$/u, "Node$1 Install Command"],
    [/^v(.+) \(常见\)$/u, "v$1 (common)"],
    [/^v(.+) \(最新\)$/u, "v$1 (latest)"],
    [/^(.+) \(可选\)$/u, "$1 (optional)"],
    [/^(.+) \(留空不限\)$/u, "$1 (blank for unlimited)"],
    [/^(.+) \(留空 = 长期\)$/u, "$1 (blank = never)"]
  ],
  "zh-CN": [],
  "zh-TW": [
    [/^到期时间 (.+)$/u, "到期時間 $1"],
    [/^立即支付 \((.+)\)$/u, "立即支付 ($1)"],
    [/^优惠 (.+)$/u, "優惠 $1"],
    [/^共 (.+) 个用户$/u, "共 $1 個使用者"],
    [/^共 (.+) 笔订单$/u, "共 $1 筆訂單"],
    [/^(.+) 条 \/ 页$/u, "$1 筆 / 頁"],
    [/^(.+) 条\/页$/u, "$1 筆/頁"],
    [/^(.+) 条$/u, "$1 筆"],
    [/^(.+)人$/u, "$1 人"],
    [/^保存 (.+)$/u, "儲存 $1"],
    [/^编辑用户 (.+)$/u, "編輯使用者 $1"],
    [/^删除用户 (.+)？$/u, "刪除使用者 $1？"],
    [/^删除(.+)？$/u, "刪除$1？"],
    [/^节点(.+) 安装命令$/u, "節點$1 安裝命令"],
    [/^v(.+) \(常见\)$/u, "v$1 (常見)"],
    [/^v(.+) \(最新\)$/u, "v$1 (最新)"],
    [/^(.+) \(可选\)$/u, "$1 (可選)"],
    [/^(.+) \(留空不限\)$/u, "$1 (留空不限)"],
    [/^(.+) \(留空 = 长期\)$/u, "$1 (留空 = 長期)"]
  ],
  ja: [
    [/^到期时间 (.+)$/u, "期限 $1"],
    [/^立即支付 \((.+)\)$/u, "今すぐ支払う ($1)"],
    [/^优惠 (.+)$/u, "割引 $1"],
    [/^共 (.+) 个用户$/u, "合計 $1 ユーザー"],
    [/^共 (.+) 笔订单$/u, "合計 $1 注文"],
    [/^(.+) 条 \/ 页$/u, "$1 件 / ページ"],
    [/^(.+) 条\/页$/u, "$1 件/ページ"],
    [/^(.+) 条$/u, "$1 件"],
    [/^(.+)人$/u, "$1 人"],
    [/^保存 (.+)$/u, "$1 を保存"],
    [/^编辑用户 (.+)$/u, "ユーザー $1 を編集"],
    [/^删除用户 (.+)？$/u, "ユーザー $1 を削除しますか？"],
    [/^删除(.+)？$/u, "$1 を削除しますか？"],
    [/^节点(.+) 安装命令$/u, "ノード$1 インストールコマンド"],
    [/^v(.+) \(常见\)$/u, "v$1 (一般的)"],
    [/^v(.+) \(最新\)$/u, "v$1 (最新)"],
    [/^(.+) \(可选\)$/u, "$1 (任意)"],
    [/^(.+) \(留空不限\)$/u, "$1 (空欄で無制限)"],
    [/^(.+) \(留空 = 长期\)$/u, "$1 (空欄 = 無期限)"]
  ]
};

function normalizeLocale(value: string | undefined | null): Locale | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith("zh")) {
    if (
      lower.includes("tw") ||
      lower.includes("hk") ||
      lower.includes("mo") ||
      lower.includes("hant")
    ) {
      return "zh-TW";
    }
    return "zh-CN";
  }
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("en")) return "en";
  return null;
}

function readStoredLocale(): Locale | null {
  try {
    return normalizeLocale(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function detectLocale(): Locale {
  const stored = readStoredLocale();
  if (stored) return stored;
  const browserLanguages =
    typeof navigator === "undefined"
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language];
  for (const language of browserLanguages) {
    const normalized = normalizeLocale(language);
    if (normalized) return normalized;
  }
  return "en";
}

function preserveWhitespace(source: string, translated: string): string {
  const prefix = source.match(/^\s*/u)?.[0] ?? "";
  const suffix = source.match(/\s*$/u)?.[0] ?? "";
  return `${prefix}${translated}${suffix}`;
}

function convertToTraditional(source: string): string {
  const terms = Object.entries(ZH_TW_TERMS).sort((a, b) => b[0].length - a[0].length);
  let output = source;
  for (const [from, to] of terms) {
    output = output.split(from).join(to);
  }
  return output;
}

function replaceKnownTerms(source: string, locale: Locale): string {
  if (locale === "zh-CN") return source;
  if (locale === "zh-TW") return convertToTraditional(source);
  const dictionary = locale === "ja" ? JA : EN;
  const terms = Object.entries(dictionary)
    .filter(([from]) => from.trim().length > 1 && /[\p{Script=Han}]/u.test(from))
    .sort((a, b) => b[0].length - a[0].length);
  let output = source;
  for (const [from, to] of terms) {
    output = output.split(from).join(to);
  }
  return output;
}

export function translateText(source: string, locale: Locale): string {
  if (!source) return source;
  if (locale === "zh-CN") return source;
  const trimmed = source.trim();
  if (!trimmed) return source;

  // Exact dictionary match wins over the partial REPLACEMENTS regexes so that a
  // fully-authored string (e.g. "重置订阅") is never half-translated by a
  // substring rule into "重置Subscription". Dynamic strings (counts, names)
  // have no exact entry and still fall through to the regex / term replacement.
  if (locale === "en" || locale === "ja") {
    const exact = (locale === "ja" ? JA : EN)[trimmed];
    if (exact) return preserveWhitespace(source, exact);
  }

  for (const [pattern, replacement] of REPLACEMENTS[locale]) {
    if (pattern.test(trimmed)) {
      return preserveWhitespace(source, trimmed.replace(pattern, replacement));
    }
  }

  if (locale === "zh-TW") {
    return preserveWhitespace(source, convertToTraditional(trimmed));
  }

  const replaced = replaceKnownTerms(trimmed, locale);
  return preserveWhitespace(source, replaced);
}

function shouldSkipNode(node: Node): boolean {
  const el =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  if (!el) return true;
  if (SKIP_TAGS.has(el.tagName)) return true;
  return Boolean(el.closest("[data-i18n-skip]"));
}

function localizeTextNode(node: Text, locale: Locale) {
  const raw = node.nodeValue ?? "";
  if (!raw.trim() || shouldSkipNode(node)) return;
  // If the current raw matches the output we last wrote, we're looking at
  // our own translation and should keep the original source. Otherwise the
  // DOM was rewritten by React (price changed, email loaded, …) and raw is
  // the new source we should translate going forward.
  const prev = TEXT_STATE.get(node);
  const source = prev && prev.output === raw ? prev.source : raw;
  const next = translateText(source, locale);
  TEXT_STATE.set(node, { source, output: next });
  if (next !== raw) node.nodeValue = next;
}

function localizeElement(element: Element, locale: Locale) {
  if (shouldSkipNode(element)) return;
  let map = ATTR_STATE.get(element);
  for (const attr of ATTRS) {
    const raw = element.getAttribute(attr);
    if (!raw?.trim()) continue;
    const prev = map?.get(attr);
    const source = prev && prev.output === raw ? prev.source : raw;
    const next = translateText(source, locale);
    if (!map) {
      map = new Map();
      ATTR_STATE.set(element, map);
    }
    map.set(attr, { source, output: next });
    if (next !== raw) element.setAttribute(attr, next);
  }
}

function localizeSubtree(root: Node, locale: Locale) {
  if (shouldSkipNode(root)) return;
  if (root.nodeType === Node.TEXT_NODE) {
    localizeTextNode(root as Text, locale);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
    return;
  }
  if (root.nodeType === Node.ELEMENT_NODE) localizeElement(root as Element, locale);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) localizeTextNode(current as Text, locale);
    else localizeElement(current as Element, locale);
    current = walker.nextNode();
  }
}

function localizeDocument(locale: Locale) {
  document.documentElement.lang = locale;
  localizeSubtree(document.body, locale);
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (source: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(source: string, vars?: Record<string, string | number>): string {
  if (!vars) return source;
  return source.replace(/\{(\w+)\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : `{${key}}`
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());

  // The MutationObserver below is registered once and reads `localeRef.current`
  // every time it fires. Without this, the observer would close over the
  // locale value at the time it was created and, after a switch, see any
  // text we just translated as "needs to be translated again" with the OLD
  // locale — silently undoing the switch until the next full reload.
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (source: string, vars?: Record<string, string | number>) =>
      interpolate(translateText(source, locale), vars),
    [locale]
  );

  useLayoutEffect(() => {
    if (typeof document !== "undefined") localizeDocument(locale);
  }, [locale]);

  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver((mutations) => {
      const cur = localeRef.current;
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          localizeTextNode(mutation.target as Text, cur);
        } else if (mutation.type === "attributes") {
          localizeElement(mutation.target as Element, cur);
        } else {
          mutation.addedNodes.forEach((node) => localizeSubtree(node, cur));
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS]
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const original = window.confirm.bind(window);
    window.confirm = (message?: string) =>
      original(typeof message === "string" ? translateText(message, localeRef.current) : message);
    return () => {
      window.confirm = original;
    };
  }, []);

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
