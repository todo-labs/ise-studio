import { expect, test } from "bun:test";

import { createVisualBlock, generateOpenSCADFromBlocks } from "./visual-blocks";

test("visual blocks generate valid OpenSCAD primitives", () => {
  const cube = createVisualBlock("cube", "base");
  cube.size = [32, 24, 18];
  cube.center = false;
  cube.transform.translate = [-16, -12, 0];

  const code = generateOpenSCADFromBlocks([cube, createVisualBlock("sphere", "cap")]);

  expect(code).toContain("union() {");
  expect(code).toContain("translate([-16, -12, 0])");
  expect(code).toContain("cube([32, 24, 18], center = false);");
  expect(code).toContain("sphere(r = 10);");
});

test("empty visual block documents remain editable", () => {
  expect(generateOpenSCADFromBlocks([])).toBe("// Add a block to begin\n");
});
