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
const signal = "#1e3a8a";
const star = "#4338ca";
const sans = "Inter, ui-sans-serif, system-ui, sans-serif";
const serif = "Instrument Serif, Georgia, serif";

const enter = (frame: number, at: number, duration = 15) =>
  interpolate(frame, [at, at + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
const leave = (frame: number, at: number, duration = 13) =>
  interpolate(frame, [at - duration, at], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

function Brand() {
  return (
    <div style={{ position: "absolute", left: 72, top: 44, zIndex: 5, display: "flex", alignItems: "center", gap: 9, color: navy, fontFamily: sans, fontSize: 24, fontWeight: 700, letterSpacing: -1.2 }}>
      <Img src={logo} style={{ width: 35, height: 35 }} /> Exagent
    </div>
  );
}

function MiniCard({
  local,
  delay,
  x,
  y,
  rotation,
  kind,
}: {
  local: number;
  delay: number;
  x: number;
  y: number;
  rotation: number;
  kind: "company" | "profile" | "note" | "message";
}) {
  const visible = enter(local, delay, 12);
  const wobble = Math.sin((local + delay) / 18) * 1.5;
  const content = {
    company: ["Dream Company", "Funding · product · team"],
    profile: ["Matti Meikäläinen", "CTO · public background"],
    note: ["Notes", "Who can open a conversation?"],
    message: ["Draft", "A thoughtful way in…"],
  }[kind];
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: kind === "note" ? 190 : 220,
        minHeight: 100,
        padding: "16px 17px",
        border: `1px solid ${kind === "note" ? "rgb(67 56 202 / .32)" : line}`,
        borderRadius: 16,
        background: kind === "note" ? "#f2efff" : "#fff",
        color: navy,
        boxShadow: "0 18px 30px -22px rgb(11 27 63 / .42)",
        transform: `translate(-50%, -50%) rotate(${rotation + wobble}deg) translateY(${(1 - visible) * 34}px) scale(${0.9 + visible * 0.1})`,
        opacity: visible,
        fontFamily: sans,
        zIndex: 3,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", color: muted, fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase" }}>
        <span>{kind === "company" ? "Company tab" : kind === "profile" ? "Profile tab" : kind}</span>
        <span style={{ color: star }}>↗</span>
      </div>
      <div style={{ marginTop: 11, fontSize: 16, fontWeight: 800 }}>{content[0]}</div>
      <div style={{ marginTop: 5, fontSize: 13, color: muted, lineHeight: 1.3 }}>{content[1]}</div>
      <div style={{ marginTop: 11, height: 4, width: kind === "message" ? "72%" : "52%", borderRadius: 99, background: "rgb(67 56 202 / .18)" }} />
    </div>
  );
}

/** A compact manual-research montage: work, not failure. */
export function ManualFriction({
  from,
  duration,
}: {
  from: number;
  duration: number;
}) {
  const frame = useCurrentFrame();
  const local = frame - from;
  const opacity = enter(local, 0, 10) * leave(local, duration, 12);
  const copy = enter(local, 10, 16);
  const browser = enter(local, 20, 16);
  const connecting = enter(local, 68, 22);
  const page: CSSProperties = {
    background:
      "radial-gradient(48rem 30rem at 87% 8%, rgb(67 56 202 / .14), transparent 70%), linear-gradient(180deg, #fff 0%, #f4f6fb 100%)",
    color: navy,
    fontFamily: sans,
    opacity,
    overflow: "hidden",
  };

  return (
    <AbsoluteFill style={page}>
      <Brand />
      <div style={{ position: "absolute", left: 128, top: 214, width: 590, opacity: copy, transform: `translateY(${(1 - copy) * 24}px)`, zIndex: 4 }}>
        <div style={{ color: star, fontFamily: serif, fontSize: 29, fontStyle: "italic" }}>The proactive route.</div>
        <h2 style={{ margin: "16px 0 20px", fontSize: 78, letterSpacing: -4.4, lineHeight: 0.96 }}>Finding it takes <span style={{ color: star }}>work.</span></h2>
        <p style={{ color: muted, margin: 0, fontSize: 22, lineHeight: 1.45 }}>Search companies. Open tabs. Research people. Compare what you find.</p>
      </div>
      <div
        style={{
          position: "absolute",
          left: 770,
          right: 66,
          top: 142,
          bottom: 94,
          borderRadius: 34,
          border: "1px solid rgb(67 56 202 / .2)",
          background: "linear-gradient(155deg, #ffffff, #edf0fb)",
          boxShadow: "0 30px 70px -35px rgb(30 58 138 / .42)",
          opacity: browser,
          overflow: "hidden",
          transform: `perspective(1900px) rotateY(${-5 + browser * 5}deg) translateY(${(1 - browser) * 28}px)`,
        }}
      >
        <div style={{ height: 50, display: "flex", alignItems: "center", gap: 9, padding: "0 22px", borderBottom: `1px solid ${line}`, background: "rgb(255 255 255 / .88)" }}>
          <span style={{ width: 11, height: 11, borderRadius: 99, background: "#c7cce0" }} />
          <span style={{ width: 11, height: 11, borderRadius: 99, background: "#c7cce0" }} />
          <span style={{ width: 11, height: 11, borderRadius: 99, background: "#c7cce0" }} />
          <div style={{ marginLeft: 12, height: 25, width: 186, borderRadius: 7, background: "#f0f2f8", color: muted, fontSize: 11, padding: "7px 10px", boxSizing: "border-box" }}>research in progress</div>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: "50px 0 0", width: "100%", height: "calc(100% - 50px)", pointerEvents: "none", opacity: connecting * 0.48 }}>
          <path d="M 24 26 C 38 34, 44 50, 51 54 S 71 61, 79 75" fill="none" stroke="#4338ca" strokeWidth="0.38" strokeDasharray="1.2 1.8" pathLength="1" strokeDashoffset={1 - connecting} />
          <path d="M 76 25 C 64 35, 62 45, 51 54 S 34 68, 27 76" fill="none" stroke="#1e3a8a" strokeWidth="0.28" strokeDasharray="1.2 1.8" pathLength="1" strokeDashoffset={1 - connecting} />
        </svg>
        <MiniCard local={local} delay={33} x={25} y={29} rotation={-7} kind="company" />
        <MiniCard local={local} delay={48} x={76} y={27} rotation={6} kind="profile" />
        <MiniCard local={local} delay={62} x={25} y={75} rotation={5} kind="note" />
        <MiniCard local={local} delay={78} x={76} y={75} rotation={-5} kind="message" />
        <div style={{ position: "absolute", left: "50%", top: "54%", width: 85, height: 85, transform: `translate(-50%, -50%) scale(${0.75 + connecting * 0.25})`, opacity: connecting, borderRadius: "50%", background: star, color: "#fff", display: "grid", placeItems: "center", textAlign: "center", fontSize: 12, lineHeight: 1.1, fontWeight: 800, boxShadow: "0 0 0 11px rgb(67 56 202 / .1)" }}>WHOM<br />TO<br />CONTACT?</div>
      </div>
    </AbsoluteFill>
  );
}
