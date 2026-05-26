import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserLayout } from "@/components/UserLayout";
import { AdminLayout } from "@/components/AdminLayout";

// Auth pages
import { LoginPage } from "@/pages/auth/Login";
import { RegisterPage } from "@/pages/auth/Register";
import { ForgetPage } from "@/pages/auth/Forget";

// User pages
import { DashboardPage } from "@/pages/user/Dashboard";
import { PlanPage } from "@/pages/user/Plan";
import { PlanDetailPage } from "@/pages/user/PlanDetail";
import { OrderPage } from "@/pages/user/Order";
import { OrderDetailPage } from "@/pages/user/OrderDetail";
import { ProfilePage } from "@/pages/user/Profile";
import { InvitePage } from "@/pages/user/Invite";
import { TicketPage } from "@/pages/user/Ticket";
import { TicketDetailPage } from "@/pages/user/TicketDetail";
import { TicketNewPage } from "@/pages/user/TicketNew";
import { KnowledgePage } from "@/pages/user/Knowledge";
import { KnowledgeDetailPage } from "@/pages/user/KnowledgeDetail";
import { NoticePage } from "@/pages/user/Notice";
import { TrafficPage } from "@/pages/user/Traffic";

// Admin pages
import { AdminDashboardPage } from "@/pages/admin/Dashboard";
import { AdminUserPage } from "@/pages/admin/User";
import { AdminPlanPage } from "@/pages/admin/Plan";
import { AdminServerPage } from "@/pages/admin/Server";
import { AdminServerGroupPage } from "@/pages/admin/ServerGroup";
import { AdminServerRoutePage } from "@/pages/admin/ServerRoute";
import { AdminThemePage } from "@/pages/admin/Theme";
import { AdminOrderPage } from "@/pages/admin/Order";
import { AdminPaymentPage } from "@/pages/admin/Payment";
import { AdminCouponPage } from "@/pages/admin/Coupon";
import { AdminGiftcardPage } from "@/pages/admin/Giftcard";
import { AdminTicketPage } from "@/pages/admin/Ticket";
import { AdminKnowledgePage } from "@/pages/admin/Knowledge";
import { AdminNoticePage } from "@/pages/admin/Notice";
import { AdminSettingPage } from "@/pages/admin/Setting";

export function App() {
  return (
    <Routes>
      {/* Public auth pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forget" element={<ForgetPage />} />

      {/* User app */}
      <Route
        element={
          <ProtectedRoute>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/plan/:id" element={<PlanDetailPage />} />
        <Route path="/order" element={<OrderPage />} />
        <Route path="/order/:tradeNo" element={<OrderDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/invite" element={<InvitePage />} />
        <Route path="/ticket" element={<TicketPage />} />
        <Route path="/ticket/new" element={<TicketNewPage />} />
        <Route path="/ticket/:id" element={<TicketDetailPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/knowledge/:id" element={<KnowledgeDetailPage />} />
        <Route path="/notice" element={<NoticePage />} />
        <Route path="/traffic" element={<TrafficPage />} />
      </Route>

      {/* Admin app */}
      <Route
        element={
          <ProtectedRoute adminOnly>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/user" element={<AdminUserPage />} />
        <Route path="/admin/plan" element={<AdminPlanPage />} />
        <Route path="/admin/server" element={<AdminServerPage />} />
        <Route path="/admin/server/group" element={<AdminServerGroupPage />} />
        <Route path="/admin/server/route" element={<AdminServerRoutePage />} />
        <Route path="/admin/theme" element={<AdminThemePage />} />
        <Route path="/admin/order" element={<AdminOrderPage />} />
        <Route path="/admin/payment" element={<AdminPaymentPage />} />
        <Route path="/admin/coupon" element={<AdminCouponPage />} />
        <Route path="/admin/giftcard" element={<AdminGiftcardPage />} />
        <Route path="/admin/ticket" element={<AdminTicketPage />} />
        <Route path="/admin/knowledge" element={<AdminKnowledgePage />} />
        <Route path="/admin/notice" element={<AdminNoticePage />} />
        <Route path="/admin/setting" element={<AdminSettingPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
