import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import ShowroomPage from "./pages/ShowroomPage.jsx";
import DisplaySalePage from "./pages/DisplaySalePage.jsx";
import CartPage from "./pages/CartPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import GuestPage from "./pages/GuestPage.jsx";
import CatalogPage from "./pages/CatalogPage.jsx";
import MyOrdersPage from "./pages/MyOrdersPage.jsx";
import MessagesPage from "./pages/MessagesPage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AnnouncementGate from "./components/AnnouncementGate.jsx";

export default function App() {
  return (
    <>
      <AnnouncementGate />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/showroom" element={<ShowroomPage />} />
        <Route path="/display-sale" element={<DisplaySalePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/guest" element={<GuestPage />} />
        <Route
          path="/catalog"
          element={
            <ProtectedRoute>
              <CatalogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <MyOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
