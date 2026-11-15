import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
} from "remotion";

type ProductFlowProps = { from: number; duration: number };

const navy = "#0b1b3f";
const page = "#f4f6fb";
const surface = "#ffffff";
const line = "#dce1f0";
const muted = "#5a6685";
const signal = "#1e3a8a";
const star = "#4338ca";
const teal = "#27859b";
const amber = "#b96b11";
const shadow = "0 2px 4px rgb(11 27 63 / .06), 0 24px 48px -18px rgb(30 58 138 / .25)";

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const reveal = (frame: number, start: number, length = 16) =>
  interpolate(frame, [start, start + length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

function AppCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ border: `1px solid ${line}`, borderRadius: 22, background: surface, boxShadow: shadow, ...style }}>{children}</div>;
}

function PipelineLabel({ local }: { local: number }) {
  const stage = local < 120 ? 0 : local < 240 ? 1 : local < 360 ? 2 : local < 510 ? 3 : 4;
  const labels = [
    ["1. Set your target", "Start with where you want to work, the industry, and the company size."],
    ["2. Find relevant companies", "Exagent finds companies that fit your search."],
    ["3. Find the people who matter", "Then it identifies relevant people at those companies."],
    ["4. Add useful context", "Open a profile to see the public context behind the person."],
    ["5. Prioritise your best opportunities", "Focus on the contacts most worth pursuing for you."],
  ];
  const [title, message] = labels[stage];
  return <div style={{ position: "absolute", left: 112, right: 112, top: 62, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 3 }}>
    <div><div style={{ color: star, fontFamily: "Instrument Serif, Georgia, serif", fontSize: 30, fontStyle: "italic" }}>A real Exagent search</div><div style={{ color: muted, fontSize: 18, marginTop: 5 }}>{message}</div></div>
    <div style={{ display: "flex", gap: 8 }}>{labels.map(([label], index) => <div key={label} style={{ borderRadius: 999, padding: "9px 13px", background: index === stage ? star : "rgb(255 255 255 / .76)", color: index === stage ? "#fff" : muted, border: `1px solid ${index === stage ? star : line}`, fontSize: 13, fontWeight: 750, boxShadow: index === stage ? "0 8px 18px -11px rgb(67 56 202 / .65)" : "none" }}>{index + 1}</div>)}</div>
    <div style={{ position: "absolute", right: 0, top: 55, color: star, fontWeight: 800, fontSize: 17 }}>{title}</div>
  </div>;
}

function TopBar() {
  return <div style={{ height: 66, display: "flex", alignItems: "center", padding: "0 28px", borderBottom: `1px solid ${line}`, gap: 12 }}>
    <div style={{ width: 28, height: 28, borderRadius: 9, background: `linear-gradient(135deg, ${signal}, ${star})`, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15 }}>E</div>
    <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.7 }}>Exagent</span>
    <span style={{ color: line, margin: "0 4px" }}>/</span><span style={{ color: muted, fontSize: 15 }}>Discover</span>
    <div style={{ marginLeft: "auto", borderRadius: 999, background: "rgb(67 56 202 / .08)", color: star, padding: "7px 11px", fontSize: 12, fontWeight: 750 }}>Illustrative demo data</div>
  </div>;
}

function Field({ label, value, active, width }: { label: string; value: string; active?: boolean; width?: string }) {
  return <div style={{ width: width ?? "auto", flex: width ? undefined : 1 }}><div style={{ color: star, fontSize: 11, fontWeight: 800, letterSpacing: .8, textTransform: "uppercase", marginBottom: 7 }}>{label}</div><div style={{ border: `1px solid ${active ? star : line}`, boxShadow: active ? "0 0 0 3px rgb(67 56 202 / .10)" : "none", borderRadius: 11, height: 48, display: "flex", alignItems: "center", padding: "0 14px", color: value ? navy : muted, fontSize: 16 }}>{value || "Choose…"}{active && <span style={{ color: star, marginLeft: 2 }}>|</span>}</div></div>;
}

