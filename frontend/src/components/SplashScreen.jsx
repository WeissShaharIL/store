import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "../styles/splash.css";

const BRAND = "FORMA";

/**
 * Entry splash. Full mode (~3.2s) plays a carpentry scene: a wooden plank
 * drops in, a handsaw cuts it in half, the halves swing up to become the
 * closet's side panels, top/bottom/back join, the doors slide shut and the
 * handles pop — then the brand wordmark reveals underneath.
 *
 * Quick mode (admin routes / prefers-reduced-motion) keeps the old minimal
 * wordmark for ~350ms.
 */
export default function SplashScreen() {
  const location = useLocation();
  const quick =
    location.pathname.startsWith("/admin") ||
    (typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

  const HIDE_AT = quick ? 350 : 3250;
  const DONE_AT = quick ? 550 : 3700;

  const [stage, setStage] = useState("show");

  useEffect(() => {
    const t1 = setTimeout(() => setStage("hide"), HIDE_AT);
    const t2 = setTimeout(() => setStage("done"), DONE_AT);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [HIDE_AT, DONE_AT]);

  if (stage === "done") return null;

  const wordmark = (
    <div className="splash__wordmark">
      {[...BRAND].map((ch, i) => (
        <span
          key={i}
          className="splash__letter"
          style={{ animationDelay: quick ? "0ms" : `${2200 + i * 70}ms` }}
        >
          {ch}
        </span>
      ))}
    </div>
  );

  if (quick) {
    return (
      <div className={`splash splash--${stage}`} aria-hidden="true">
        <div className="splash__inner">
          {wordmark}
          <div className="splash__rule"><div className="splash__rule-fill" /></div>
          <p className="splash__tagline">ארונות מעוצבים</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`splash splash--intro splash--${stage}`} aria-hidden="true">
      <div className="splash__inner">
        <svg className="intro" viewBox="0 0 360 270" fill="none" aria-hidden="true">
          {/* Plank — two halves sharing the cut edge at x=180, so the seam
              reads as the carpenter's pencil mark the saw will follow. */}
          <g className="intro__plank">
            <g className="intro__half intro__half--left">
              <rect className="intro__wood" x="10" y="139" width="170" height="22" rx="2" />
              <line className="intro__grain" x1="28" y1="146" x2="118" y2="146" />
              <line className="intro__grain" x1="48" y1="154" x2="158" y2="154" />
            </g>
            <g className="intro__half intro__half--right">
              <rect className="intro__wood" x="180" y="139" width="170" height="22" rx="2" />
              <line className="intro__grain" x1="202" y1="146" x2="304" y2="146" />
              <line className="intro__grain" x1="226" y1="154" x2="332" y2="154" />
            </g>
          </g>

          {/* Kerf line that grows as the saw advances */}
          <rect className="intro__cut" x="178.8" y="138" width="2.4" height="24" rx="1.2" />

          {/* Sawdust */}
          <g>
            <circle className="intro__speck" style={{ "--dx": "-7px", "--fall": "20px", animationDelay: ".70s" }} cx="176.5" cy="163" r="1.6" />
            <circle className="intro__speck" style={{ "--dx": "4px",  "--fall": "16px", animationDelay: ".78s" }} cx="181"   cy="164" r="1.3" />
            <circle className="intro__speck" style={{ "--dx": "-3px", "--fall": "22px", animationDelay: ".86s" }} cx="179"   cy="163" r="1.5" />
            <circle className="intro__speck" style={{ "--dx": "7px",  "--fall": "18px", animationDelay: ".94s" }} cx="182.5" cy="164" r="1.4" />
            <circle className="intro__speck" style={{ "--dx": "-5px", "--fall": "17px", animationDelay: "1.02s" }} cx="177.5" cy="164" r="1.3" />
            <circle className="intro__speck" style={{ "--dx": "3px",  "--fall": "23px", animationDelay: "1.10s" }} cx="180.5" cy="163" r="1.6" />
          </g>

          {/* Carcass pieces that join the flown plank halves (the sides) */}
          <rect className="intro__wood intro__piece intro__piece--top" x="122" y="75" width="116" height="16" rx="2" />
          <rect className="intro__wood intro__piece intro__piece--bottom" x="122" y="229" width="116" height="16" rx="2" />
          <rect className="intro__back" x="122" y="91" width="116" height="138" />

          {/* Doors slide shut from the sides */}
          <g className="intro__door intro__door--left">
            <rect className="intro__doorpanel" x="102" y="77" width="77" height="166" rx="2" />
          </g>
          <g className="intro__door intro__door--right">
            <rect className="intro__doorpanel" x="181" y="77" width="77" height="166" rx="2" />
          </g>
          <rect className="intro__handle" style={{ animationDelay: "2.46s" }} x="170.5" y="146" width="3.5" height="28" rx="1.75" />
          <rect className="intro__handle" style={{ animationDelay: "2.54s" }} x="186" y="146" width="3.5" height="28" rx="1.75" />

          {/* Handsaw — static wrapper places it; inner group animates */}
          <g transform="translate(128 118)">
            <g className="intro__saw">
              <path
                className="intro__blade"
                d="M0,0 L100,0 L100,16 l-6.25,4 -6.25,-5 -6.25,4 -6.25,-5 -6.25,4 -6.25,-5 -6.25,4 -6.25,-5 -6.25,4 -6.25,-5 -6.25,4 -6.25,-5 -6.25,4 -6.25,-5 -6.25,4 -6.25,-5 Z"
              />
              <path
                className="intro__sawhandle"
                d="M100,0 C114,-7 128,-1 130,9 C131.5,17 126,25 116,27 L103,25 L100,16"
              />
              <ellipse className="intro__sawhole" cx="115" cy="11" rx="6.5" ry="5.5" />
            </g>
          </g>
        </svg>

        {wordmark}
        <div className="splash__rule"><div className="splash__rule-fill" /></div>
        <p className="splash__tagline">ארונות מעוצבים</p>
      </div>
    </div>
  );
}
