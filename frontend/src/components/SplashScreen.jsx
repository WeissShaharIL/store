import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "../styles/splash.css";

const BRAND = "FORMA";

export default function SplashScreen() {
  const location = useLocation();
  const quick = location.pathname.startsWith("/admin");

  const HIDE_AT = quick ? 350  : 1800;
  const DONE_AT = quick ? 550  : 2100;

  const [stage, setStage] = useState("show");

  useEffect(() => {
    const t1 = setTimeout(() => setStage("hide"), HIDE_AT);
    const t2 = setTimeout(() => setStage("done"), DONE_AT);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [HIDE_AT, DONE_AT]);

  if (stage === "done") return null;

  return (
    <div className={`splash splash--${stage}`} aria-hidden="true">
      <div className="splash__inner">
        <div className="splash__wordmark">
          {[...BRAND].map((ch, i) => (
            <span
              key={i}
              className="splash__letter"
              style={{ animationDelay: quick ? "0ms" : `${i * 75}ms` }}
            >
              {ch}
            </span>
          ))}
        </div>
        <div className="splash__rule">
          <div className="splash__rule-fill" />
        </div>
        <p className="splash__tagline">ארונות מעוצבים</p>
      </div>
    </div>
  );
}
