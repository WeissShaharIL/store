import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { PaletteColorsProvider } from "./pages/admin/PaletteContext.jsx";
import { HandlesProvider } from "./pages/admin/HandlesContext.jsx";
import App from "./App.jsx";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/forms.css";
import "./styles/panels.css";
import "./styles/tabs.css";
import "./styles/catalog.css";
import "./styles/chat.css";
import "./styles/orders.css";
import "./styles/splash.css";
import "./styles/announcements.css";
import "./styles/install.css";
import "./styles/showroom/05-designer.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <PaletteColorsProvider>
            <HandlesProvider>
              <App />
            </HandlesProvider>
          </PaletteColorsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
