import { expect, test } from "bun:test";

import { reverseEngineerSTL } from "./stl-reverse-engineering";

const asciiBox = `solid box
facet normal 0 0 1
 outer loop
  vertex 0 0 0
  vertex 10 0 0
  vertex 10 10 0
 endloop
endfacet
facet normal 0 0 1
 outer loop
  vertex 0 0 0
  vertex 10 10 0
  vertex 0 10 0
 endloop
endfacet
endsolid box`;

test("reverse engineers ASCII STL bounds and emits editable OpenSCAD", () => {
  const result = reverseEngineerSTL(new TextEncoder().encode(asciiBox));

  expect(result.format).toBe("ascii");
  expect(result.triangles).toBe(2);
  expect(result.dimensions).toEqual([10, 10, 0]);
  expect(result.code).toContain("polyhedron(");
  expect(result.code).toContain("points =");
});
