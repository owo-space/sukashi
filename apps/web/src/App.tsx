import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { LoginPage } from "@/pages/auth/Login";
import { RegisterPage } from "@/pages/auth/Register";
import { ForgetPage } from "@/pages/auth/Forget";
import { Placeholder } from "@/pages/Placeholder";

import { UserDashboardPage } from "@/pages/user/Dashboard";
import { UserPlanPage } from "@/pages/user/Plan";
import { UserPlanDetailPage } from "@/pages/user/PlanDetail";
import { UserOrderPage } from "@/pages/user/Order";
import { UserOrderDetailPage } from "@/pages/user/OrderDetail";
import { UserProfilePage } from "@/pages/user/Profile";
import { UserInvitePage } from "@/pages/user/Invite";
import { UserTicketPage } from "@/pages/user/Ticket";
import { UserTicketNewPage } from "@/pages/user/TicketNew";
import { UserTicketDetailPage } from "@/pages/user/TicketDetail";
import { UserKnowledgePage } from "@/pages/user/Knowledge";
import { UserKnowledgeDetailPage } from "@/pages/user/KnowledgeDetail";
import { UserNoticePage } from "@/pages/user/Notice";
import { UserTrafficPage } from "@/pages/user/Traffic";
import { UserNodePage } from "@/pages/user/Node";

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
        <Route path="/dashboard" element={<UserDashboardPage />} />
        <Route path="/plan" element={<UserPlanPage />} />
        <Route path="/plan/:id" element={<UserPlanDetailPage />} />
        <Route path="/order" element={<UserOrderPage />} />
        <Route path="/order/:tradeNo" element={<UserOrderDetailPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/invite" element={<UserInvitePage />} />
        <Route path="/node" element={<UserNodePage />} />
        <Route path="/ticket" element={<UserTicketPage />} />
        <Route path="/ticket/new" element={<UserTicketNewPage />} />
        <Route path="/ticket/:id" element={<UserTicketDetailPage />} />
        <Route path="/notice" element={<UserNoticePage />} />
        <Route path="/knowledge" element={<UserKnowledgePage />} />
        <Route path="/knowledge/:id" element={<UserKnowledgeDetailPage />} />
        <Route path="/traffic" element={<UserTrafficPage />} />
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
