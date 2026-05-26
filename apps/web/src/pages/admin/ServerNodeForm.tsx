import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Protocol } from "@/components/admin/protocols";

interface ServerGroup {
  id: number;
  name: string;
}
interface ServerRoute {
  id: number;
  remarks: string;
}

interface Props {
  mode: "create" | "edit";
  protocol: Protocol;
  initial?: Record<string, unknown>;
  groups: ServerGroup[];
  routes: ServerRoute[];
  onCancel: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  submitting?: boolean;
}

const NETWORK_OPTS = [
  { value: "tcp", label: "TCP" },
  { value: "ws", label: "WebSocket" },
  { value: "grpc", label: "gRPC" },
  { value: "http", label: "HTTP" },
  { value: "h2", label: "HTTP/2" }
];

const SS_CIPHERS = [
  "aes-128-gcm",
  "aes-256-gcm",
  "chacha20-ietf-poly1305",
  "2022-blake3-aes-128-gcm",
  "2022-blake3-aes-256-gcm",
  "2022-blake3-chacha20-poly1305"
];

function parseJSONField(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
function emitJSONField(text: string): unknown {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("无效的 JSON");
  }
}

export function ServerNodeForm({
  mode,
  protocol,
  initial = {},
  groups,
  routes,
  onCancel,
  onSubmit,
  submitting
}: Props) {
  const init = (k: string, fallback: unknown = "") => initial[k] ?? fallback;
  const [name, setName] = useState(String(init("name", "")));
  const [host, setHost] = useState(String(init("host", "")));
  const [port, setPort] = useState(String(init("port", "443")));
  const [serverPort, setServerPort] = useState(
    Number(init("server_port", initial.serverPort ?? 443))
  );
  const [rate, setRate] = useState(String(init("rate", "1")));
  const [show, setShow] = useState(Boolean(initial.show ?? 1));
  const [sort, setSort] = useState(String(initial.sort ?? ""));
  const [groupIds, setGroupIds] = useState<number[]>(
    Array.isArray(initial.group_id)
      ? (initial.group_id as number[])
      : typeof initial.group_id === "string"
        ? (() => {
            try {
              const p = JSON.parse(initial.group_id as string);
              return Array.isArray(p) ? p.map(Number) : [];
            } catch {
              return [];
            }
          })()
        : []
  );
  const [routeIds, setRouteIds] = useState<number[]>(
    Array.isArray(initial.route_id)
      ? (initial.route_id as number[])
      : typeof initial.route_id === "string"
        ? (() => {
            try {
              const p = JSON.parse(initial.route_id as string);
              return Array.isArray(p) ? p.map(Number) : [];
            } catch {
              return [];
            }
          })()
        : []
  );

  // protocol-specific state
  const [cipher, setCipher] = useState(String(init("cipher", "aes-256-gcm")));
  const [serverKey, setServerKey] = useState(String(init("server_key", "")));
  const [tls, setTls] = useState(String(initial.tls ?? "0"));
  const [tlsSettings, setTlsSettings] = useState(parseJSONField(initial.tls_settings));
  const [flow, setFlow] = useState(String(init("flow", "")));
  const [network, setNetwork] = useState(String(init("network", "tcp")));
  const [networkSettings, setNetworkSettings] = useState(
    parseJSONField(initial.network_settings)
  );
  const [encryption, setEncryption] = useState(String(init("encryption", "")));
  const [upMbps, setUpMbps] = useState(Number(initial.up_mbps ?? 0));
  const [downMbps, setDownMbps] = useState(Number(initial.down_mbps ?? 0));
  const [obfs, setObfs] = useState(String(init("obfs", "")));
  const [obfsPassword, setObfsPassword] = useState(String(init("obfs_password", "")));
  const [udpRelayMode, setUdpRelayMode] = useState(String(init("udp_relay_mode", "native")));
  const [zeroRtt, setZeroRtt] = useState(Boolean(initial.zero_rtt_handshake));
  const [congestion, setCongestion] = useState(String(init("congestion_control", "bbr")));
  const [disableSni, setDisableSni] = useState(Boolean(initial.disable_sni));
  const [paddingScheme, setPaddingScheme] = useState(parseJSONField(initial.padding_scheme));
  const [mieruSettings, setMieruSettings] = useState(parseJSONField(initial.mieru_settings));
  const [snellVersion, setSnellVersion] = useState(String(initial.snell_version ?? 4));

  function submit() {
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        host: host.trim(),
        port,
        server_port: serverPort,
        rate,
        show: show ? 1 : 0,
        sort: sort === "" ? null : Number(sort),
        protocol,
        group_id: groupIds.map(String),
        route_id: routeIds.map(String)
      };
      if (mode === "edit" && initial.id) payload.id = initial.id;

      // Sukad derives the per-protocol auth secret (psk / server_key /
       // auth_str / uuid:password / Trojan password) from each user's UUID
       // at connection time. The node-level password fields are intentionally
       // not exposed to the admin.
      switch (protocol) {
        case "shadowsocks":
          payload.cipher = cipher;
          payload.obfs = obfs || null;
          break;
        case "vless":
          payload.tls = Number(tls);
          payload.tls_settings = emitJSONField(tlsSettings);
          payload.flow = flow || null;
          payload.network = network;
          payload.network_settings = emitJSONField(networkSettings);
          payload.encryption = encryption || null;
          break;
        case "vmess":
          payload.tls = Number(tls);
          payload.tls_settings = emitJSONField(tlsSettings);
          payload.network = network;
          payload.network_settings = emitJSONField(networkSettings);
          break;
        case "trojan":
          payload.tls = Number(tls || 1);
          payload.tls_settings = emitJSONField(tlsSettings);
          payload.network = network;
          payload.network_settings = emitJSONField(networkSettings);
          break;
        case "hysteria2":
          payload.up_mbps = upMbps;
          payload.down_mbps = downMbps;
          payload.obfs = obfs || null;
          payload.obfs_password = obfsPassword || null;
          break;
        case "tuic":
          payload.udp_relay_mode = udpRelayMode;
          payload.congestion_control = congestion;
          payload.zero_rtt_handshake = zeroRtt ? 1 : 0;
          payload.disable_sni = disableSni ? 1 : 0;
          break;
        case "anytls":
          payload.padding_scheme = emitJSONField(paddingScheme);
          break;
        case "mieru":
          // Mieru auth + transport live entirely inside mieru_settings JSON;
          // the top-level server_key/network/cipher fields are ignored by the
          // node agent for this protocol.
          payload.mieru_settings = emitJSONField(mieruSettings);
          break;
        case "snell":
          // Sukad derives the Snell PSK per-user from the user's UUID at
          // runtime, so we don't expose a top-level psk/server_key field.
          payload.obfs = obfs || null;
          payload.obfs_password = obfsPassword || null;
          payload.snell_version = Number(snellVersion) || 4;
          break;
      }
      onSubmit(payload);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 pb-20">
        <Section title="基础信息">
          <Field label="节点名称" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如 AU 1" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="地址 (Host)" required>
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="1.2.3.4 或 hostname" />
            </Field>
            <Field label="对外端口" required>
              <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="443" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="内部端口" required>
              <Input
                type="number"
                value={serverPort || ""}
                onChange={(e) => setServerPort(Number(e.target.value))}
              />
            </Field>
            <Field label="倍率" required>
              <Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="1" />
            </Field>
          </div>
          <Field label="权限组">
            <MultiSelect
              options={groups.map((g) => ({ value: String(g.id), label: g.name }))}
              value={groupIds.map(String)}
              onChange={(vs) => setGroupIds(vs.map(Number))}
              placeholder="请选择"
            />
          </Field>
          <Field label="路由规则">
            <MultiSelect
              options={routes.map((r) => ({ value: String(r.id), label: r.remarks }))}
              value={routeIds.map(String)}
              onChange={(vs) => setRouteIds(vs.map(Number))}
              placeholder="不强制"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="排序">
              <Input
                type="number"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                placeholder="数字越大越靠前"
              />
            </Field>
            <Field label="对外显示">
              <Switch checked={show} onCheckedChange={setShow} />
            </Field>
          </div>
        </Section>

        <Section title="协议参数">
          {protocol === "shadowsocks" ? (
            <>
              <Field label="加密方式">
                <Select value={cipher} onValueChange={setCipher}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SS_CIPHERS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Obfs (混淆)">
                <Select value={obfs || "__none__"} onValueChange={(v) => setObfs(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="无" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无</SelectItem>
                    <SelectItem value="http">http</SelectItem>
                    <SelectItem value="tls">tls</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </>
          ) : null}

          {protocol === "vless" || protocol === "vmess" || protocol === "trojan" ? (
            <>
              <Field label="TLS">
                <Select value={tls} onValueChange={setTls}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">不启用</SelectItem>
                    <SelectItem value="1">TLS</SelectItem>
                    {protocol === "vless" ? <SelectItem value="2">Reality</SelectItem> : null}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="TLS Settings (JSON)">
                <Textarea
                  rows={3}
                  value={tlsSettings}
                  onChange={(e) => setTlsSettings(e.target.value)}
                  placeholder='{"server_name":"example.com","allow_insecure":false}'
                />
              </Field>
              {protocol === "vless" ? (
                <>
                  <Field label="Flow">
                    <Input value={flow} onChange={(e) => setFlow(e.target.value)} placeholder="xtls-rprx-vision" />
                  </Field>
                  <Field label="Encryption">
                    <Input
                      value={encryption}
                      onChange={(e) => setEncryption(e.target.value)}
                      placeholder="none / xchacha20-poly1305 ..."
                    />
                  </Field>
                </>
              ) : null}
              <Field label="传输协议">
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NETWORK_OPTS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="传输协议设置 (JSON)">
                <Textarea
                  rows={3}
                  value={networkSettings}
                  onChange={(e) => setNetworkSettings(e.target.value)}
                  placeholder='{"path":"/ws","host":"example.com"}'
                />
              </Field>
            </>
          ) : null}

          {protocol === "hysteria2" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="上行 Mbps">
                  <Input
                    type="number"
                    value={upMbps || ""}
                    onChange={(e) => setUpMbps(Number(e.target.value))}
                  />
                </Field>
                <Field label="下行 Mbps">
                  <Input
                    type="number"
                    value={downMbps || ""}
                    onChange={(e) => setDownMbps(Number(e.target.value))}
                  />
                </Field>
              </div>
              <Field label="Obfs">
                <Select value={obfs || "__none__"} onValueChange={(v) => setObfs(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="无" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无</SelectItem>
                    <SelectItem value="salamander">salamander</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {obfs ? (
                <Field label="Obfs 密码">
                  <Input value={obfsPassword} onChange={(e) => setObfsPassword(e.target.value)} />
                </Field>
              ) : null}
            </>
          ) : null}

          {protocol === "tuic" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="UDP 中继">
                  <Select value={udpRelayMode} onValueChange={setUdpRelayMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="native">native</SelectItem>
                      <SelectItem value="quic">quic</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="拥塞控制">
                  <Select value={congestion} onValueChange={setCongestion}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bbr">bbr</SelectItem>
                      <SelectItem value="cubic">cubic</SelectItem>
                      <SelectItem value="new_reno">new_reno</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="0-RTT 握手">
                  <Switch checked={zeroRtt} onCheckedChange={setZeroRtt} />
                </Field>
                <Field label="禁用 SNI">
                  <Switch checked={disableSni} onCheckedChange={setDisableSni} />
                </Field>
              </div>
            </>
          ) : null}

          {protocol === "anytls" ? (
            <>
              <Field label="Padding Scheme (JSON, 留空使用默认)">
                <Textarea
                  rows={6}
                  value={paddingScheme}
                  onChange={(e) => setPaddingScheme(e.target.value)}
                />
              </Field>
            </>
          ) : null}

          {protocol === "mieru" ? (
            <>
              <Field label="Mieru Settings (JSON, 留空使用默认 port_bindings)">
                <Textarea
                  rows={8}
                  value={mieruSettings}
                  onChange={(e) => setMieruSettings(e.target.value)}
                  placeholder='{"mtu":0,"port_bindings":[{"port":443,"protocol":"TCP"}],"user_hint_is_mandatory":false}'
                />
              </Field>
            </>
          ) : null}

          {protocol === "snell" ? (
            <>
              <Field label="Snell 版本">
                <Select value={snellVersion} onValueChange={setSnellVersion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">v3</SelectItem>
                    <SelectItem value="4">v4 (常见)</SelectItem>
                    <SelectItem value="5">v5 (最新)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Obfs">
                <Select value={obfs || "__none__"} onValueChange={(v) => setObfs(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="无" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无</SelectItem>
                    <SelectItem value="http">http</SelectItem>
                    <SelectItem value="tls">tls</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {obfs ? (
                <Field label="Obfs Host">
                  <Input value={obfsPassword} onChange={(e) => setObfsPassword(e.target.value)} />
                </Field>
              ) : null}
            </>
          ) : null}
        </Section>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 border-t bg-white px-6 py-3">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "保存中…" : "提交"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-slate-700 border-b border-slate-200 pb-2">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function MultiSelect({
  options,
  value,
  onChange,
  placeholder
}: {
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded border border-input p-2">
      {options.length === 0 ? (
        <span className="text-xs text-muted-foreground">{placeholder ?? "无可选项"}</span>
      ) : (
        options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={value.includes(opt.value)}
              onCheckedChange={(c) => {
                if (c) onChange([...value, opt.value]);
                else onChange(value.filter((v) => v !== opt.value));
              }}
            />
            {opt.label}
          </label>
        ))
      )}
    </div>
  );
}
