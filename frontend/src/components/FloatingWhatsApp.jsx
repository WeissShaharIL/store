import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getPublicSettings } from "../api.js";
import "../styles/landing/07-whatsapp.css";

export default function FloatingWhatsApp() {
  const [href, setHref] = useState(null);
  const { pathname } = useLocation();

  useEffect(() => {
    getPublicSettings()
      .then((s) => {
        const num = (s?.contact_whatsapp || "").trim();
        if (num) {
          const text = (s?.whatsapp_message || "").trim() || "שלום! אני מעוניין/ת לשמוע יותר על ארונות Forma";
          setHref(`https://wa.me/${num.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`);
        }
      })
      .catch(() => {});
  }, []);

  // Don't show on admin pages
  if (!href || pathname.startsWith("/admin")) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="landing-whatsapp"
      aria-label="צרו איתנו קשר בוואטסאפ"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path fill="currentColor" d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.687-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l.354.563-1.001 3.656 3.626-.974z"/>
        <path fill="currentColor" d="M9.536 5.685c-.222-.494-.456-.504-.668-.513l-.568-.007c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.876 1.213 3.074c.149.198 2.096 3.36 5.177 4.573 2.559 1.008 3.078.808 3.633.757.555-.05 1.79-.732 2.043-1.438.253-.706.253-1.31.177-1.438-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.668.149-.198.297-.768.967-.94 1.165-.174.198-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.762-1.652-2.06-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.297.297-.495.099-.198.05-.372-.025-.521-.075-.149-.652-1.62-.918-2.213z"/>
      </svg>
    </a>
  );
}
