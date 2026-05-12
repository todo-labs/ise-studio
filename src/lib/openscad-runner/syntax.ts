import { runOpenSCAD } from "./worker-client";
import type { CompileProjectFile } from "./compiler";

export interface SyntaxCheckResult {
  valid: boolean;
  errors: SyntaxError[];
  stdout: string;
  stderr: string;
}

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export async function checkSyntax(
  code: string,
  options: { files?: CompileProjectFile[]; entryPath?: string } = {},
): Promise<SyntaxCheckResult> {
  const checkFile = "/input.ast";
  const entryPath = normalizeRunnerPath(options.entryPath ?? "input.scad");
  const files = options.files?.length
    ? options.files.map((file) => ({
        path: normalizeRunnerPath(file.path),
        content:
          normalizeRunnerPath(file.path) === entryPath && typeof file.content === "string"
            ? `$preview=true;\n${file.content}`
            : file.content,
      }))
    : [{ path: "/input.scad", content: `$preview=true;\n${code}` }];

  const result = await runOpenSCAD({
    inputs: files,
    args: ["-o", checkFile, entryPath],
    outputPaths: [checkFile],
  });

  const errors: SyntaxError[] = [];
  const errorRegex = /"?(\/input\.scad)?:?(\d+)?"?(?::?\s*(warning|ERROR):\s*)?(.+)/g;
  for (const line of result.stderr.split("\n")) {
    const match = errorRegex.exec(line);
    if (match) {
      const lineNum = match[2] ? Number.parseInt(match[2], 10) - 1 : 0;
      const severity = match[3]?.toLowerCase() === "warning" ? "warning" : "error";
      errors.push({
        line: Math.max(0, lineNum),
        column: 0,
        message: match[4] || line,
        severity: severity as "error" | "warning",
      });
    }
    errorRegex.lastIndex = 0;
  }

  return {
    valid: errors.filter((e) => e.severity === "error").length === 0 && result.exitCode === 0,
    errors,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function normalizeRunnerPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}