function SearchForm({ local }: { local: number }) {
  const typed = Math.floor(interpolate(local, [20, 72], [0, "Helsinki, Finland".length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const city = "Helsinki, Finland".slice(0, typed);
  const isSearching = local > 92;
  return <div style={{ padding: "44px 54px", display: "grid", gridTemplateColumns: "1fr .94fr", gap: 54, alignItems: "center", height: "calc(100% - 66px)", boxSizing: "border-box" }}>
    <div><div style={{ color: star, fontFamily: "Instrument Serif, Georgia, serif", fontStyle: "italic", fontSize: 31 }}>The hidden job market — unlocked</div><h2 style={{ fontSize: 58, lineHeight: 1, letterSpacing: -3.4, margin: "18px 0 18px" }}>Find who matters.<br /><span style={{ color: star }}>Say what works.</span></h2><p style={{ color: muted, fontSize: 20, lineHeight: 1.45, maxWidth: 490 }}>Start with the kind of company you want to explore. Exagent turns it into a useful search.</p></div>
    <AppCard style={{ padding: 28, borderColor: "rgb(67 56 202 / .38)", position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", height: 4, top: 0, left: 0, right: 0, background: `linear-gradient(90deg, ${signal}, ${star})` }} />
      <div style={{ display: "flex", gap: 14 }}><Field label="Area" value={city} active={typed < "Helsinki, Finland".length} /><Field label="Industry" value={local > 58 ? "SaaS" : ""} /></div>
      <div style={{ color: star, fontSize: 11, fontWeight: 800, letterSpacing: .8, textTransform: "uppercase", margin: "20px 0 8px" }}>Company size</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>{["Startup", "Mid-size", "Enterprise"].map((size, index) => <div key={size} style={{ border: `1px solid ${index === 0 ? star : line}`, borderRadius: 10, textAlign: "center", padding: "11px 4px", color: index === 0 ? star : muted, background: index === 0 ? "rgb(67 56 202 / .08)" : surface, fontWeight: 700, fontSize: 14 }}>{size}</div>)}</div>
      <button type="button" style={{ width: "100%", marginTop: 23, border: 0, borderRadius: 11, padding: "15px 16px", color: "#fff", background: signal, fontWeight: 800, fontSize: 17, opacity: isSearching ? .7 : 1, boxShadow: "0 10px 20px -10px rgb(30 58 138 / .7)" }}>{isSearching ? "Starting search…" : "Search"}</button>
      {isSearching && <div style={{ marginTop: 14, color: muted, fontSize: 13, textAlign: "center" }}>Your filters are saved to this search.</div>}
    </AppCard>
  </div>;
}

function SearchProgress({ local }: { local: number }) {
  const company = reveal(local, 122, 14);
  const people = reveal(local, 172, 14);
  const goResults = local > 225;
  return <div style={{ padding: "32px 48px", height: "calc(100% - 66px)", boxSizing: "border-box", opacity: goResults ? clamp(1 - (local - 225) / 18) : 1 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div><div style={{ color: muted, fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>Search: Helsinki · SaaS · Startup</div><h2 style={{ margin: "9px 0 0", fontSize: 36, letterSpacing: -1.8 }}>Building your company shortlist</h2></div><div style={{ color: star, fontWeight: 800, fontSize: 15 }}>In progress</div></div>
    <AppCard style={{ marginTop: 27, padding: "22px 25px" }}>{[["Finding companies", company, "Relevant company signals and location"], ["Finding key people", people, "Decision-makers at the strongest matches"]].map(([label, amount, detail], index) => <div key={label as string} style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 16, alignItems: "center", padding: index ? "22px 0 0" : "0 0 22px", borderTop: index ? `1px solid ${line}` : "none", opacity: amount as number }}><div style={{ width: 30, height: 30, border: `3px solid ${star}`, borderTopColor: "transparent", borderRadius: "50%", transform: `rotate(${local * (index ? 11 : 16)}deg)` }} /><div><div style={{ fontWeight: 800, fontSize: 19 }}>{label as string}</div><div style={{ color: muted, fontSize: 14, marginTop: 4 }}>{detail as string}</div></div><div style={{ color: star, fontSize: 14, fontWeight: 750 }}>{(amount as number) > .95 ? "Done" : "Working"}</div></div>)}</AppCard>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24 }}>{["Dream Company", "Orbit Labs", "Northstar Systems"].map((name, index) => <AppCard key={name} style={{ padding: 20, opacity: company * (index === 0 ? 1 : .78), transform: `translateY(${(1 - company) * 18}px)` }}><div style={{ width: 35, height: 35, borderRadius: 11, background: index === 0 ? "rgb(67 56 202 / .13)" : "rgb(30 58 138 / .09)", color: index === 0 ? star : signal, display: "grid", placeItems: "center", fontWeight: 800 }}>{name[0]}</div><div style={{ marginTop: 17, fontWeight: 800, fontSize: 18 }}>{name}</div><div style={{ marginTop: 4, color: muted, fontSize: 14 }}>{index === 0 ? "SaaS · Helsinki" : "Relevant company"}</div></AppCard>)}</div>
  </div>;
}

const people = [
  ["Matti Meikäläinen", "CTO", 75], ["Jane Smith", "Head of Product", 88], ["Alex Johnson", "Engineering Manager", 82],
] as const;

function Score({ children, accent = star }: { children: React.ReactNode; accent?: string }) {
  return <div style={{ width: 45, height: 45, display: "grid", placeItems: "center", borderRadius: "50%", background: `conic-gradient(${accent} 75%, #e9edf7 0)`, fontSize: 13, fontWeight: 850 }}><div style={{ width: 33, height: 33, display: "grid", placeItems: "center", borderRadius: "50%", background: surface }}>{children}</div></div>;
}

function KeyPeople({ local }: { local: number }) {
  const detail = local > 348;
  const selected = local > 320;
  return <div style={{ padding: "29px 44px", height: "calc(100% - 66px)", boxSizing: "border-box", display: "grid", gridTemplateColumns: detail ? ".83fr 1.17fr" : "1fr", gap: 23 }}>
    <AppCard style={{ overflow: "hidden" }}><div style={{ padding: "19px 24px", borderBottom: `1px solid ${line}`, background: "linear-gradient(90deg, rgb(67 56 202 / .08), transparent)" }}><div style={{ color: star, fontSize: 12, fontWeight: 850, letterSpacing: 1, textTransform: "uppercase" }}>Dream Company</div><h2 style={{ margin: "7px 0 3px", fontSize: 28, letterSpacing: -1.3 }}>Key people</h2><p style={{ margin: 0, color: muted, fontSize: 14 }}>First pass · decision power</p></div>
      {people.map(([name, title, score], index) => { const inView = reveal(local, 254 + index * 23, 12); const active = index === 0 && selected; return <div key={name} style={{ display: "flex", alignItems: "center", gap: 13, padding: "16px 24px", borderBottom: `1px solid ${line}`, background: active ? "rgb(67 56 202 / .07)" : surface, opacity: inView, transform: `translateX(${(1 - inView) * 24}px)` }}><div style={{ width: 37, height: 37, borderRadius: "50%", background: active ? star : "#e9edf7", color: active ? "#fff" : signal, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13 }}>{name.split(" ").map((part) => part[0]).join("")}</div><div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 17 }}>{name}</div><div style={{ color: muted, fontSize: 13, marginTop: 2 }}>{title}</div></div><Score>{score}</Score></div>; })}
    </AppCard>
    {detail && <PublicBackground local={local} />}
  </div>;
}

function PublicBackground({ local }: { local: number }) {
  const researched = reveal(local, 382, 16);
  return <AppCard style={{ padding: 27, borderColor: "rgb(67 56 202 / .45)", opacity: reveal(local, 350, 16), transform: `translateX(${(1 - reveal(local, 350, 16)) * 26}px)` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><div><div style={{ color: star, fontFamily: "Instrument Serif, Georgia, serif", fontSize: 25, fontStyle: "italic" }}>Public background</div><h2 style={{ margin: "4px 0", fontSize: 28, letterSpacing: -1.3 }}>Matti Meikäläinen</h2><p style={{ margin: 0, color: muted, fontSize: 15 }}>CTO · Dream Company</p></div><div style={{ textAlign: "right", color: star, fontSize: 13, fontWeight: 800 }}>75<br /><span style={{ color: muted, fontWeight: 650 }}>decision power</span></div></div>
    <p style={{ borderLeft: `3px solid ${star}`, paddingLeft: 13, color: muted, lineHeight: 1.4, fontSize: 15, margin: "22px 0 17px" }}>Public context behind this person, with visible source evidence.</p>
    <div style={{ display: "flex", gap: 7, borderBottom: `1px solid ${line}`, paddingBottom: 13 }}>{["Work history", "Education", "Community"].map((tab, index) => <div key={tab} style={{ borderRadius: 8, padding: "7px 10px", color: index === 0 ? star : muted, background: index === 0 ? "rgb(67 56 202 / .08)" : "transparent", fontSize: 12, fontWeight: 750 }}>{tab}</div>)}</div>
    <div style={{ marginTop: 15, opacity: researched }}>{[["CTO", "Dream Company · current role"], ["Engineering lead", "Product systems · public conference talk"]].map(([role, source]) => <div key={role} style={{ borderLeft: `2px solid ${line}`, padding: "0 0 12px 12px", marginTop: 12 }}><div style={{ fontWeight: 800, fontSize: 15 }}>{role}</div><div style={{ color: muted, fontSize: 13, marginTop: 3 }}>{source} ↗</div></div>)}</div>
  </AppCard>;
}

function ProfileRanking({ local }: { local: number }) {
  const chars = Math.floor(interpolate(local, [520, 606], [0, 91], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const profile = "TypeScript and React graduate. Interested in developer tools and product teams.".slice(0, chars);
  const scored = reveal(local, 610, 23);
  return <div style={{ padding: "29px 44px", height: "calc(100% - 66px)", boxSizing: "border-box", display: "grid", gridTemplateColumns: ".8fr 1.2fr", gap: 23 }}>
    <AppCard style={{ padding: 24, borderColor: "rgb(67 56 202 / .38)" }}><div style={{ color: star, fontFamily: "Instrument Serif, Georgia, serif", fontSize: 25, fontStyle: "italic" }}>About you</div><h2 style={{ margin: "5px 0 18px", fontSize: 29, letterSpacing: -1.4 }}>Add useful context</h2><div style={{ border: `1px solid ${star}`, minHeight: 118, padding: 14, borderRadius: 12, boxShadow: "0 0 0 3px rgb(67 56 202 / .10)", color: navy, fontSize: 15, lineHeight: 1.45 }}>{profile}{chars < 91 && <span style={{ color: star }}>|</span>}</div><div style={{ marginTop: 13, color: muted, fontSize: 13, lineHeight: 1.4 }}>Your background makes the ranking more useful. It does not guarantee an outcome.</div><div style={{ marginTop: 18, borderRadius: 10, padding: "12px 14px", background: signal, color: "#fff", textAlign: "center", fontWeight: 800, fontSize: 15, opacity: scored }}>Refresh ranking</div></AppCard>
    <AppCard style={{ overflow: "hidden" }}><div style={{ padding: "18px 24px", background: "linear-gradient(90deg, rgb(67 56 202 / .09), transparent)", borderBottom: `1px solid ${line}` }}><div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ color: star, fontSize: 12, fontWeight: 850, letterSpacing: 1, textTransform: "uppercase" }}>Ranked people</div><h2 style={{ margin: "6px 0 1px", fontSize: 27, letterSpacing: -1.3 }}>Worth pursuing for you</h2></div><div style={{ color: muted, fontSize: 13, paddingTop: 8 }}>Score reasons visible</div></div></div>
      {[["Matti Meikäläinen", "CTO", 92, "TypeScript · developer tools · decision power"], ["Jane Smith", "Head of Product", 76, "Product fit · decision power"], ["Alex Johnson", "Engineering Manager", 72, "Engineering focus · public context"]].map(([name, title, score, reason], index) => <div key={name as string} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 23px", borderBottom: `1px solid ${line}`, opacity: scored, transform: `translateX(${(1 - scored) * 28}px)`, background: index === 0 ? "rgb(67 56 202 / .055)" : surface }}><Score accent={index === 0 ? star : index === 1 ? teal : amber}>{Math.round((score as number) * (0.75 + scored * .25))}</Score><div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 800 }}>{name as string} <span style={{ color: muted, fontWeight: 500 }}>· {title as string}</span></div><div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{reason as string}</div></div>{index === 0 && <div style={{ color: star, fontSize: 12, fontWeight: 850 }}>TOP MATCH</div>}</div>)}
      <div style={{ padding: "12px 23px", color: muted, fontSize: 12 }}>Scores are a prioritisation aid, supported by visible reasons.</div>
    </AppCard>
  </div>;
}

export function ProductFlow({ from, duration }: ProductFlowProps) {
  const frame = useCurrentFrame();
  const local = frame - from;
  const fadeIn = reveal(local, 0, 10);
  const fadeOut = interpolate(local, [duration - 12, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const screenStage = local < 120 ? 0 : local < 240 ? 1 : local < 510 ? 2 : 3;
  return <AbsoluteFill style={{ opacity: fadeIn * fadeOut, background: `radial-gradient(58rem 28rem at 95% -8%, rgb(67 56 202 / .15), transparent 62%), linear-gradient(180deg, #fff, ${page})`, color: navy, fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", overflow: "hidden" }}>
    <PipelineLabel local={local} />
    <div style={{ position: "absolute", left: 112, right: 112, top: 166, bottom: 86, borderRadius: 27, overflow: "hidden", background: surface, border: `1px solid ${line}`, boxShadow: "0 3px 5px rgb(11 27 63 / .06), 0 32px 68px -30px rgb(30 58 138 / .42)" }}><TopBar />
      {screenStage === 0 && <SearchForm local={local} />}
      {screenStage === 1 && <SearchProgress local={local} />}
      {screenStage === 2 && <KeyPeople local={local} />}
      {screenStage === 3 && <ProfileRanking local={local} />}
    </div>
  </AbsoluteFill>;
}
