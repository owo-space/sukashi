import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { LoginPage } from "@/pages/auth/Login";
import { RegisterPage } from "@/pages/auth/Register";
import { ForgetPage } from "@/pages/auth/Forget";
import { Placeholder } from "@/pages/Placeholder";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forget" element={<ForgetPage />} />

      <Route
        element={
          <ProtectedRoute>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Placeholder title="我的" />} />
        <Route path="/plan" element={<Placeholder title="订阅购买" />} />
        <Route path="/plan/:id" element={<Placeholder title="订阅详情" />} />
        <Route path="/order" element={<Placeholder title="订单查询" />} />
        <Route path="/order/:tradeNo" element={<Placeholder title="订单详情" />} />
        <Route path="/profile" element={<Placeholder title="个人中心" />} />
        <Route path="/invite" element={<Placeholder title="邀请返佣" />} />
        <Route path="/wallet" element={<Placeholder title="钱包" />} />
        <Route path="/ticket" element={<Placeholder title="工单系统" />} />
        <Route path="/ticket/new" element={<Placeholder title="新建工单" />} />
        <Route path="/ticket/:id" element={<Placeholder title="工单详情" />} />
        <Route path="/notice" element={<Placeholder title="公告" />} />
        <Route path="/knowledge" element={<Placeholder title="知识库" />} />
        <Route path="/knowledge/:id" element={<Placeholder title="知识库文章" />} />
        <Route path="/traffic" element={<Placeholder title="流量明细" />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Placeholder title="仪表盘" />} />
        <Route path="setting" element={<Placeholder title="系统配置" />} />
        <Route path="payment" element={<Placeholder title="支付配置" />} />
        <Route path="theme" element={<Placeholder title="主题配置" />} />
        <Route path="server" element={<Placeholder title="节点管理" />} />
        <Route path="server-group" element={<Placeholder title="权限组管理" />} />
        <Route path="server-route" element={<Placeholder title="路由管理" />} />
        <Route path="plan" element={<Placeholder title="订阅管理" />} />
        <Route path="order" element={<Placeholder title="订单管理" />} />
        <Route path="coupon" element={<Placeholder title="优惠券管理" />} />
        <Route path="giftcard" element={<Placeholder title="礼品卡管理" />} />
        <Route path="user" element={<Placeholder title="用户管理" />} />
        <Route path="notice" element={<Placeholder title="公告管理" />} />
        <Route path="ticket" element={<Placeholder title="工单管理" />} />
        <Route path="knowledge" element={<Placeholder title="知识库管理" />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
