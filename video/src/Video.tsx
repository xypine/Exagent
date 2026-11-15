import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
} from "remotion";

import logo from "../../frontend/public/logo.svg";

import { ApplicantSea } from "./sections/ApplicantSea";
import { ManualFriction } from "./sections/ManualFriction";
import { OpportunityLandscape } from "./sections/OpportunityLandscape";
import { ProductFlow } from "./sections/ProductFlow";
import { scenes } from "./script";

const navy = "#0b1b3f";
const surface = "#ffffff";
const line = "#dce1f0";
const muted = "#5a6685";
const signal = "#1e3a8a";
const star = "#4338ca";
const sans = "Inter, ui-sans-serif, system-ui, sans-serif";
const serif = "Instrument Serif, Georgia, serif";
const appUrl = "https://exa.söis.fi";
const qrCode =
  "https://api.qrserver.com/v1/create-qr-code/?format=svg&size=360x360&data=https%3A%2F%2Fexa.s%C3%B6is.fi";

const enter = (frame: number, at: number, duration = 16) =>
  interpolate(frame, [at, at + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

function Brand({ size = 42 }: { size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size * 0.24,
        color: navy,
        fontFamily: sans,
        fontSize: size * 0.76,
        fontWeight: 750,
        letterSpacing: -size * 0.035,
      }}
    >
      <Img src={logo} style={{ width: size, height: size }} />
      Exagent
    </div>
  );
}

