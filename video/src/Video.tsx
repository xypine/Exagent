import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
} from "remotion";

import logo from "../../frontend/public/logo.svg";

import { demo, scenes } from "./script";

const navy = "#0b1b3f";
const surface = "#ffffff";
const page = "#f4f6fb";
const line = "#dce1f0";
const muted = "#5a6685";
const signal = "#1e3a8a";
const star = "#4338ca";
const teal = "#27859b";
const amber = "#b96b11";
const sans = "Inter, ui-sans-serif, system-ui, sans-serif";
const serif = "Instrument Serif, Georgia, serif";
const shadow = "0 2px 4px rgb(11 27 63 / .06), 0 22px 46px -18px rgb(30 58 138 / .25)";

const enter = (frame: number, at: number, duration = 16) =>
  interpolate(frame, [at, at + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
const leave = (frame: number, at: number, duration = 16) =>
  interpolate(frame, [at - duration, at], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
const clamp = (value: number) => Math.max(0, Math.min(1, value));

const base: React.CSSProperties = {
  background:
    "radial-gradient(62rem 32rem at 93% -5%, rgb(67 56 202 / .14), transparent 62%), radial-gradient(44rem 28rem at 3% 0%, rgb(30 58 138 / .10), transparent 60%), linear-gradient(180deg, #fff 0%, #f4f6fb 70%)",
  color: navy,
  fontFamily: sans,
  overflow: "hidden",
};

function Scene({ from, duration, children }: { from: number; duration: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: enter(frame, from, 10) * leave(frame, from + duration, 10) }}>{children}</AbsoluteFill>;
}

function Background() {
  return <>
    <AbsoluteFill style={{ opacity: 0.55, backgroundImage: "linear-gradient(rgb(67 56 202 / .055) 1px, transparent 1px), linear-gradient(90deg, rgb(67 56 202 / .055) 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "linear-gradient(to bottom, black, transparent 75%)" }} />
    <div style={{ position: "absolute", width: 760, height: 760, right: -340, top: -410, borderRadius: "50%", border: "1px solid rgb(67 56 202 / .14)" }} />
  </>;
}

function Brand({ small = false }: { small?: boolean }) {
  const size = small ? 35 : 46;
  return <div style={{ display: "flex", alignItems: "center", gap: small ? 9 : 12, fontSize: small ? 24 : 31, fontWeight: 700, letterSpacing: -1.2 }}>
    <Img src={logo} style={{ width: size, height: size, objectFit: "contain" }} />
    <span>Exagent</span>
  </div>;
}

function Header() {
  return <div style={{ position: "absolute", left: 72, right: 72, top: 44, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}>
    <Brand small />
    <div style={{ color: muted, fontSize: 16, fontWeight: 600 }}>Research-led opportunity discovery</div>
  </div>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div style={{ color: star, fontFamily: serif, fontStyle: "italic", fontSize: 28 }}>{children}</div>;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ borderRadius: 24, border: `1px solid ${line}`, background: surface, boxShadow: shadow, ...style }}>{children}</div>;
}

function LogoIntro() {
  const frame = useCurrentFrame();
  const local = frame - scenes.intro.from;
  const settle = spring({ frame: local, fps: 30, config: { damping: 17, stiffness: 110 } });
  const exit = leave(local, scenes.intro.duration, 12);
  return <Scene {...scenes.intro}>
    <Background />
    <div style={{ display: "grid", height: "100%", placeItems: "center", opacity: exit, transform: `scale(${0.9 + settle * 0.1})` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Img src={logo} style={{ width: 164, height: 164, objectFit: "contain" }} />
        <div style={{ fontSize: 104, fontWeight: 700, letterSpacing: -6 }}>Exagent</div>
      </div>
    </div>
  </Scene>;
}

const seaDots = Array.from({ length: 104 }, (_, i) => ({
  x: 9 + (i % 13) * 6.9 + (i % 2) * 1.2,
  y: 28 + Math.floor(i / 13) * 7 + Math.sin(i * 1.7) * 1.1,
}));

function SeaDot({ x, y, i, local, featured = false }: { x: number; y: number; i: number; local: number; featured?: boolean }) {
  const driftX = Math.sin(local / 28 + i * 1.93) * 5;
  const driftY = Math.cos(local / 25 + i * 1.17) * 8 + Math.sin(local / 45 + i) * 6;
  const blend = enter(local, 180, 45);
  const color = featured && blend < 0.98 ? star : signal;
  const size = featured && blend < 0.98 ? 20 - blend * 9 : 10;
  return <div style={{ position: "absolute", left: `${x}%`, top: `${y + driftY / 12}%`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: "50%", background: color, opacity: featured ? 1 : 0.62 + (i % 3) * 0.1, transform: `translateX(${driftX}px)`, boxShadow: featured && blend < 0.9 ? "0 0 0 7px rgb(67 56 202 / .13)" : "none" }} />;
}

function Competition() {
  const frame = useCurrentFrame();
  const local = frame - scenes.competition.from;
  const words = enter(local, 20, 22);
  return <Scene {...scenes.competition}>
    <Background /><Header />
    <div style={{ position: "absolute", left: 128, top: 185, width: 710, opacity: words, transform: `translateY(${(1 - words) * 28}px)` }}>
      <Eyebrow>Job posts are noisy places.</Eyebrow>
      <h1 style={{ fontSize: 74, letterSpacing: -4.4, lineHeight: 0.98, margin: "18px 0 20px" }}>When every application looks alike, it is hard to <span style={{ color: signal }}>stand out.</span></h1>
      <p style={{ color: muted, fontSize: 23, lineHeight: 1.45, margin: 0, width: 610 }}>A capable applicant can disappear into an existing pool before a conversation even begins.</p>
    </div>
    <div style={{ position: "absolute", left: 870, right: 90, top: 170, bottom: 132 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 38, background: "linear-gradient(140deg, rgb(255 255 255 / .92), rgb(235 239 252 / .65))", border: "1px solid rgb(67 56 202 / .18)", overflow: "hidden", boxShadow: "0 30px 70px -32px rgb(30 58 138 / .38)" }}>
        <div style={{ position: "absolute", left: 42, top: 38, color: muted, fontSize: 16, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase" }}>Application sea</div>
        {seaDots.map((dot, i) => <SeaDot key={i} {...dot} i={i} local={local} featured={i === 54} />)}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.35 }}>
          {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M 0 ${38 + i * 7} C 22 ${31 + i * 7}, 39 ${45 + i * 7}, 59 ${38 + i * 7} S 85 ${31 + i * 7}, 100 ${38 + i * 7}`} fill="none" stroke={star} strokeWidth="0.13" />)}
        </svg>
        <div style={{ position: "absolute", right: 38, bottom: 34, borderRadius: 999, padding: "10px 16px", background: "rgb(255 255 255 / .86)", border: `1px solid ${line}`, color: muted, fontSize: 15, fontWeight: 600 }}>Everyone is qualified to be here.</div>
      </div>
    </div>
  </Scene>;
}

const companies = ["Dream Company", "Orbit Labs", "Northstar Systems", "Signal Works"];

function Reframe() {
  const frame = useCurrentFrame();
  const local = frame - scenes.reframe.from;
  const t = enter(local, 18, 26);
  const route = enter(local, 90, 60);
  return <Scene {...scenes.reframe}>
    <Background /><Header />
    <div style={{ position: "absolute", left: 130, top: 220, width: 620, opacity: t }}>
      <Eyebrow>Try a different starting point.</Eyebrow>
      <h2 style={{ fontSize: 76, letterSpacing: -4.1, lineHeight: 0.98, margin: "17px 0 20px" }}>Find a company where you could <span style={{ color: star }}>contribute.</span></h2>
      <p style={{ fontSize: 24, lineHeight: 1.42, color: muted, margin: 0 }}>The right opportunity may not be posted yet.</p>
    </div>
    <div style={{ position: "absolute", left: 790, right: 78, top: 175, bottom: 128 }}>
      <Card style={{ position: "absolute", inset: 0, overflow: "hidden", background: "radial-gradient(circle at 52% 75%, rgb(67 56 202 / .14), transparent 34%), #fff" }}>
        <div style={{ position: "absolute", left: 45, top: 38, fontSize: 16, textTransform: "uppercase", letterSpacing: 1.1, color: muted, fontWeight: 700 }}>Opportunity landscape</div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {[0, 1, 2, 3].map((i) => <path key={i} d={`M 50 81 C ${52 - i * 13} ${67 - i * 7}, ${18 + i * 24} ${46 - i * 5}, ${14 + i * 24} 23`} fill="none" stroke={i === 0 ? star : signal} strokeWidth={i === 0 ? 0.55 : 0.22} strokeDasharray={i === 0 ? "0" : "1.2 1.8"} pathLength="1" strokeDashoffset={1 - route} opacity={i === 0 ? route : 0.35 * route} />)}
        </svg>
        {companies.map((company, i) => {
          const x = 15 + i * 24;
          const y = 24 + ((i * 31) % 3) * 18;
          const selected = i === 0;
          const scale = selected ? 0.7 + route * 0.3 : 0.75 + route * 0.25;
          return <div key={company} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, padding: selected ? "18px 22px" : "13px 16px", borderRadius: 17, background: selected ? star : surface, color: selected ? "#fff" : navy, border: `1px solid ${selected ? star : line}`, boxShadow: selected ? "0 18px 36px -14px rgb(67 56 202 / .55)" : "0 8px 18px -12px rgb(11 27 63 / .26)", fontWeight: 700, fontSize: selected ? 21 : 16, transform: `translate(-50%, -50%) scale(${scale})`, opacity: t }}>
            {selected && <div style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 400, fontSize: 16, marginBottom: 3 }}>potential fit</div>}{company}
          </div>;
        })}
        <div style={{ position: "absolute", left: "50%", top: "81%", transform: `translate(-50%, -50%) scale(${0.8 + route * 0.2})`, width: 96, height: 96, borderRadius: "50%", border: `3px solid ${star}`, background: surface, display: "grid", placeItems: "center", color: star, fontWeight: 800, fontSize: 16, boxShadow: "0 0 0 11px rgb(67 56 202 / .09)" }}>YOU</div>
      </Card>
    </div>
  </Scene>;
}

function ResearchChip({ text, x, y, angle, local, i }: { text: string; x: number; y: number; angle: number; local: number; i: number }) {
  const appear = enter(local, i * 11, 18);
  const collapse = enter(local, 210 + i * 3, 65);
  return <div style={{ position: "absolute", left: `${x + (50 - x) * collapse}%`, top: `${y + (48 - y) * collapse}%`, padding: "12px 16px", borderRadius: 14, background: surface, border: `1px solid ${line}`, color: navy, fontSize: 16, fontWeight: 650, boxShadow: "0 11px 26px -18px rgb(11 27 63 / .35)", opacity: appear * (1 - collapse * 0.25), transform: `translate(-50%, -50%) rotate(${angle * (1 - collapse)}deg) scale(${0.82 + appear * 0.18})` }}>{text}</div>;
}

function Workflow() {
  const frame = useCurrentFrame();
  const local = frame - scenes.workflow.from;
  const organize = enter(local, 120, 30);
  const typed = Math.floor(interpolate(local, [180, 240], [0, demo.city.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const start = enter(local, 300, 15);
  const chips = [
    ["company site", 19, 24, -7], ["news", 75, 19, 8], ["team page", 79, 57, -8], ["role history", 20, 66, 7], ["public source", 52, 16, -3], ["funding", 52, 76, 4],
  ] as const;
  return <Scene {...scenes.workflow}>
    <Background /><Header />
    <div style={{ position: "absolute", left: 125, top: 157, right: 125, textAlign: "center", opacity: 1 - organize * 0.25 }}>
      <Eyebrow>Research can splinter quickly.</Eyebrow>
      <h2 style={{ fontSize: 61, letterSpacing: -3.1, margin: "11px 0 0" }}>Company. People. Evidence. <span style={{ color: star }}>Where do you begin?</span></h2>
    </div>
    <div style={{ position: "absolute", left: 190, right: 190, top: 315, bottom: 155, opacity: 1 - organize }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {chips.map(([, x, y], i) => <path key={i} d={`M ${x} ${y} Q 50 ${i % 2 ? 75 : 20} 50 48`} fill="none" stroke={i % 2 ? signal : star} strokeWidth="0.32" strokeDasharray="1 1.4" opacity=".48" />)}
      </svg>
      {chips.map(([text, x, y, angle], i) => <ResearchChip key={text} text={text} x={x} y={y} angle={angle} local={local} i={i} />)}
      <div style={{ position: "absolute", left: "50%", top: "48%", transform: "translate(-50%, -50%)", width: 108, height: 108, display: "grid", placeItems: "center", borderRadius: "50%", color: "#fff", background: star, fontWeight: 800, boxShadow: "0 0 0 14px rgb(67 56 202 / .10)" }}>hours</div>
    </div>
    <div style={{ position: "absolute", left: 145, right: 145, top: 190, bottom: 135, opacity: organize, transform: `translateY(${(1 - organize) * 35}px)` }}>
      <Card style={{ height: "100%", padding: 42, boxSizing: "border-box", borderColor: "rgb(67 56 202 / .35)", background: "linear-gradient(180deg, #fff, #f9faff)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${signal}, ${star})`, borderRadius: "24px 24px 0 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}><div><Eyebrow>Exagent organizes the work.</Eyebrow><h2 style={{ margin: "8px 0 0", fontSize: 45, letterSpacing: -2.2 }}>Start with where you want to contribute.</h2></div><div style={{ color: muted, fontSize: 15, fontWeight: 700, paddingTop: 12 }}>ILLUSTRATIVE DEMO</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr .72fr", gap: 18, marginTop: 42 }}>
          {[["City", demo.city.slice(0, typed)], ["Industry", local > 240 ? demo.industry : ""], ["Stage", local > 270 ? "Startup" : ""]].map(([label, value], i) => <div key={label}><div style={{ color: star, fontSize: 14, fontWeight: 750, textTransform: "uppercase", letterSpacing: 1, marginBottom: 9 }}>{label}</div><div style={{ height: 64, borderRadius: 12, boxSizing: "border-box", background: surface, border: `1px solid ${i === 0 && typed > 0 ? "rgb(67 56 202 / .65)" : line}`, padding: "18px 17px", fontSize: 20, color: value ? navy : muted }}>{value || "Select…"}{i === 0 && typed > 0 && typed < demo.city.length ? <span style={{ color: star }}>|</span> : null}</div></div>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 44 }}><div style={{ borderRadius: 12, background: signal, color: "#fff", padding: "17px 26px", fontWeight: 750, fontSize: 19, boxShadow: "0 11px 22px -12px rgb(30 58 138 / .7)", transform: `scale(${0.96 + start * .04})` }}>Find opportunities</div>{start > 0 && <div style={{ color: muted, fontSize: 17, opacity: start }}>Mapping companies <span style={{ color: star }}>→</span> finding people <span style={{ color: star }}>→</span> checking evidence</div>}</div>
        {start > 0 && <div style={{ position: "absolute", left: 42, right: 42, bottom: 42, height: 84, display: "flex", gap: 10, alignItems: "center" }}>{["Companies", "People", "Evidence", "Ranking"].map((step, i) => <div key={step} style={{ flex: 1, position: "relative", height: 8, borderRadius: 99, background: line, overflow: "hidden" }}><div style={{ position: "absolute", inset: 0, transformOrigin: "left", transform: `scaleX(${clamp((local - 330 - i * 30) / 32)})`, background: i === 3 ? star : signal }} /><div style={{ position: "absolute", top: 18, color: muted, whiteSpace: "nowrap", fontSize: 14, fontWeight: 650 }}>{step}</div></div>)}</div>}
      </Card>
    </div>
  </Scene>;
}

function Score({ value, color = star }: { value: number; color?: string }) {
  return <div style={{ width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", background: `conic-gradient(${color} ${value}%, #e9edf7 0)`, color: navy, fontSize: 13, fontWeight: 800 }}><div style={{ width: 36, height: 36, background: surface, borderRadius: "50%", display: "grid", placeItems: "center" }}>{value}</div></div>;
}

function Results() {
  const frame = useCurrentFrame();
  const local = frame - scenes.results.from;
  const reveal = spring({ frame: Math.max(0, local - 26), fps: 30, config: { damping: 18, mass: 0.7 } });
  const personReveal = spring({ frame: Math.max(0, local - 120), fps: 30, config: { damping: 19, mass: 0.7 } });
  const matches = [
    ["Dream Company", "SaaS · Helsinki", 92, star], ["Orbit Labs", "Climate tech · Helsinki", 84, teal], ["Northstar Systems", "Developer tools · Helsinki", 79, signal], ["Signal Works", "B2B software · Helsinki", 74, amber],
  ] as const;
  const people = [[demo.person, demo.title, 92], ["Jane Smith", "Head of Product", 76], ["Alex Johnson", "Engineering Manager", 72], ["Taylor Brown", "People Lead", 64]] as const;
  return <Scene {...scenes.results}>
    <Background /><Header />
    <div style={{ position: "absolute", left: 125, top: 150, right: 125 }}>
      <Eyebrow>From a wide field to a few good leads.</Eyebrow>
      <h2 style={{ margin: "9px 0 0", fontSize: 53, letterSpacing: -2.7 }}>See the companies worth exploring — then the people who matter.</h2>
    </div>
    <div style={{ position: "absolute", left: 125, right: 125, top: 315, bottom: 115, display: "grid", gridTemplateColumns: "0.9fr 1.28fr", gap: 28 }}>
      <Card style={{ padding: 28, opacity: reveal, transform: `translateX(${(1 - reveal) * -45}px)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ color: muted, fontSize: 14, fontWeight: 750, letterSpacing: 1, textTransform: "uppercase" }}>Matched companies</div><h3 style={{ margin: "8px 0 0", fontSize: 29, letterSpacing: -1.2 }}>Worth exploring</h3></div><div style={{ color: star, fontWeight: 750 }}>4 found</div></div>
        <div style={{ marginTop: 22 }}>{matches.map(([name, detail, score, color], i) => { const p = enter(local, 75 + i * 27, 18); return <div key={name} style={{ display: "flex", alignItems: "center", gap: 14, borderTop: `1px solid ${line}`, padding: "17px 2px", opacity: p, transform: `translateX(${(1 - p) * -22}px)` }}><Score value={score} color={color} /><div style={{ flex: 1 }}><div style={{ fontSize: 18, fontWeight: 750 }}>{name}</div><div style={{ color: muted, fontSize: 14, marginTop: 3 }}>{detail}</div></div>{i === 0 && <div style={{ color: star, fontSize: 13, fontWeight: 800 }}>SELECTED</div>}</div>; })}</div>
      </Card>
      <Card style={{ overflow: "hidden", borderColor: "rgb(67 56 202 / .35)", opacity: personReveal, transform: `translateY(${(1 - personReveal) * 36}px)` }}>
        <div style={{ padding: "27px 30px 22px", background: "linear-gradient(90deg, rgb(67 56 202 / .08), transparent)" }}><div style={{ color: star, fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>{demo.company}</div><h3 style={{ margin: "8px 0 7px", fontSize: 32, letterSpacing: -1.5 }}>People who can open a conversation</h3><p style={{ margin: 0, color: muted, fontSize: 16 }}>Ranked by relevance and ability to influence a hiring decision.</p></div>
        {people.map(([name, title, score], i) => { const p = enter(local, 150 + i * 30, 15); const active = i === 0; return <div key={name} style={{ display: "flex", alignItems: "center", gap: 18, padding: "16px 30px", borderTop: `1px solid ${line}`, background: active ? "rgb(67 56 202 / .06)" : surface, opacity: p, transform: `translateX(${(1 - p) * 32}px)` }}><div style={{ width: 39, height: 39, borderRadius: "50%", background: active ? star : "#e9edf7", color: active ? "#fff" : signal, display: "grid", placeItems: "center", fontWeight: 750 }}>{name.split(" ").map((part) => part[0]).join("")}</div><div style={{ flex: 1 }}><div style={{ fontSize: 19, fontWeight: 750 }}>{name}</div><div style={{ color: muted, marginTop: 2, fontSize: 15 }}>{title}</div></div><div style={{ color: active ? star : muted, fontWeight: 800, fontSize: 20 }}>{score}</div></div>; })}
      </Card>
    </div>
  </Scene>;
}

function Contact() {
  const frame = useCurrentFrame();
  const local = frame - scenes.contact.from;
  const card = spring({ frame: Math.max(0, local - 12), fps: 30, config: { damping: 16, stiffness: 115 } });
  const evidence = enter(local, 60, 18);
  const angle = enter(local, 120, 20);
  return <Scene {...scenes.contact}>
    <Background /><Header />
    <div style={{ position: "absolute", left: 290, right: 290, top: 177, bottom: 125, opacity: card, transform: `scale(${0.95 + card * .05})` }}>
      <Card style={{ height: "100%", boxSizing: "border-box", padding: 48, borderColor: "rgb(67 56 202 / .45)", boxShadow: "0 3px 5px rgb(11 27 63 / .06), 0 35px 70px -27px rgb(30 58 138 / .36)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}><div><Eyebrow>One compelling place to begin.</Eyebrow><h2 style={{ margin: "12px 0 6px", fontSize: 58, letterSpacing: -3 }}>{demo.person}</h2><div style={{ color: muted, fontSize: 24 }}>{demo.title} · {demo.company}</div></div><div style={{ width: 106, height: 106, borderRadius: 24, background: "rgb(67 56 202 / .09)", display: "grid", placeItems: "center", color: star, fontSize: 16, fontWeight: 750, textAlign: "center" }}>MATCH<br /><span style={{ fontSize: 38 }}>{demo.score}</span></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 26, marginTop: 38 }}>
          <div style={{ borderLeft: `4px solid ${star}`, padding: "5px 0 5px 22px" }}><div style={{ color: muted, fontSize: 13, textTransform: "uppercase", fontWeight: 800, letterSpacing: 1 }}>Why this person</div><p style={{ fontSize: 24, lineHeight: 1.38, margin: "10px 0 0" }}>A technical leader with direct influence over engineering direction and future headcount.</p></div>
          <div style={{ border: `1px solid ${line}`, borderRadius: 17, padding: 20, background: "#fbfcff", opacity: evidence, transform: `translateY(${(1 - evidence) * 16}px)` }}><div style={{ color: muted, fontSize: 13, textTransform: "uppercase", fontWeight: 800, letterSpacing: 1 }}>Evidence</div><p style={{ margin: "10px 0 8px", fontSize: 18, lineHeight: 1.35 }}>{demo.evidence}</p><div style={{ color: star, fontSize: 15, fontWeight: 700 }}>View supporting source ↗</div></div>
        </div>
        <div style={{ marginTop: 29, padding: "20px 23px", borderRadius: 16, background: "linear-gradient(90deg, rgb(30 58 138 / .08), rgb(67 56 202 / .06))", border: "1px solid rgb(67 56 202 / .20)", opacity: angle, transform: `translateY(${(1 - angle) * 16}px)` }}><span style={{ color: star, fontWeight: 800, fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>Thoughtful opening&nbsp;&nbsp;</span><span style={{ fontSize: 19 }}>{demo.outreach}</span></div>
      </Card>
    </div>
  </Scene>;
}

function Closing() {
  const frame = useCurrentFrame();
  const local = frame - scenes.close.from;
  const inView = spring({ frame: local, fps: 30, config: { damping: 15, mass: 0.9 } });
  return <Scene {...scenes.close}>
    <Background />
    <div style={{ display: "grid", height: "100%", placeItems: "center", textAlign: "center", transform: `scale(${0.9 + inView * .1})`, opacity: inView }}><div><Brand />
      <div style={{ marginTop: 43 }}><Eyebrow>From company interest to human connection.</Eyebrow><h2 style={{ fontSize: 91, letterSpacing: -5.3, lineHeight: .94, margin: "16px 0 20px" }}>Find the right<br /><span style={{ color: star }}>conversation.</span></h2><p style={{ margin: 0, color: muted, fontSize: 25 }}>Research the opportunity. Know who to contact. Start informed.</p></div>
      <div style={{ marginTop: 42, display: "inline-block", padding: "15px 25px", color: "#fff", background: signal, borderRadius: 12, fontSize: 18, fontWeight: 750 }}>Exagent</div>
    </div></div>
    <div style={{ position: "absolute", right: 54, bottom: 38, color: muted, fontSize: 13, fontWeight: 650 }}>Illustrative demo data</div>
  </Scene>;
}

export function ExagentDemo() {
  return <AbsoluteFill style={base}><LogoIntro /><Competition /><Reframe /><Workflow /><Results /><Contact /><Closing /></AbsoluteFill>;
}
