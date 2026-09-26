import { expect, test } from "bun:test";

import { buildCompileInvocation, buildSyntaxInvocation } from "../invocation";
import { parseSyntaxErrors } from "../syntax";

test("compile invocation normalizes the source path and injects preview", () => {
  const built = buildCompileInvocation({
    code: "cube(1);",
    fileName: "main.scad",
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
  expect(built.invocation.inputs).toEqual([{
    path: "/main.scad",
    content: "$preview=true;\ncube(1);",
  }]);
});

test("syntax invocation uses an ast output and mounts the source", () => {
  const built = buildSyntaxInvocation({
    code: "cube(1);",
    fileName: "main.scad",
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
