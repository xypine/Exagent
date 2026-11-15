import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
} from "remotion";

import logo from "../../../frontend/public/logo.svg";

const navy = "#0b1b3f";
const indigo = "#4338ca";
const blue = "#1e3a8a";
const muted = "#5a6685";
const sans = "Inter, ui-sans-serif, system-ui, sans-serif";
const serif = "Instrument Serif, Georgia, serif";

type ApplicantSeaProps = {
  from: number;
  duration: number;
};

type Applicant = {
  x: number;
  y: number;
  scale: number;
  phase: number;
};

const applicants: Applicant[] = Array.from({ length: 168 }, (_, index) => {
  const column = index % 21;
  const row = Math.floor(index / 21);

  return {
    x: 7 + column * 4.55 + ((row * 17 + column * 11) % 10) / 10,
    y: 26 + row * 8.1 + ((column * 13 + row * 7) % 12) / 10,
    scale: 0.72 + ((index * 19) % 29) / 100,
    phase: index * 0.71,
  };
});

const easeIn = (frame: number, start: number, length: number) =>
  interpolate(frame, [start, start + length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

function PersonGlyph({
  applicant,
  local,
  featured,
}: {
  applicant: Applicant;
  local: number;
  featured: boolean;
}) {
  const driftX = Math.sin(local / 19 + applicant.phase) * 11;
  const driftY = Math.cos(local / 24 + applicant.phase * 1.4) * 8;
  const settle = easeIn(local, 82, 42);
  const featuredScale = featured ? 1.16 - settle * 0.29 : 1;
  const color = featured && settle < 0.75 ? indigo : blue;

  return (
    <div
      style={{
        position: "absolute",
        left: `${applicant.x}%`,
        top: `${applicant.y}%`,
        width: 20,
        height: 27,
        opacity: featured ? 1 : 0.48 + ((applicant.phase * 10) % 4) / 20,
        transform: `translate(-50%, -50%) translate(${driftX}px, ${driftY}px) scale(${applicant.scale * featuredScale})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 6,
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: color,
          boxShadow:
            featured && settle < 0.45
              ? "0 0 0 7px rgb(67 56 202 / .12)"
              : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 2,
          bottom: 0,
          width: 17,
          height: 14,
          borderRadius: "10px 10px 4px 4px",
          background: color,
        }}
      />
    </div>
  );
}

export function ApplicantSea({ from, duration }: ApplicantSeaProps) {
  const frame = useCurrentFrame();
  const local = frame - from;
  const enter = easeIn(local, 0, 14);
  const copy = easeIn(local, 20, 17);
  const sea = easeIn(local, 12, 24);
  const fadeOut = interpolate(local, [duration - 12, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const featuredPulse = spring({
    frame: Math.max(0, local - 44),
    fps: 30,
    config: { damping: 16, stiffness: 125 },
  });
  const pageStyle: CSSProperties = {
    background:
      "radial-gradient(60rem 36rem at 75% 95%, rgb(67 56 202 / .15), transparent 63%), radial-gradient(45rem 27rem at 0% -8%, rgb(30 58 138 / .11), transparent 65%), linear-gradient(180deg, #fff 0%, #f4f6fb 100%)",
    color: navy,
    fontFamily: sans,
    opacity: enter * fadeOut,
    overflow: "hidden",
  };

  return (
    <AbsoluteFill style={pageStyle}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.65,
          backgroundImage:
            "linear-gradient(rgb(67 56 202 / .05) 1px, transparent 1px), linear-gradient(90deg, rgb(67 56 202 / .05) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "linear-gradient(to bottom, black, transparent 78%)",
        }}
      />
      <header
        style={{
          position: "absolute",
          top: 44,
          left: 72,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: 9,
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: -1.2,
        }}
      >
        <Img src={logo} style={{ width: 35, height: 35 }} />
        Exagent
      </header>

      <div
        style={{
          position: "absolute",
          left: 123,
          top: 188,
          zIndex: 2,
          width: 580,
          opacity: copy,
          transform: `translateY(${(1 - copy) * 24}px)`,
        }}
      >
        <div
          style={{
            color: indigo,
            fontFamily: serif,
            fontSize: 31,
            fontStyle: "italic",
          }}
        >
          Applying is crowded.
        </div>
        <h1
          style={{
            maxWidth: 530,
            margin: "15px 0 0",
            fontSize: 76,
            letterSpacing: -4.2,
            lineHeight: 0.98,
          }}
        >
          One applicant among <span style={{ color: indigo }}>thousands.</span>
        </h1>
      </div>

      <div
        style={{
          position: "absolute",
          top: 144,
          right: 76,
          bottom: 104,
          left: 770,
          overflow: "hidden",
          border: "1px solid rgb(67 56 202 / .20)",
          borderRadius: 38,
          background:
            "radial-gradient(circle at 50% 43%, rgb(67 56 202 / .10), transparent 29%), linear-gradient(145deg, rgb(255 255 255 / .96), rgb(231 235 250 / .73))",
          boxShadow: "0 30px 68px -34px rgb(30 58 138 / .42)",
          opacity: sea,
          transform: `translateY(${(1 - sea) * 26}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 36,
            top: 32,
            color: muted,
            fontSize: 15,
            fontWeight: 750,
            letterSpacing: 1.1,
            textTransform: "uppercase",
          }}
        >
          The applicant sea
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${0.96 + featuredPulse * 0.04})`,
          }}
        >
          {applicants.map((applicant, index) => (
            <PersonGlyph
              key={index}
              applicant={applicant}
              local={local}
              featured={index === 87}
            />
          ))}
        </div>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0.22,
            pointerEvents: "none",
          }}
        >
          {[34, 49, 64, 79].map((y) => (
            <path
              key={y}
              d={`M 0 ${y} C 17 ${y - 8}, 34 ${y + 7}, 53 ${y} S 84 ${y - 8}, 100 ${y}`}
              fill="none"
              stroke={indigo}
              strokeWidth="0.15"
            />
          ))}
        </svg>
      </div>
    </AbsoluteFill>
  );
}
