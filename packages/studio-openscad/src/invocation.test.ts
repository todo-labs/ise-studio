import { expect, test } from "bun:test";

import { buildCompileInvocation, buildSyntaxInvocation } from "./invocation";
import { parseSyntaxErrors } from "./syntax";

test("compile invocation normalizes paths and injects preview only into the entry file", () => {
  const built = buildCompileInvocation({
    files: [
      { path: "main.scad", content: "cube(1);" },
      { path: "lib.scad", content: "module part() {}" },
    ],
    entryPath: "main.scad",
    format: "off",
    preview: true,
  });

  expect(built.outputPath).toBe("/output.off");
  expect(built.invocation.args).toEqual([
    "--backend=manifold",
    "--export-format=off",
    "-o",
    "/output.off",
    "/main.scad",
  ]);
  expect(built.invocation.inputs[0]).toEqual({
    path: "/main.scad",
    content: "$preview=true;\ncube(1);",
  });
  expect(built.invocation.inputs[1]).toEqual({
    path: "/lib.scad",
    content: "module part() {}",
  });
});

test("syntax invocation uses an ast output and mounted project sources", () => {
  const built = buildSyntaxInvocation({
    files: [{ path: "main.scad", content: "cube(1);" }],
    entryPath: "main.scad",
    preview: true,
  });

  expect(built.astPath).toBe("/input.ast");
  expect(built.invocation.args).toEqual(["-o", "/input.ast", "/main.scad"]);
  expect(built.invocation.outputPaths).toEqual(["/input.ast"]);
});

test("syntax stderr parsing maps OpenSCAD lines to zero-based diagnostics", () => {
  const errors = parseSyntaxErrors('/main.scad:12: ERROR: Parser error\n"/main.scad":3: warning: deprecated', "/main.scad");

  expect(errors).toEqual([
    { line: 11, column: 0, message: "Parser error", severity: "error" },
    { line: 2, column: 0, message: "deprecated", severity: "warning" },
  ]);
});
