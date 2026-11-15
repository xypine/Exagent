import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
} from "remotion";

import logo from "../../../frontend/public/logo.svg";

const navy = "#0b1b3f";
const line = "#dce1f0";
const muted = "#5a6685";
const star = "#4338ca";
const sans = "Inter, ui-sans-serif, system-ui, sans-serif";
const serif = "Instrument Serif, Georgia, serif";

const easeIn = (frame: number, start: number, length = 16) =>
  interpolate(frame, [start, start + length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
const easeOut = (frame: number, end: number, length = 14) =>
  interpolate(frame, [end - length, end], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

const trees = Array.from({ length: 38 }, (_, index) => {
  const row = Math.floor(index / 8);
  const column = index % 8;
  return {
    index,
    x: 7 + column * 12.6 + ((row * 17) % 9),
    y: 16 + row * 16 + ((column * 13) % 7),
    scale: 0.55 + row * 0.13 + (index % 3) * 0.06,
  };
});

function Header() {
  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        top: 44,
        display: "flex",
        alignItems: "center",
        gap: 9,
        color: navy,
        fontFamily: sans,
        fontSize: 24,
        fontWeight: 700,
        letterSpacing: -1.2,
        zIndex: 4,
      }}
    >
      <Img src={logo} style={{ width: 35, height: 35 }} />
      Exagent
    </div>
  );
}

function Gem({
  x,
  y,
  label,
  local,
  delay,
}: {
  x: number;
  y: number;
  label: string;
  local: number;
  delay: number;
}) {
  const reveal = easeIn(local, delay, 15);
  const glow = 0.5 + Math.sin((local + delay) / 11) * 0.24;
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${0.75 + reveal * 0.25})`,
        opacity: reveal,
        zIndex: 3,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          transform: "rotate(45deg)",
          background: "linear-gradient(135deg, #8d7cff, #4338ca)",
          boxShadow: `0 0 0 7px rgb(67 56 202 / ${0.1 + glow * 0.12}), 0 12px 24px -10px rgb(67 56 202 / .8)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 41,
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          border: `1px solid ${line}`,
          borderRadius: 999,
          padding: "6px 10px",
          background: "rgb(255 255 255 / .92)",
          color: navy,
          fontFamily: sans,
          fontSize: 13,
          fontWeight: 700,
          boxShadow: "0 10px 22px -17px rgb(11 27 63 / .55)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/** An abstract, unmapped field of employer gems: intriguing, but not a route yet. */
export function OpportunityLandscape({
  from,
  duration,
}: {
  from: number;
  duration: number;
}) {
  const frame = useCurrentFrame();
  const local = frame - from;
  const inView = easeIn(local, 0, 12);
  const outView = easeOut(local, duration, 12);
  const copy = easeIn(local, 12, 18);
  const field = easeIn(local, 20, 18);
  const searching = easeIn(local, 48, 20);
  const opacity = inView * outView;

  const page: CSSProperties = {
    background:
      "radial-gradient(54rem 36rem at 79% 20%, rgb(67 56 202 / .18), transparent 66%), radial-gradient(38rem 26rem at 8% 88%, rgb(30 58 138 / .11), transparent 70%), linear-gradient(180deg, #ffffff 0%, #f4f6fb 100%)",
    color: navy,
    fontFamily: sans,
    opacity,
    overflow: "hidden",
  };

  return (
    <AbsoluteFill style={page}>
      <Header />
      <div
        style={{
          position: "absolute",
          left: 128,
          top: 205,
          width: 600,
          opacity: copy,
          transform: `translateY(${(1 - copy) * 24}px)`,
          zIndex: 4,
        }}
      >
        <div style={{ color: star, fontFamily: serif, fontSize: 29, fontStyle: "italic" }}>
          Look beyond the posting.
        </div>
        <h2
          style={{
            margin: "17px 0 19px",
            fontSize: 74,
            fontWeight: 700,
            letterSpacing: -4.2,
            lineHeight: 0.97,
          }}
        >
          The opportunity may be <span style={{ color: star }}>elsewhere.</span>
        </h2>
        <p style={{ margin: 0, color: muted, fontSize: 22, lineHeight: 1.44 }}>
          There are companies worth exploring—without a map to reach them.
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          left: 790,
          right: 58,
          top: 126,
          bottom: 72,
          border: "1px solid rgb(67 56 202 / .17)",
          borderRadius: 36,
          background:
            "linear-gradient(160deg, rgb(255 255 255 / .9), rgb(232 236 251 / .82))",
          boxShadow: "0 30px 70px -34px rgb(30 58 138 / .42)",
          opacity: field,
          overflow: "hidden",
          transform: `perspective(1700px) rotateY(${-4 + field * 4}deg) translateY(${(1 - field) * 28}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgb(67 56 202 / .04) 1px, transparent 1px), linear-gradient(90deg, rgb(67 56 202 / .04) 1px, transparent 1px)",
            backgroundSize: "58px 58px",
          }}
        />
        <div style={{ position: "absolute", left: 37, top: 32, color: muted, fontSize: 14, fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase" }}>
          Unmapped companies
        </div>
        {trees.map((tree) => {
          const sway = Math.sin(local / 15 + tree.index * 1.7) * 7;
          return (
            <div
              key={tree.index}
              style={{
                position: "absolute",
                left: `${tree.x}%`,
                top: `${tree.y}%`,
                width: 78,
                height: 152,
                opacity: 0.19 + (tree.index % 4) * 0.045,
                transform: `translate(-50%, -50%) scale(${tree.scale}) rotate(${sway / 12}deg)`,
                transformOrigin: "50% 100%",
              }}
            >
              <div style={{ position: "absolute", bottom: 0, left: 34, width: 11, height: 76, borderRadius: 8, background: "#1e3a8a" }} />
              <div style={{ position: "absolute", left: 0, top: 0, width: 78, height: 98, borderRadius: "55% 55% 47% 47%", background: "linear-gradient(145deg, #8c9de8, #273f99)" }} />
            </div>
          );
        })}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.78 }}>
          <path
            d="M 50 91 C 45 76, 63 67, 52 54 S 28 36, 53 16"
            fill="none"
            stroke="#4338ca"
            strokeDasharray="1.3 2.6"
            strokeWidth="0.34"
            pathLength="1"
            strokeDashoffset={1 - searching * 0.33}
            opacity={searching * 0.55}
          />
        </svg>
        <Gem x={64} y={29} label="Dream Company" local={local} delay={42} />
        <Gem x={30} y={60} label="Orbit Labs" local={local} delay={55} />
        <Gem x={78} y={70} label="Northstar" local={local} delay={65} />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 39,
            transform: `translateX(-50%) scale(${0.78 + searching * 0.22})`,
            opacity: searching,
            width: 70,
            height: 70,
            borderRadius: "50%",
            background: "#fff",
            border: "3px solid #4338ca",
            display: "grid",
            placeItems: "center",
            color: star,
            fontSize: 13,
            fontWeight: 850,
            boxShadow: "0 0 0 10px rgb(67 56 202 / .1)",
          }}
        >
          YOU
        </div>
      </div>
    </AbsoluteFill>
  );
}
