import { useEffect, useState } from "react";

const HIDE_AT = 2200;
const DONE_AT = 2500;

const LETTERS = [
  { ch: "S", x:  669 },
  { ch: "I", x:  735 },
  { ch: "M", x:  812 },
  { ch: "P", x:  906 },
  { ch: "L", x:  981 },
  { ch: "E", x: 1056 },
];

export default function SplashScreen() {
  const [stage, setStage] = useState("show");

  useEffect(() => {
    const t1 = setTimeout(() => setStage("hide"), HIDE_AT);
    const t2 = setTimeout(() => setStage("done"), DONE_AT);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (stage === "done") return null;

  return (
    <div className={`splash splash--brand splash--${stage}`} aria-hidden>
      <svg
        className="splash__svg"
        viewBox="0 0 1200 540"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SIMPLE ארונות"
      >
        <defs>
          <linearGradient id="panel-purple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#5b258a" />
            <stop offset="100%" stopColor="#3e1660" />
          </linearGradient>
        </defs>

        <g className="splash__closet">
          <g className="splash__panel splash__panel--1">
            <polygon className="splash__door-face"
                     points="130,188 208,170 208,456 130,442" />
            <rect className="splash__handle" x="149" y="302" width="6" height="22" rx="2" />
          </g>
          <g className="splash__panel splash__panel--2">
            <polygon className="splash__door-face"
                     points="213,170 295,150 295,470 213,456" />
            <rect className="splash__handle" x="232" y="300" width="6" height="22" rx="2" />
          </g>
          <g className="splash__panel splash__panel--3">
            <polygon className="splash__door-face"
                     points="300,150 386,130 386,484 300,470" />
            <rect className="splash__handle" x="319" y="298" width="6" height="22" rx="2" />
          </g>
          <g className="splash__panel splash__panel--4">
            <polygon className="splash__door-face"
                     points="391,130 481,110 481,500 391,484" />
            <rect className="splash__handle" x="410" y="296" width="6" height="22" rx="2" />
          </g>
        </g>

        <line className="splash__divider"
              x1="525" y1="120" x2="525" y2="460" />

        <g className="splash__wordmark">
          {LETTERS.map((l, i) => (
            <text
              key={i}
              className="splash__letter"
              x={l.x}
              y="318"
              textAnchor="middle"
              style={{ animationDelay: `${800 + i * 60}ms` }}
            >
              {l.ch}
            </text>
          ))}
        </g>

        <line className="splash__caption-line splash__caption-line--l"
              x1="585" y1="392" x2="800" y2="392" />
        <line className="splash__caption-line splash__caption-line--r"
              x1="945" y1="392" x2="1160" y2="392" />
        <text className="splash__caption" x="872" y="402" textAnchor="middle">ארונות</text>
      </svg>
    </div>
  );
}
