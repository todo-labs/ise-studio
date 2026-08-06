import { expect, test } from "bun:test";

import { analyzeOffGeometry } from "./ai-tools";

test("scene analysis reports bounds and overhang risk for OFF geometry", () => {
  const off = [
    "OFF",
    "4 4 0",
    "0 0 0",
    "10 0 0",
    "0 10 0",
    "0 0 10",
    "3 0 1 2",
    "3 0 3 1",
    "3 0 2 3",
    "3 1 3 2",
  ].join("\n");

  const result = analyzeOffGeometry(new TextEncoder().encode(off));
  expect(result?.vertices).toBe(4);
  expect(result?.faces).toBe(4);
  expect(result?.bounds).toEqual({ min: [0, 0, 0], max: [10, 10, 10] });
  expect(result?.printability.overhangRisk).toBe("high");
});
