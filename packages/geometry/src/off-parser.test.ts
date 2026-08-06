import { expect, test } from "bun:test";

import { parseBinarySTL, parseOFF } from "./off-parser";

test("OFF parser triangulates faces and computes normals", () => {
  const mesh = parseOFF(`OFF\n3 1 0\n0 0 0\n1 0 0\n0 1 0\n3 0 1 2`);

  expect(mesh.numVertices).toBe(3);
  expect(mesh.numFaces).toBe(1);
  expect(Array.from(mesh.indices)).toEqual([0, 1, 2]);
  expect(Array.from(mesh.normals.slice(0, 3))).toEqual([0, 0, 1]);
});

test("binary STL parser reads triangle vertices and normals", () => {
  const buffer = new ArrayBuffer(84 + 50);
  const view = new DataView(buffer);
  view.setUint32(80, 1, true);
  const values = [
    0, 0, 1,
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
  ];
  values.forEach((value, index) => view.setFloat32(84 + index * 4, value, true));

  const mesh = parseBinarySTL(buffer);

  expect(mesh.numVertices).toBe(3);
  expect(mesh.numFaces).toBe(1);
  expect(Array.from(mesh.vertices.slice(0, 9))).toEqual(values.slice(3));
  expect(Array.from(mesh.normals.slice(0, 3))).toEqual([0, 0, 1]);
});
