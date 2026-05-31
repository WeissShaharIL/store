import { Navigate, Route, Routes } from "react-router-dom";
import SplashScreen from "./components/SplashScreen.jsx";
import CookieConsent from "./components/CookieConsent.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import ShowroomPage from "./pages/ShowroomPage.jsx";
import DisplaySalePage from "./pages/DisplaySalePage.jsx";
import CartPage from "./pages/CartPage.jsx";
import GuestPage from "./pages/GuestPage.jsx";
import CatalogPage from "./pages/CatalogPage.jsx";
import MyOrdersPage from "./pages/MyOrdersPage.jsx";
import MessagesPage from "./pages/MessagesPage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminLoginGate from "./components/AdminLoginGate.jsx";
import AnnouncementGate from "./components/AnnouncementGate.jsx";
import InstallPrompt from "./components/InstallPrompt.jsx";

export default function App() {
  return (
    <>
      <SplashScreen />
      <AnnouncementGate />
      <CookieConsent />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/showroom" element={<ShowroomPage />} />
        <Route path="/display-sale" element={<DisplaySalePage />} />
        <Route path="/cart" element={<CartPage />} />
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
            <AdminLoginGate>
              <AdminDashboard />
            </AdminLoginGate>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallPrompt />
    </>
  );
}
