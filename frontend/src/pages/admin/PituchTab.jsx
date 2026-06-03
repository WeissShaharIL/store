import { useState } from "react";
import { PaletteColorsProvider } from "./PaletteContext.jsx";
import { HandlesProvider } from "./HandlesContext.jsx";
import DevClosetBuilder from "./DevClosetBuilder.jsx";
import DevClosetGallery from "./DevClosetGallery.jsx";
import PalettesEditor from "./PalettesEditor.jsx";
import HandlesEditor from "./HandlesEditor.jsx";
import ComponentPricesTab from "./ComponentPricesTab.jsx";
import CustomClosetConfigTab from "./CustomClosetConfigTab.jsx";
import "./AdminTab.css";

/**
 * "פיתוח ארונות" — unified admin section that bundles:
 *   1. בונה  — DevClosetBuilder (model authoring)
 *   2. גלריה — DevClosetGallery (ready-model preview)
 *   3. צבעים — ColorsTab (palette management)
 *   4. ידיות — HandlesTab (handle catalog)
 *
 * PaletteColorsProvider + HandlesProvider wrap the entire section
 * so ClosetFromConfig inside the builder and gallery can read the
 * live palette / handles without prop-drilling.
 */

const SUB_TABS = [
  { id: "builder",  label: "בונה" },
  { id: "gallery",  label: "גלריה" },
  { id: "colors",   label: "צבעים" },
  { id: "handles",  label: "ידיות" },
  { id: "prices",   label: "מחירי רכיבים" },
  { id: "custom",   label: "ארון בהתאמה אישית" },
];

export default function PituchTab() {
  const [activeTab, setActiveTab] = useState("builder");

  return (
    <PaletteColorsProvider>
      <HandlesProvider>
        <div className="pituch-tab">
          <nav className="pituch-tab__nav">
            {SUB_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={
                  "pituch-tab__nav-btn" +
                  (activeTab === t.id ? " pituch-tab__nav-btn--active" : "")
                }
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="pituch-tab__content">
            {activeTab === "builder"  && <DevClosetBuilder />}
            {activeTab === "gallery"  && <DevClosetGallery />}
            {activeTab === "colors"   && <PalettesEditor />}
            {activeTab === "handles"  && <HandlesEditor />}
            {activeTab === "prices"   && <ComponentPricesTab />}
            {activeTab === "custom"   && <CustomClosetConfigTab />}
          </div>
        </div>
      </HandlesProvider>
    </PaletteColorsProvider>
  );
}
