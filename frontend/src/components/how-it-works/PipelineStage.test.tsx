import { cleanup, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";

import { DEMO_COMPANIES, DEMO_PEOPLE } from "../../howItWorks";
import { PipelineStage } from "./PipelineStage";

function companyNode(index = 0) {
  return screen
    .getByText(DEMO_COMPANIES[index])
    .closest(".stage-node") as HTMLElement;
}

function personNode() {
  return screen.getByRole("button", { name: /^Alan Parson,/ });
}

function counter(label: string) {
  return screen.getByText(label).textContent?.replace(/\s+/g, " ").trim();
}

describe("PipelineStage transitions", () => {
  afterEach(cleanup);

  it("keeps companies at the dot convergence point when returning to input", () => {
    const [step, setStep] = createSignal(1);
    render(() => <PipelineStage step={step()} onJump={() => {}} />);

    expect(companyNode().style.top).toBe("45%");
    setStep(0);

    expect(companyNode().style.top).toBe("45%");
    expect(companyNode().style.opacity).toBe("0");
  });

  it("shows the pre-redesign details and progressive totals", () => {
    const [step, setStep] = createSignal(0);
    render(() => <PipelineStage step={step()} onJump={() => {}} />);

    const companyCount = String(DEMO_COMPANIES.length).padStart(2, "0");
    const peopleCount = String(DEMO_PEOPLE.length).padStart(2, "0");
    const sourceCount = String(
      DEMO_PEOPLE.reduce((total, person) => total + person.sources, 0),
    ).padStart(2, "0");
    const expected = [
      ["00 companies", "00 people", "00 sources", "00 scored"],
      [`${companyCount} companies`, "00 people", "00 sources", "00 scored"],
      [
        `${companyCount} companies`,
        `${peopleCount} people`,
        "00 sources",
        "00 scored",
      ],
      [
        `${companyCount} companies`,
        `${peopleCount} people`,
        `${sourceCount} sources`,
        "00 scored",
      ],
      [
        `${companyCount} companies`,
        `${peopleCount} people`,
        `${sourceCount} sources`,
        `${peopleCount} scored`,
      ],
    ];

    expect(personNode().textContent).toContain("AP");
    expect(screen.getByText("Example data")).not.toBeNull();

    for (const [nextStep, counts] of expected.entries()) {
      setStep(nextStep);
      expect([
        counter("companies"),
        counter("people"),
        counter("sources"),
        counter("scored"),
      ]).toEqual(counts);
    }

    setStep(5);
    expect(screen.getByText("Tap a person ↑")).not.toBeNull();
    expect(screen.queryByText("Example data")).toBeNull();
  });

  it("moves people and connectors from the visible company row", () => {
    const [step, setStep] = createSignal(1);
    const { container } = render(() => (
      <PipelineStage step={step()} onJump={() => {}} />
    ));
    const paths = () => [...container.querySelectorAll(".stage > svg > path")];
    const companyConnector = () =>
      container
        .querySelectorAll(".stage > svg > path")
        .item(DEMO_COMPANIES.length);

    expect(
      paths().map((path) => (path as SVGPathElement).style.transitionDelay),
    ).toEqual([
      "0ms",
      "90ms",
      "180ms",
      "270ms",
      "0ms",
      "90ms",
      "180ms",
      "270ms",
    ]);
    expect(personNode().style.top).toBe("calc(45% - var(--node) / 2)");
    expect(companyConnector().getAttribute("d")).toBe("M 14 48 L 14 48");

    setStep(2);
    expect(personNode().style.top).toBe("calc(34% - var(--node) / 2)");
    expect(companyConnector().getAttribute("d")).toBe("M 14 18 L 14 66");

    setStep(1);
    expect(personNode().style.top).toBe("calc(45% - var(--node) / 2)");
    expect(companyConnector().getAttribute("d")).toBe("M 14 48 L 14 48");
  });
});
