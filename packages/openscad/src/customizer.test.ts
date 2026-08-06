import { expect, test } from "bun:test";

import { parseCustomizerControls, updateCustomizerValue } from "./customizer";

test("customizer annotations produce numeric, select, and boolean controls", () => {
  const code = 'width = 20; // [1:40:1]\nshape = "cube"; // [cube, sphere]\nsolid = true; // [true, false]';
  const controls = parseCustomizerControls(code);

  expect(controls.map(({ name, type }) => ({ name, type }))).toEqual([
    { name: "width", type: "number" },
    { name: "shape", type: "select" },
    { name: "solid", type: "boolean" },
  ]);
  expect(updateCustomizerValue(code, controls[0]!, 32)).toContain("width = 32;");
});
