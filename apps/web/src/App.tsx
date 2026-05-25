import {
  ClusterOutlined,
  DashboardOutlined,
  DollarOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TeamOutlined
} from "@ant-design/icons";
import ProLayout, { type MenuDataItem } from "@ant-design/pro-layout";
import { Card, Col, Row, Statistic, Table, Tag } from "antd";
import { RETAINED_NODE_PROTOCOLS } from "@sukashi/shared";

const routes: MenuDataItem[] = [
  { path: "/", name: "仪表盘", icon: <DashboardOutlined /> },
  { path: "/users", name: "用户管理", icon: <TeamOutlined /> },
  { path: "/orders", name: "订单管理", icon: <ShoppingCartOutlined /> },
  { path: "/servers", name: "节点管理", icon: <ClusterOutlined /> },
  { path: "/payments", name: "支付配置", icon: <DollarOutlined /> },
  { path: "/settings", name: "系统设置", icon: <SettingOutlined /> }
];

const serverColumns = [
  { title: "协议", dataIndex: "protocol", key: "protocol" },
  { title: "状态", dataIndex: "status", key: "status" },
  { title: "说明", dataIndex: "description", key: "description" }
];

const serverRows = RETAINED_NODE_PROTOCOLS.map((protocol) => ({
  key: protocol,
  protocol,
  status: <Tag color="blue">保留</Tag>,
  description: "SukaD 内部协议"
}));

export default function App() {
  return (
    <ProLayout
      title="Sukashi"
      logo={false}
      route={{ routes }}
      navTheme="light"
      layout="side"
      fixedHeader
      fixSiderbar
      menuItemRender={(item, dom) => dom}
    >
      <div className="page-container">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card bordered={false}>
              <Statistic title="TypeScript API" value="NestJS" />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card bordered={false}>
              <Statistic title="Database" value="PostgreSQL" />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card bordered={false}>
              <Statistic title="UI Target" value="Ant Design Pro" />
            </Card>
          </Col>
        </Row>

        <Card className="section-card" title="协议范围" bordered={false}>
          <Table
            columns={serverColumns}
            dataSource={serverRows}
            pagination={false}
            size="middle"
          />
        </Card>
      </div>
    </ProLayout>
  );
}
