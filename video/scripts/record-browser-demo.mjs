import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const mode = process.argv[2] ?? "app";
const fps = 12;
const width = 1920;
const height = 1080;
const durationMs = mode === "pipeline" ? 13_000 : 20_000;
const output = resolve(root, "video/public/recordings", `${mode}.mp4`);
const frames = resolve(root, "video/out/recordings", `${mode}-frames`);
const devtoolsPort = mode === "pipeline" ? 9334 : 9333;
const browser = process.env.CHROMIUM ?? "chromium";
const ffmpeg = process.env.FFMPEG ?? "ffmpeg";

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

async function waitFor(getValue, timeoutMs = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await getValue();
      if (value) return value;
    } catch {
      // The browser has not opened its DevTools endpoint yet.
    }
    await wait(100);
  }
  throw new Error("Timed out while waiting for Chromium.");
}

async function connect() {
  const target = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${devtoolsPort}/json/list`);
    const pages = await response.json();
    return pages.find((page) => page.type === "page");
  });
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", rejectOpen, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const resolvePending = pending.get(message.id);
    if (!resolvePending) return;
    pending.delete(message.id);
    if (message.error) {
      resolvePending.reject(new Error(message.error.message));
    } else {
      resolvePending.resolve(message.result);
    }
  });

  return {
    async send(method, params = {}) {
      const id = ++sequence;
      const result = new Promise((resolvePending, rejectPending) => {
        pending.set(id, { resolve: resolvePending, reject: rejectPending });
      });
      socket.send(JSON.stringify({ id, method, params }));
      return result;
    },
    close() {
      socket.close();
    },
  };
}

async function main() {
  if (!new Set(["app", "pipeline"]).has(mode)) {
    throw new Error("Usage: record-browser-demo.mjs [app|pipeline]");
  }

  await rm(frames, { recursive: true, force: true });
  await mkdir(frames, { recursive: true });
  await mkdir(dirname(output), { recursive: true });
  const profile = await mkdtemp(resolve(tmpdir(), "exagent-browser-recording-"));
  const chromium = spawn(
    browser,
    [
      "--headless=new",
      `--remote-debugging-port=${devtoolsPort}`,
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let client;
  try {
    client = await connect();
    await client.send("Page.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send("Page.navigate", { url: "http://127.0.0.1:4173" });
    await wait(1_000);

    const evaluate = (expression) =>
      client.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
    const click = async (selector) => {
      const result = await evaluate(`(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) return null;
        element.scrollIntoView({ block: "center", behavior: "instant" });
        const rect = element.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`);
      const point = result.result.value;
      if (!point) return;
      await client.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: point.x,
        y: point.y,
        button: "left",
        clickCount: 1,
      });
      await client.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: point.x,
        y: point.y,
        button: "left",
        clickCount: 1,
      });
    };
    const type = async (selector, text) => {
      await click(selector);
      for (const character of text) {
        await client.send("Input.insertText", { text: character });
        await wait(85);
      }
    };
    const clickByText = async (text) => {
      const result = await evaluate(`(() => {
        const element = [...document.querySelectorAll('button')].find((button) =>
          button.textContent?.includes(${JSON.stringify(text)}),
        );
        if (!element) return null;
        element.scrollIntoView({ block: 'center', behavior: 'instant' });
        const rect = element.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`);
      const point = result.result.value;
      if (!point) return;
      await client.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: point.x,
        y: point.y,
        button: "left",
        clickCount: 1,
      });
      await client.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: point.x,
        y: point.y,
        button: "left",
        clickCount: 1,
      });
    };

    const actions = mode === "pipeline"
      ? [
          [400, () => evaluate("window.scrollTo({ top: document.querySelector('#how-it-works').offsetTop - 20, behavior: 'instant' })")],
          [2_200, () => evaluate("window.scrollBy({ top: 860, behavior: 'instant' })")],
          [4_000, () => evaluate("window.scrollBy({ top: 860, behavior: 'instant' })")],
          [5_800, () => evaluate("window.scrollBy({ top: 860, behavior: 'instant' })")],
          [7_600, () => evaluate("window.scrollBy({ top: 860, behavior: 'instant' })")],
          [9_400, () => evaluate("window.scrollBy({ top: 860, behavior: 'instant' })")],
        ]
      : [
          [450, () => type("#industry", "SaaS")],
          [2_000, () => click("button[type='submit']")],
          [6_000, () => click("button[aria-label^='Alan Parson']")],
          [8_800, () => click("button[aria-label='Close']")],
          [9_600, () => click("button[aria-label='Expand Sharpen your matches']")],
          [10_200, () => type("textarea", "TypeScript and React graduate interested in product teams." )],
          [15_700, () => clickByText("Refresh scores with this profile")],
        ];
    let actionIndex = 0;
    const started = Date.now();
    let frame = 0;
    while (Date.now() - started < durationMs) {
      const elapsed = Date.now() - started;
      while (actions[actionIndex] && elapsed >= actions[actionIndex][0]) {
        void actions[actionIndex][1]();
        actionIndex += 1;
      }
      const screenshot = await client.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 90,
        captureBeyondViewport: false,
      });
      frame += 1;
      await writeFile(
        resolve(frames, `frame-${String(frame).padStart(5, "0")}.jpg`),
        Buffer.from(screenshot.data, "base64"),
      );
      const nextFrameAt = started + frame * (1_000 / fps);
      await wait(Math.max(0, nextFrameAt - Date.now()));
    }

    const captureRate = frame / (durationMs / 1_000);
    await new Promise((resolveEncode, rejectEncode) => {
      const encoder = spawn(
        ffmpeg,
        [
          "-y",
          "-framerate", String(captureRate),
          "-i", resolve(frames, "frame-%05d.jpg"),
          "-c:v", "libx264",
          "-crf", "18",
          "-pix_fmt", "yuv420p",
          output,
        ],
        { stdio: "inherit" },
      );
      encoder.on("error", rejectEncode);
      encoder.on("exit", (code) =>
        code === 0 ? resolveEncode() : rejectEncode(new Error(`FFmpeg exited with ${code}.`)),
      );
    });
    console.log(`Recorded ${mode} UI footage: ${output}`);
  } finally {
    client?.close();
    chromium.kill();
    if (chromium.exitCode === null) {
      await Promise.race([once(chromium, "exit"), wait(2_000)]);
    }
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

await main();
