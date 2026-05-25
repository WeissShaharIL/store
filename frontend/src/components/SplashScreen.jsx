import { useEffect, useState } from "react";
import "../styles/splash.css";

const BRAND   = "FORMA";
const HIDE_AT = 1800;
const DONE_AT = 2100;

export default function SplashScreen() {
  const [stage, setStage] = useState("show");

  useEffect(() => {
    const t1 = setTimeout(() => setStage("hide"), HIDE_AT);
    const t2 = setTimeout(() => setStage("done"), DONE_AT);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (stage === "done") return null;

  return (
    <div className={`splash splash--${stage}`} aria-hidden="true">
      <div className="splash__inner">
        <div className="splash__wordmark">
          {[...BRAND].map((ch, i) => (
            <span
              key={i}
              className="splash__letter"
              style={{ animationDelay: `${i * 75}ms` }}
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
