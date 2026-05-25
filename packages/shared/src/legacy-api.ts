import { REMOVED_NODE_PROTOCOLS } from "./protocols.js";

export type LegacyHttpMethod = "GET" | "POST" | "ANY";

export type LegacyRouteDomain =
  | "admin"
  | "client"
  | "guest"
  | "passport"
  | "server"
  | "staff"
  | "user";

export interface LegacyApiRoute {
  method: LegacyHttpMethod;
  path: string;
  domain: LegacyRouteDomain;
  controller: string;
  active: boolean;
  notes?: string;
}

const ADMIN_PREFIX = ":adminPath";

function admin(
  method: LegacyHttpMethod,
  path: string,
  controller: string,
  active = true,
  notes?: string
): LegacyApiRoute {
  return {
    method,
    path: `${ADMIN_PREFIX}/${path.replace(/^\/+/, "")}`,
    domain: "admin",
    controller,
    active,
    ...(notes ? { notes } : {})
  };
}

function route(
  method: LegacyHttpMethod,
  domain: LegacyRouteDomain,
  path: string,
  controller: string,
  active = true,
  notes?: string
): LegacyApiRoute {
  return {
    method,
    path: path.replace(/^\/+/, ""),
    domain,
    controller,
    active,
    ...(notes ? { notes } : {})
  };
}

const adminCrud = (
  prefix: string,
  controller: string,
  actions: Array<[LegacyHttpMethod, string]>
): LegacyApiRoute[] =>
  actions.map(([method, action]) => admin(method, `${prefix}/${action}`, controller));

const retainedAdminServerRoutes = [
  ...adminCrud("server/v2node", "V1\\Admin\\Server\\V2nodeController", [
    ["POST", "save"],
    ["POST", "drop"],
    ["POST", "update"],
    ["POST", "copy"]
  ])
];

const removedAdminServerRoutes = [
  ...adminCrud("server/shadowsocks", "V1\\Admin\\Server\\ShadowsocksController", [
    ["POST", "save"],
    ["POST", "drop"],
    ["POST", "update"],
    ["POST", "copy"]
  ]),
  ...adminCrud("server/tuic", "V1\\Admin\\Server\\TuicController", [
    ["POST", "save"],
    ["POST", "drop"],
    ["POST", "update"],
    ["POST", "copy"]
  ]),
  ...adminCrud("server/hysteria", "V1\\Admin\\Server\\HysteriaController", [
    ["POST", "save"],
    ["POST", "drop"],
    ["POST", "update"],
    ["POST", "copy"]
  ]),
  ...adminCrud("server/vless", "V1\\Admin\\Server\\VlessController", [
    ["POST", "save"],
    ["POST", "drop"],
    ["POST", "update"],
    ["POST", "copy"]
  ]),
  ...adminCrud("server/anytls", "V1\\Admin\\Server\\AnyTLSController", [
    ["POST", "save"],
    ["POST", "drop"],
    ["POST", "update"],
    ["POST", "copy"]
  ]),
  ...adminCrud("server/trojan", "V1\\Admin\\Server\\TrojanController", [
    ["POST", "save"],
    ["POST", "drop"],
    ["POST", "update"],
    ["POST", "copy"]
  ]),
  ...adminCrud("server/vmess", "V1\\Admin\\Server\\VmessController", [
    ["POST", "save"],
    ["POST", "drop"],
    ["POST", "update"],
    ["POST", "copy"]
  ])
].map((item) => ({
  ...item,
  active: false,
  notes: `Removed by TypeScript rewrite protocol policy: ${REMOVED_NODE_PROTOCOLS.join(", ")}`
}));

