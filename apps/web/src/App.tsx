import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { LoginPage } from "@/pages/auth/Login";
import { RegisterPage } from "@/pages/auth/Register";
import { ForgetPage } from "@/pages/auth/Forget";

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

import { AdminDashboardPage } from "@/pages/admin/Dashboard";
import { AdminUserPage } from "@/pages/admin/User";
import { AdminPlanPage } from "@/pages/admin/Plan";
import { AdminServerPage } from "@/pages/admin/Server";
import { AdminServerGroupPage } from "@/pages/admin/ServerGroup";
import { AdminServerRoutePage } from "@/pages/admin/ServerRoute";
import { AdminOrderPage } from "@/pages/admin/Order";
import { AdminPaymentPage } from "@/pages/admin/Payment";
import { AdminCouponPage } from "@/pages/admin/Coupon";
import { AdminGiftcardPage } from "@/pages/admin/Giftcard";
import { AdminTicketPage } from "@/pages/admin/Ticket";
import { AdminKnowledgePage } from "@/pages/admin/Knowledge";
import { AdminNoticePage } from "@/pages/admin/Notice";
import { AdminSettingPage } from "@/pages/admin/Setting";
import { AdminThemePage } from "@/pages/admin/Theme";

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
        <Route index element={<AdminDashboardPage />} />
        <Route path="setting" element={<AdminSettingPage />} />
        <Route path="payment" element={<AdminPaymentPage />} />
        <Route path="theme" element={<AdminThemePage />} />
        <Route path="server" element={<AdminServerPage />} />
        <Route path="server-group" element={<AdminServerGroupPage />} />
        <Route path="server-route" element={<AdminServerRoutePage />} />
        <Route path="plan" element={<AdminPlanPage />} />
        <Route path="order" element={<AdminOrderPage />} />
        <Route path="coupon" element={<AdminCouponPage />} />
        <Route path="giftcard" element={<AdminGiftcardPage />} />
        <Route path="user" element={<AdminUserPage />} />
        <Route path="notice" element={<AdminNoticePage />} />
        <Route path="ticket" element={<AdminTicketPage />} />
        <Route path="knowledge" element={<AdminKnowledgePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
