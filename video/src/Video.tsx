import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { captions, demo, scenes } from "./script";

const ink = "#090b12";
const paper = "#f5f2ea";
const dim = "#a3a9b8";
const line = "#283040";
const star = "#e4c06e";
const signal = "#c8f169";
const mono = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
const sans = "Inter, Avenir Next, Avenir, Helvetica Neue, Arial, sans-serif";

const stage: React.CSSProperties = {
  background: `radial-gradient(circle at 75% 15%, #22335c 0%, transparent 30%), radial-gradient(circle at 20% 85%, #233022 0%, transparent 27%), ${ink}`,
  color: paper,
  fontFamily: sans,
  overflow: "hidden",
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function fade(frame: number, start: number, duration = 18) {
  return clamp(interpolate(frame, [start, start + duration, start + 9999], [0, 1, 1]));
}

function exit(frame: number, end: number, duration = 18) {
  return clamp(interpolate(frame, [end - duration, end], [1, 0]));
}

function Scene(props: { from: number; duration: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = fade(frame, props.from) * exit(frame, props.from + props.duration);
  return <AbsoluteFill style={{ opacity }}>{props.children}</AbsoluteFill>;
}

function Grid() {
  return (
    <AbsoluteFill
      style={{
        opacity: 0.18,
        backgroundImage: "linear-gradient(#ffffff0b 1px, transparent 1px), linear-gradient(90deg, #ffffff0b 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage: "linear-gradient(to bottom, black, transparent)",
      }}
    />
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, fontSize: compact ? 22 : 28, fontWeight: 750, letterSpacing: -1 }}>
      <div style={{ width: compact ? 26 : 32, height: compact ? 26 : 32, border: `2px solid ${star}`, borderRadius: 8, transform: "rotate(45deg)", display: "grid", placeItems: "center" }}>
        <div style={{ width: 8, height: 8, borderRadius: 100, background: signal }} />
      </div>
      Exagent
    </div>
  );
}

function Pill({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return <span style={{ border: `1px solid ${accent ? "#e4c06e88" : line}`, background: accent ? "#e4c06e13" : "#0e121c", borderRadius: 999, padding: "10px 16px", color: accent ? star : dim, fontFamily: mono, fontSize: 16 }}>{children}</span>;
}

function CaptionLayer() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = captions.find((caption, i) => {
    const next = captions[i + 1];
    return frame >= caption.from * fps && frame < (next?.from ?? 104) * fps;
  });
  if (!active) return null;
  const local = frame - active.from * fps;
  const opacity = interpolate(local, [0, 10, 20], [0, 1, 1], { extrapolateRight: "clamp" });
  const y = interpolate(local, [0, 18], [20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "absolute", zIndex: 40, left: 0, right: 0, bottom: 70, display: "flex", justifyContent: "center", opacity, transform: `translateY(${y}px)`, pointerEvents: "none" }}>
      <div style={{ maxWidth: 1180, border: "1px solid #ffffff1a", background: "#080a10d9", boxShadow: "0 18px 70px #0008", backdropFilter: "blur(18px)", borderRadius: 16, padding: "18px 28px", fontSize: 32, fontWeight: 600, letterSpacing: -0.6, textAlign: "center" }}>
        {active.text}
      </div>
    </div>
  );
}