function Page({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background:
          "radial-gradient(58rem 30rem at 94% -8%, rgb(67 56 202 / .14), transparent 63%), radial-gradient(42rem 26rem at 4% 100%, rgb(30 58 138 / .09), transparent 68%), linear-gradient(180deg, #fff 0%, #f4f6fb 100%)",
        color: navy,
        fontFamily: sans,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

function LogoIntro() {
  const frame = useCurrentFrame();
  const local = frame - scenes.intro.from;
  const inView = spring({
    frame: Math.max(0, local),
    fps: 30,
    config: { damping: 16, stiffness: 130 },
  });
  const fadeOut = interpolate(local, [scenes.intro.duration - 10, scenes.intro.duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Page style={{ opacity: inView * fadeOut }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.6,
          backgroundImage:
            "linear-gradient(rgb(67 56 202 / .05) 1px, transparent 1px), linear-gradient(90deg, rgb(67 56 202 / .05) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "linear-gradient(to bottom, black, transparent 78%)",
        }}
      />
      <div
        style={{
          display: "grid",
          height: "100%",
          placeItems: "center",
          transform: `scale(${0.89 + inView * 0.11})`,
        }}
      >
        <Brand size={140} />
      </div>
    </Page>
  );
}

function Outcome() {
  const frame = useCurrentFrame();
  const local = frame - scenes.outcome.from;
  const inView = enter(local, 0, 15);
  const card = spring({
    frame: Math.max(0, local - 12),
    fps: 30,
    config: { damping: 17, stiffness: 115 },
  });
  const reason = enter(local, 48, 18);
  const fadeOut = interpolate(local, [scenes.outcome.duration - 12, scenes.outcome.duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Page style={{ opacity: inView * fadeOut }}>
      <div style={{ position: "absolute", left: 74, top: 45 }}>
        <Brand size={35} />
      </div>
      <div style={{ position: "absolute", left: 180, top: 168, width: 620 }}>
        <div style={{ color: star, fontFamily: serif, fontSize: 32, fontStyle: "italic" }}>
          A clearer next step.
        </div>
        <h2 style={{ margin: "15px 0 18px", fontSize: 69, letterSpacing: -4, lineHeight: 0.97 }}>
          Know who to <span style={{ color: star }}>contact first.</span>
        </h2>
        <p style={{ margin: 0, color: muted, fontSize: 23, lineHeight: 1.42 }}>
          Find the companies worth exploring, then focus your energy where it can matter.
        </p>
      </div>
      <div
        style={{
          position: "absolute",
          left: 900,
          right: 150,
          top: 192,
          bottom: 154,
          border: "1px solid rgb(67 56 202 / .38)",
          borderRadius: 29,
          background: surface,
          boxShadow: "0 3px 6px rgb(11 27 63 / .06), 0 32px 68px -29px rgb(30 58 138 / .38)",
          opacity: card,
          transform: `perspective(2000px) rotateY(${-3 + card * 3}deg) translateY(${(1 - card) * 28}px)`,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "28px 32px 22px", background: "linear-gradient(90deg, rgb(67 56 202 / .10), transparent)", borderBottom: `1px solid ${line}` }}>
          <div style={{ color: star, fontSize: 13, fontWeight: 850, letterSpacing: 1, textTransform: "uppercase" }}>Ranked contact</div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "start", justifyContent: "space-between" }}>
            <div><div style={{ fontSize: 35, fontWeight: 800, letterSpacing: -1.6 }}>Matti Meikäläinen</div><div style={{ marginTop: 5, color: muted, fontSize: 18 }}>CTO · Dream Company</div></div>
            <div style={{ width: 70, height: 70, borderRadius: "50%", display: "grid", placeItems: "center", background: "conic-gradient(#4338ca 92%, #e9edf7 0)", fontSize: 20, fontWeight: 850 }}><div style={{ width: 54, height: 54, borderRadius: "50%", display: "grid", placeItems: "center", background: surface }}>92</div></div>
          </div>
        </div>
        <div style={{ padding: "28px 32px" }}>
          <div style={{ color: muted, fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>Why now</div>
          <p style={{ margin: "10px 0 0", color: navy, fontSize: 22, lineHeight: 1.36 }}>
            Technical leadership, TypeScript experience, and developer-tools context—each reason is visible.
          </p>
          <div style={{ marginTop: 26, borderRadius: 14, padding: "17px 18px", background: "rgb(67 56 202 / .07)", border: "1px solid rgb(67 56 202 / .19)", color: signal, opacity: reason, transform: `translateY(${(1 - reason) * 16}px)`, fontSize: 17, fontWeight: 700 }}>
            Start with a thoughtful question about their next stage of growth.
          </div>
        </div>
      </div>
    </Page>
  );
}

function EndCard() {
  const frame = useCurrentFrame();
  const local = frame - scenes.close.from;
  const inView = enter(local, 0, 12);
  const qrIn = enter(local, 18, 14);

  return (
    <Page style={{ opacity: inView }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 116, alignItems: "center", height: "100%", padding: "0 270px", boxSizing: "border-box" }}>
        <div>
          <Brand size={64} />
          <div style={{ marginTop: 35, color: star, fontFamily: serif, fontSize: 37, fontStyle: "italic" }}>From interest to connection.</div>
          <h2 style={{ margin: "13px 0 20px", fontSize: 75, letterSpacing: -4.5, lineHeight: 0.95 }}>Find the right<br /><span style={{ color: star }}>conversation.</span></h2>
          <div style={{ color: muted, fontSize: 23 }}>Research the opportunity. Know who to contact. Start informed.</div>
          <div style={{ marginTop: 28, color: signal, fontSize: 22, fontWeight: 800 }}>{appUrl.replace("https://", "")}</div>
        </div>
        <div style={{ opacity: qrIn, transform: `scale(${0.84 + qrIn * 0.16})`, transformOrigin: "50% 50%", textAlign: "center" }}>
          <div style={{ padding: 16, borderRadius: 20, background: "#fff", border: `1px solid ${line}`, boxShadow: "0 20px 38px -22px rgb(30 58 138 / .36)" }}><Img src={qrCode} style={{ width: 210, height: 210, display: "block" }} /></div>
          <div style={{ marginTop: 13, color: muted, fontSize: 15, fontWeight: 700 }}>Scan to start exploring</div>
        </div>
      </div>
      <div style={{ position: "absolute", right: 50, bottom: 34, color: muted, fontSize: 13, fontWeight: 650 }}>Illustrative demo data</div>
    </Page>
  );
}

export function ExagentDemo() {
  return (
    <AbsoluteFill style={{ backgroundColor: surface }}>
      <LogoIntro />
      <ApplicantSea {...scenes.competition} />
      <OpportunityLandscape {...scenes.landscape} />
      <ManualFriction {...scenes.friction} />
      <ProductFlow {...scenes.product} />
      <Outcome />
      <EndCard />
    </AbsoluteFill>
  );
}