export const LEGACY_API_ROUTES: readonly LegacyApiRoute[] = [
  admin("GET", "config/fetch", "V1\\Admin\\ConfigController@fetch"),
  admin("POST", "config/save", "V1\\Admin\\ConfigController@save"),
  admin("GET", "config/getEmailTemplate", "V1\\Admin\\ConfigController@getEmailTemplate"),
  admin("GET", "config/getThemeTemplate", "V1\\Admin\\ConfigController@getThemeTemplate"),
  admin("POST", "config/setTelegramWebhook", "V1\\Admin\\ConfigController@setTelegramWebhook"),
  admin("POST", "config/testSendMail", "V1\\Admin\\ConfigController@testSendMail"),

  admin("GET", "plan/fetch", "V1\\Admin\\PlanController@fetch"),
  admin("POST", "plan/save", "V1\\Admin\\PlanController@save"),
  admin("POST", "plan/drop", "V1\\Admin\\PlanController@drop"),
  admin("POST", "plan/update", "V1\\Admin\\PlanController@update"),
  admin("POST", "plan/sort", "V1\\Admin\\PlanController@sort"),

  admin("GET", "server/group/fetch", "V1\\Admin\\Server\\GroupController@fetch"),
  admin("POST", "server/group/save", "V1\\Admin\\Server\\GroupController@save"),
  admin("POST", "server/group/drop", "V1\\Admin\\Server\\GroupController@drop"),
  admin("GET", "server/route/fetch", "V1\\Admin\\Server\\RouteController@fetch"),
  admin("POST", "server/route/save", "V1\\Admin\\Server\\RouteController@save"),
  admin("POST", "server/route/drop", "V1\\Admin\\Server\\RouteController@drop"),
  admin("GET", "server/manage/getNodes", "V1\\Admin\\Server\\ManageController@getNodes"),
  admin("POST", "server/manage/sort", "V1\\Admin\\Server\\ManageController@sort"),
  ...retainedAdminServerRoutes,
  ...removedAdminServerRoutes,

  admin("GET", "order/fetch", "V1\\Admin\\OrderController@fetch"),
  admin("POST", "order/update", "V1\\Admin\\OrderController@update"),
  admin("POST", "order/assign", "V1\\Admin\\OrderController@assign"),
  admin("POST", "order/paid", "V1\\Admin\\OrderController@paid"),
  admin("POST", "order/cancel", "V1\\Admin\\OrderController@cancel"),
  admin("POST", "order/detail", "V1\\Admin\\OrderController@detail"),

  admin("GET", "user/fetch", "V1\\Admin\\UserController@fetch"),
  admin("POST", "user/update", "V1\\Admin\\UserController@update"),
  admin("GET", "user/getUserInfoById", "V1\\Admin\\UserController@getUserInfoById"),
  admin("POST", "user/generate", "V1\\Admin\\UserController@generate"),
  admin("POST", "user/dumpCSV", "V1\\Admin\\UserController@dumpCSV"),
  admin("POST", "user/sendMail", "V1\\Admin\\UserController@sendMail"),
  admin("POST", "user/ban", "V1\\Admin\\UserController@ban"),
  admin("POST", "user/resetSecret", "V1\\Admin\\UserController@resetSecret"),
  admin("POST", "user/delUser", "V1\\Admin\\UserController@delUser"),
  admin("POST", "user/allDel", "V1\\Admin\\UserController@allDel"),
  admin("POST", "user/setInviteUser", "V1\\Admin\\UserController@setInviteUser"),

  admin("GET", "stat/getStat", "V1\\Admin\\StatController@getStat"),
  admin("GET", "stat/getOverride", "V1\\Admin\\StatController@getOverride"),
  admin("GET", "stat/getServerLastRank", "V1\\Admin\\StatController@getServerLastRank"),
  admin("GET", "stat/getServerTodayRank", "V1\\Admin\\StatController@getServerTodayRank"),
  admin("GET", "stat/getUserLastRank", "V1\\Admin\\StatController@getUserLastRank"),
  admin("GET", "stat/getUserTodayRank", "V1\\Admin\\StatController@getUserTodayRank"),
  admin("GET", "stat/getOrder", "V1\\Admin\\StatController@getOrder"),
  admin("GET", "stat/getStatUser", "V1\\Admin\\StatController@getStatUser"),
  admin("GET", "stat/getRanking", "V1\\Admin\\StatController@getRanking"),
  admin("GET", "stat/getStatRecord", "V1\\Admin\\StatController@getStatRecord"),

  admin("GET", "notice/fetch", "V1\\Admin\\NoticeController@fetch"),
  admin("POST", "notice/save", "V1\\Admin\\NoticeController@save"),
  admin("POST", "notice/update", "V1\\Admin\\NoticeController@update"),
  admin("POST", "notice/drop", "V1\\Admin\\NoticeController@drop"),
  admin("POST", "notice/show", "V1\\Admin\\NoticeController@show"),

  admin("GET", "ticket/fetch", "V1\\Admin\\TicketController@fetch"),
  admin("POST", "ticket/reply", "V1\\Admin\\TicketController@reply"),
  admin("POST", "ticket/close", "V1\\Admin\\TicketController@close"),

  admin("GET", "coupon/fetch", "V1\\Admin\\CouponController@fetch"),
  admin("POST", "coupon/generate", "V1\\Admin\\CouponController@generate"),
  admin("POST", "coupon/drop", "V1\\Admin\\CouponController@drop"),
  admin("POST", "coupon/show", "V1\\Admin\\CouponController@show"),

  admin("GET", "giftcard/fetch", "V1\\Admin\\GiftcardController@fetch"),
  admin("POST", "giftcard/generate", "V1\\Admin\\GiftcardController@generate"),
  admin("POST", "giftcard/drop", "V1\\Admin\\GiftcardController@drop"),

  admin("GET", "knowledge/fetch", "V1\\Admin\\KnowledgeController@fetch"),
  admin("GET", "knowledge/getCategory", "V1\\Admin\\KnowledgeController@getCategory"),
  admin("POST", "knowledge/save", "V1\\Admin\\KnowledgeController@save"),
  admin("POST", "knowledge/show", "V1\\Admin\\KnowledgeController@show"),
  admin("POST", "knowledge/drop", "V1\\Admin\\KnowledgeController@drop"),
  admin("POST", "knowledge/sort", "V1\\Admin\\KnowledgeController@sort"),

  admin("GET", "payment/fetch", "V1\\Admin\\PaymentController@fetch"),
  admin("GET", "payment/getPaymentMethods", "V1\\Admin\\PaymentController@getPaymentMethods"),
  admin("POST", "payment/getPaymentForm", "V1\\Admin\\PaymentController@getPaymentForm"),
  admin("POST", "payment/save", "V1\\Admin\\PaymentController@save"),
  admin("POST", "payment/drop", "V1\\Admin\\PaymentController@drop"),
  admin("POST", "payment/show", "V1\\Admin\\PaymentController@show"),
  admin("POST", "payment/sort", "V1\\Admin\\PaymentController@sort"),

  admin("GET", "system/getSystemStatus", "V1\\Admin\\SystemController@getSystemStatus"),
  admin("GET", "system/getQueueStats", "V1\\Admin\\SystemController@getQueueStats"),
  admin("GET", "system/getQueueWorkload", "V1\\Admin\\SystemController@getQueueWorkload"),
  admin("GET", "system/getQueueMasters", "Laravel\\Horizon\\Http\\Controllers\\MasterSupervisorController@index"),
  admin("GET", "system/getSystemLog", "V1\\Admin\\SystemController@getSystemLog"),

  admin("GET", "theme/getThemes", "V1\\Admin\\ThemeController@getThemes"),
  admin("POST", "theme/saveThemeConfig", "V1\\Admin\\ThemeController@saveThemeConfig"),
  admin("POST", "theme/getThemeConfig", "V1\\Admin\\ThemeController@getThemeConfig"),

  route("POST", "passport", "passport/auth/register", "V1\\Passport\\AuthController@register"),
  route("GET", "passport", "passport/auth/register", "V1\\Passport\\AuthController@register"),
  route("POST", "passport", "passport/auth/login", "V1\\Passport\\AuthController@login"),
  route("GET", "passport", "passport/auth/token2Login", "V1\\Passport\\AuthController@token2Login"),
  route("POST", "passport", "passport/auth/forget", "V1\\Passport\\AuthController@forget"),
  route("POST", "passport", "passport/auth/getQuickLoginUrl", "V1\\Passport\\AuthController@getQuickLoginUrl"),
  route("POST", "passport", "passport/comm/sendEmailVerify", "V1\\Passport\\CommController@sendEmailVerify"),
  route("POST", "passport", "passport/comm/pv", "V1\\Passport\\CommController@pv"),

  route("GET", "client", "client/subscribe", "V1\\Client\\ClientController@subscribe"),
  route("GET", "client", "client/app/getConfig", "V1\\Client\\AppController@getConfig"),
  route("GET", "client", "client/app/getVersion", "V1\\Client\\AppController@getVersion"),

  route("POST", "guest", "guest/telegram/webhook", "V1\\Guest\\TelegramController@webhook"),
  route("ANY", "guest", "guest/payment/notify/:method/:uuid", "V1\\Guest\\PaymentController@notify"),
  route("GET", "guest", "guest/comm/config", "V1\\Guest\\CommController@config"),

  route("GET", "staff", "staff/ticket/fetch", "V1\\Staff\\TicketController@fetch"),
  route("POST", "staff", "staff/ticket/reply", "V1\\Staff\\TicketController@reply"),
  route("POST", "staff", "staff/ticket/close", "V1\\Staff\\TicketController@close"),
  route("POST", "staff", "staff/user/update", "V1\\Staff\\UserController@update"),
  route("GET", "staff", "staff/user/getUserInfoById", "V1\\Staff\\UserController@getUserInfoById"),
  route("POST", "staff", "staff/user/sendMail", "V1\\Staff\\UserController@sendMail"),
  route("POST", "staff", "staff/user/ban", "V1\\Staff\\UserController@ban"),
  route("GET", "staff", "staff/plan/fetch", "V1\\Staff\\PlanController@fetch"),
  route("GET", "staff", "staff/notice/fetch", "V1\\Admin\\NoticeController@fetch"),
  route("POST", "staff", "staff/notice/save", "V1\\Admin\\NoticeController@save"),
  route("POST", "staff", "staff/notice/update", "V1\\Admin\\NoticeController@update"),
  route("POST", "staff", "staff/notice/drop", "V1\\Admin\\NoticeController@drop"),

  route("GET", "user", "user/unbindTelegram", "V1\\User\\UserController@unbindTelegram"),
  route("GET", "user", "user/resetSecurity", "V1\\User\\UserController@resetSecurity"),
  route("GET", "user", "user/info", "V1\\User\\UserController@info"),
  route("POST", "user", "user/newPeriod", "V1\\User\\UserController@newPeriod"),
  route("POST", "user", "user/redeemgiftcard", "V1\\User\\UserController@redeemgiftcard"),
  route("POST", "user", "user/changePassword", "V1\\User\\UserController@changePassword"),
  route("POST", "user", "user/update", "V1\\User\\UserController@update"),
  route("GET", "user", "user/getSubscribe", "V1\\User\\UserController@getSubscribe"),
  route("GET", "user", "user/getStat", "V1\\User\\UserController@getStat"),
  route("GET", "user", "user/checkLogin", "V1\\User\\UserController@checkLogin"),
  route("POST", "user", "user/transfer", "V1\\User\\UserController@transfer"),
  route("POST", "user", "user/getQuickLoginUrl", "V1\\User\\UserController@getQuickLoginUrl"),
  route("GET", "user", "user/getActiveSession", "V1\\User\\UserController@getActiveSession"),
  route("POST", "user", "user/removeActiveSession", "V1\\User\\UserController@removeActiveSession"),
  route("POST", "user", "user/order/save", "V1\\User\\OrderController@save"),
  route("POST", "user", "user/order/checkout", "V1\\User\\OrderController@checkout"),
  route("GET", "user", "user/order/check", "V1\\User\\OrderController@check"),
  route("GET", "user", "user/order/detail", "V1\\User\\OrderController@detail"),
  route("GET", "user", "user/order/fetch", "V1\\User\\OrderController@fetch"),
  route("GET", "user", "user/order/getPaymentMethod", "V1\\User\\OrderController@getPaymentMethod"),
  route("POST", "user", "user/order/cancel", "V1\\User\\OrderController@cancel"),
  route("GET", "user", "user/plan/fetch", "V1\\User\\PlanController@fetch"),
  route("GET", "user", "user/invite/save", "V1\\User\\InviteController@save"),
  route("GET", "user", "user/invite/fetch", "V1\\User\\InviteController@fetch"),
  route("GET", "user", "user/invite/details", "V1\\User\\InviteController@details"),
  route("GET", "user", "user/notice/fetch", "V1\\User\\NoticeController@fetch"),
  route("GET", "user", "user/tutorial/fetch", "V1\\User\\TutorialController@fetch"),
  route("POST", "user", "user/ticket/reply", "V1\\User\\TicketController@reply"),
  route("POST", "user", "user/ticket/close", "V1\\User\\TicketController@close"),
  route("POST", "user", "user/ticket/save", "V1\\User\\TicketController@save"),
  route("GET", "user", "user/ticket/fetch", "V1\\User\\TicketController@fetch"),
  route("POST", "user", "user/ticket/withdraw", "V1\\User\\TicketController@withdraw"),
  route("GET", "user", "user/server/fetch", "V1\\User\\ServerController@fetch"),
  route("POST", "user", "user/coupon/check", "V1\\User\\CouponController@check"),
  route("GET", "user", "user/telegram/getBotInfo", "V1\\User\\TelegramController@getBotInfo"),
  route("GET", "user", "user/comm/config", "V1\\User\\CommController@config"),
  route("POST", "user", "user/comm/getStripePublicKey", "V1\\User\\CommController@getStripePublicKey"),
  route("GET", "user", "user/knowledge/fetch", "V1\\User\\KnowledgeController@fetch"),
  route("GET", "user", "user/knowledge/getCategory", "V1\\User\\KnowledgeController@getCategory"),
  route("GET", "user", "user/stat/getTrafficLog", "V1\\User\\StatController@getTrafficLog"),

  route("ANY", "server", "server/uniproxy/user", "V1\\Server\\UniProxyController@user"),
  route("ANY", "server", "server/uniproxy/push", "V1\\Server\\UniProxyController@push"),
  route("ANY", "server", "server/uniproxy/alivelist", "V1\\Server\\UniProxyController@alivelist"),
  route("ANY", "server", "server/uniproxy/alive", "V1\\Server\\UniProxyController@alive"),
  route("ANY", "server", "server/uniproxy/config", "V1\\Server\\UniProxyController@config"),
  route("ANY", "server", "server/UniProxy/user", "V1\\Server\\UniProxyController@user"),
  route("ANY", "server", "server/UniProxy/push", "V1\\Server\\UniProxyController@push"),
  route("ANY", "server", "server/UniProxy/alivelist", "V1\\Server\\UniProxyController@alivelist"),
  route("ANY", "server", "server/UniProxy/alive", "V1\\Server\\UniProxyController@alive"),
  route("ANY", "server", "server/UniProxy/config", "V1\\Server\\UniProxyController@config"),
  route("ANY", "server", "server/shadowsockstidalab/user", "V1\\Server\\ShadowsocksTidalabController@user"),
  route("ANY", "server", "server/shadowsockstidalab/submit", "V1\\Server\\ShadowsocksTidalabController@submit"),
  route("ANY", "server", "server/ShadowsocksTidalab/user", "V1\\Server\\ShadowsocksTidalabController@user"),
  route("ANY", "server", "server/ShadowsocksTidalab/submit", "V1\\Server\\ShadowsocksTidalabController@submit"),
  route("ANY", "server", "server/config", "V2\\Server\\ServerController@config")
];

export const ACTIVE_LEGACY_API_ROUTES = LEGACY_API_ROUTES.filter(
  (routeItem) => routeItem.active
);

export const REMOVED_PROTOCOL_API_ROUTES = LEGACY_API_ROUTES.filter(
  (routeItem) => !routeItem.active
);

export const ACTIVE_LEGACY_GET_ROUTES = ACTIVE_LEGACY_API_ROUTES.filter(
  (routeItem) => routeItem.method === "GET"
).map((routeItem) => routeItem.path);

export const ACTIVE_LEGACY_POST_ROUTES = ACTIVE_LEGACY_API_ROUTES.filter(
  (routeItem) => routeItem.method === "POST"
).map((routeItem) => routeItem.path);

export const ACTIVE_LEGACY_ANY_ROUTES = ACTIVE_LEGACY_API_ROUTES.filter(
  (routeItem) => routeItem.method === "ANY"
).map((routeItem) => routeItem.path);