function Competition() {
  const frame = useCurrentFrame();
  const local = frame - scenes.competition.from;
  const cards = Array.from({ length: 13 }, (_, i) => i);
  const count = Math.floor(interpolate(local, [32, 230], [0, 847], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <Scene {...scenes.competition}>
      <Grid />
      <div style={{ position: "absolute", top: 58, left: 72 }}><Brand compact /></div>
      <div style={{ position: "absolute", left: 150, top: 205, width: 680 }}>
        <p style={{ color: star, fontFamily: mono, fontSize: 20, letterSpacing: 2, textTransform: "uppercase" }}>The application queue</p>
        <h1 style={{ margin: "20px 0 0", fontSize: 75, lineHeight: 0.98, letterSpacing: -4 }}>A good application<br />is not always a<br /><span style={{ color: star }}>visible one.</span></h1>
      </div>
      <div style={{ position: "absolute", right: 145, top: 164, width: 660, height: 650 }}>
        <div style={{ position: "absolute", zIndex: 5, inset: 0, border: `1px solid ${line}`, borderRadius: 26, background: "#101622e6", boxShadow: "0 35px 100px #0008", padding: 34 }}>
          <div style={{ color: dim, fontFamily: mono, fontSize: 17 }}>SOFTWARE ENGINEER · HELSINKI</div>
          <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginTop: 24 }}>
            <div style={{ fontSize: 48, letterSpacing: -2, fontWeight: 700 }}>Applications</div>
            <div style={{ fontFamily: mono, fontSize: 52, color: signal }}>{count}</div>
          </div>
          <div style={{ height: 10, background: "#232b39", borderRadius: 99, marginTop: 25, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(count / 9, 100)}%`, borderRadius: 99, background: signal }} />
          </div>
          <p style={{ marginTop: 22, color: dim, fontSize: 20 }}>New applications arriving every minute</p>
        </div>
        {cards.map((i) => {
          const progress = clamp((local - 18 * i) / 45);
          return <div key={i} style={{ position: "absolute", top: 345 + i * 15, left: 45 + (i % 3) * 80, width: 540, height: 86, borderRadius: 16, border: "1px solid #ffffff15", background: "#171d2a", opacity: progress * (i === 5 ? 1 : 0.8), transform: `translate(${(1 - progress) * 190}px, ${(1 - progress) * -30}px) rotate(${(i - 6) * 0.55}deg)` }} />;
        })}
      </div>
    </Scene>
  );
}

function Reframe() {
  const frame = useCurrentFrame();
  const local = frame - scenes.reframe.from;
  const orbit = local * 0.8;
  return (
    <Scene {...scenes.reframe}>
      <Grid />
      <div style={{ position: "absolute", top: 58, left: 72 }}><Brand compact /></div>
      <div style={{ position: "absolute", left: 150, top: 230, width: 800 }}>
        <p style={{ color: star, fontFamily: mono, fontSize: 20, letterSpacing: 2, textTransform: "uppercase" }}>A different starting point</p>
        <h2 style={{ margin: "20px 0", fontSize: 78, lineHeight: 0.98, letterSpacing: -4 }}>Look for the<br /><span style={{ color: signal }}>right company</span><br />before the post.</h2>
        <p style={{ color: dim, fontSize: 25, lineHeight: 1.4, width: 640 }}>Especially at smaller companies, a thoughtful conversation can start long before a role is published.</p>
      </div>
      <div style={{ position: "absolute", right: 90, top: 130, width: 760, height: 760, display: "grid", placeItems: "center" }}>
        {[0, 1, 2].map((ring) => <div key={ring} style={{ position: "absolute", width: 250 + ring * 175, height: 250 + ring * 175, border: `1px solid ${ring === 2 ? "#e4c06e66" : "#ffffff16"}`, borderRadius: "50%", transform: `rotate(${orbit * (ring % 2 ? -1 : 1) * 0.3}deg)` }} />)}
        {[0, 120, 240].map((angle, i) => {
          const radians = ((angle + orbit) * Math.PI) / 180;
          const radius = 280;
          return <div key={angle} style={{ position: "absolute", left: 380 + Math.cos(radians) * radius - 72, top: 380 + Math.sin(radians) * radius - 42, width: 144, padding: "14px 10px", borderRadius: 13, border: "1px solid #ffffff22", background: "#121926", textAlign: "center", fontSize: 15, color: i === 1 ? star : dim }}>{i === 1 ? demo.company : ["Potential fit", "Growing team"][i % 2]}</div>;
        })}
        <div style={{ zIndex: 2, width: 188, height: 188, borderRadius: 32, border: `1px solid ${star}`, background: "#1b1a18", display: "grid", placeItems: "center", color: star, fontWeight: 700, fontSize: 25, textAlign: "center", boxShadow: "0 0 90px #e4c06e22" }}>Dream<br />Company</div>
      </div>
    </Scene>
  );
}

function SearchUI() {
  const frame = useCurrentFrame();
  const local = frame - scenes.search.from;
  const fields = [demo.city, demo.industry, "Startup"];
  const shown = Math.floor(interpolate(local, [115, 235], [0, 3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const searching = local > 285;
  return (
    <Scene {...scenes.search}>
      <Grid />
      <div style={{ position: "absolute", top: 58, left: 72 }}><Brand /></div>
      <div style={{ position: "absolute", left: 160, top: 168, right: 160, bottom: 180, border: `1px solid ${line}`, borderRadius: 32, background: "#0d111ae8", boxShadow: "0 45px 130px #0008", padding: 52 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><p style={{ margin: 0, color: star, fontFamily: mono, fontSize: 17, letterSpacing: 2 }}>NEW SEARCH</p><h2 style={{ margin: "12px 0 0", fontSize: 52, letterSpacing: -2 }}>Where do you want to work?</h2></div>
          <Pill accent>Private by default</Pill>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr", gap: 20, marginTop: 62 }}>
          {fields.map((value, i) => <div key={value} style={{ opacity: i < shown ? 1 : 0.3, transition: "none" }}><p style={{ margin: "0 0 10px", fontFamily: mono, color: star, fontSize: 15 }}>{["AREA", "INDUSTRY", "COMPANY SIZE"][i]}</p><div style={{ height: 66, boxSizing: "border-box", border: `1px solid ${i < shown ? star : line}`, borderRadius: 14, padding: "20px 18px", color: i < shown ? paper : dim, fontSize: 20 }}>{i < shown ? value : "…"}</div></div>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 72, gap: 24 }}>
          <div style={{ borderRadius: 14, background: searching ? signal : "#65718a", color: "#13180b", fontWeight: 800, padding: "20px 32px", fontSize: 21 }}>Search</div>
          {searching && <div style={{ color: star, fontFamily: mono, fontSize: 17 }}>FINDING COMPANIES · IDENTIFYING KEY PEOPLE</div>}
        </div>
      </div>
      {searching && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 7, background: star, transformOrigin: "left", transform: `scaleX(${clamp((local - 285) / 210)})` }} />}
    </Scene>
  );
}

const PersonRow = ({ name, title, score, active = false }: { name: string; title: string; score: number; active?: boolean }) => <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "19px 22px", borderTop: `1px solid ${line}`, background: active ? "#e4c06e12" : "transparent" }}><div><span style={{ fontSize: 20, fontWeight: 650 }}>{name}</span><span style={{ color: dim, fontSize: 18 }}> · {title}</span></div><div style={{ color: active ? signal : star, fontFamily: mono, fontSize: 20, fontWeight: 700 }}>{score}</div></div>;

function Results() {
  const frame = useCurrentFrame();
  const local = frame - scenes.results.from;
  const reveal = spring({ frame: Math.max(0, local - 45), fps: 30, config: { damping: 18, mass: 0.7 } });
  return (
    <Scene {...scenes.results}>
      <Grid />
      <div style={{ position: "absolute", top: 58, left: 72 }}><Brand compact /></div>
      <div style={{ position: "absolute", left: 150, top: 145, right: 150, bottom: 170 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", gap: 10 }}><Pill>{demo.city}</Pill><Pill>{demo.industry}</Pill><Pill>Startup</Pill></div><span style={{ color: signal, fontFamily: mono, fontSize: 17 }}>SEARCH COMPLETE</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.3fr", gap: 30, marginTop: 32, height: 660 }}>
          <div style={{ border: `1px solid ${line}`, borderRadius: 24, background: "#0e131e", padding: 28 }}><p style={{ margin: 0, color: star, fontFamily: mono, fontSize: 15 }}>COMPANIES FOUND</p><h2 style={{ margin: "12px 0 30px", fontSize: 38, letterSpacing: -1.5 }}>Worth exploring</h2>{["Dream Company", "Orbit Labs", "Northstar Systems", "Signal Works"].map((company, i) => <div key={company} style={{ padding: "17px 0", borderTop: `1px solid ${line}`, color: i === 0 ? paper : dim, fontSize: 20, transform: `translateX(${(1 - reveal) * 32}px)`, opacity: reveal }}>{company}{i === 0 && <span style={{ marginLeft: 10, color: signal, fontSize: 14 }}>selected</span>}</div>)}</div>
          <div style={{ border: `1px solid ${star}`, borderRadius: 24, background: "#11151be8", overflow: "hidden", boxShadow: "0 0 80px #e4c06e16", transform: `translateY(${(1 - reveal) * 35}px)`, opacity: reveal }}><div style={{ padding: "26px 28px 22px" }}><p style={{ margin: 0, color: star, fontFamily: mono, fontSize: 15 }}>DREAM COMPANY</p><h2 style={{ margin: "10px 0 0", fontSize: 38, letterSpacing: -1.5 }}>People who can open a door</h2><p style={{ margin: "11px 0 0", color: dim, fontSize: 18 }}>Ranked by ability to influence a hiring decision.</p></div><PersonRow name={demo.person} title={demo.title} score={demo.score} active /><PersonRow name="Jane Smith" title="Head of Product" score={76} /><PersonRow name="Alex Johnson" title="Engineering Manager" score={72} /><PersonRow name="Taylor Brown" title="People Lead" score={64} /></div>
        </div>
      </div>
    </Scene>
  );
}

function Contact() {
  const frame = useCurrentFrame();
  const local = frame - scenes.contact.from;
  const pop = spring({ frame: Math.max(0, local - 20), fps: 30, config: { damping: 14, stiffness: 120 } });
  return (
    <Scene {...scenes.contact}>
      <Grid />
      <div style={{ position: "absolute", top: 58, left: 72 }}><Brand compact /></div>
      <div style={{ position: "absolute", left: 350, top: 135, width: 1220, border: `1px solid ${star}`, borderRadius: 32, background: "#10151fee", boxShadow: "0 45px 140px #0009, 0 0 100px #e4c06e19", padding: 50, opacity: pop, transform: `scale(${0.94 + pop * 0.06})` }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><div><p style={{ margin: 0, color: star, fontFamily: mono, letterSpacing: 2, fontSize: 17 }}>A PROMISING FIRST CONVERSATION</p><h2 style={{ margin: "13px 0 0", fontSize: 60, letterSpacing: -3 }}>{demo.person}</h2><p style={{ margin: "6px 0 0", color: dim, fontSize: 25 }}>{demo.title} · {demo.company}</p></div><div style={{ width: 160, height: 160, borderRadius: 24, background: "#e4c06e18", border: "1px solid #e4c06e77", display: "grid", placeItems: "center", color: star, fontFamily: mono, textAlign: "center", fontSize: 17 }}>DECISION<br />POWER<br /><b style={{ color: signal, fontSize: 45 }}>{demo.score}</b></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 42 }}><div style={{ borderLeft: `3px solid ${star}`, padding: "3px 0 3px 22px" }}><p style={{ margin: 0, color: star, fontFamily: mono, fontSize: 14 }}>WHY MATTI?</p><p style={{ margin: "12px 0 0", fontSize: 25, lineHeight: 1.32 }}>Technical leader at a growing company, with direct influence over engineering direction and headcount.</p></div><div style={{ border: `1px solid ${line}`, background: "#0a0e16", borderRadius: 18, padding: 22 }}><p style={{ margin: 0, color: dim, fontFamily: mono, fontSize: 14 }}>EVIDENCE</p><p style={{ margin: "12px 0 0", color: paper, fontSize: 19 }}>{demo.evidence}</p><div style={{ marginTop: 18, color: signal, fontSize: 16 }}>View supporting source ↗</div></div></div>
        <div style={{ marginTop: 30, borderRadius: 18, background: "#c8f16912", border: "1px solid #c8f16955", padding: "20px 24px" }}><span style={{ color: signal, fontFamily: mono, fontSize: 14 }}>OUTREACH ANGLE&nbsp;&nbsp;</span><span style={{ fontSize: 20 }}>{demo.outreach}</span></div>
      </div>
    </Scene>
  );
}

function Closing() {
  const frame = useCurrentFrame();
  const local = frame - scenes.close.from;
  const scale = 0.9 + spring({ frame: local, fps: 30, config: { damping: 15 } }) * 0.1;
  return (
    <Scene {...scenes.close}>
      <Grid />
      <div style={{ display: "grid", placeItems: "center", height: "100%", textAlign: "center", transform: `scale(${scale})` }}><div><div style={{ display: "inline-flex", marginBottom: 35 }}><Brand /></div><h2 style={{ margin: 0, fontSize: 95, letterSpacing: -5, lineHeight: 0.94 }}>Find the right<br /><span style={{ color: signal }}>conversation.</span></h2><p style={{ marginTop: 30, color: dim, fontSize: 27 }}>From interest in a company to a person worth contacting.</p><div style={{ marginTop: 42, color: star, fontFamily: mono, fontSize: 16, letterSpacing: 2 }}>EXAGENT · JUNCTION 2026</div></div></div>
      <div style={{ position: "absolute", right: 52, bottom: 38, color: "#a3a9b888", fontFamily: mono, fontSize: 13 }}>Illustrative demo data</div>
    </Scene>
  );
}

export function ExagentDemo() {
  return <AbsoluteFill style={stage}><Competition /><Reframe /><SearchUI /><Results /><Contact /><Closing /><CaptionLayer /></AbsoluteFill>;
}
