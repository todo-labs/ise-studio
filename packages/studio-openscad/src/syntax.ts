import { runOpenSCAD } from "./worker-client";
import type { CompileProjectFile } from "./compiler";
import { buildSyntaxInvocation } from "./invocation";

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
  const { invocation, entryPath } = buildSyntaxInvocation({
    files: options.files?.length ? options.files : [{ path: "input.scad", content: code }],
    entryPath: options.entryPath ?? "input.scad",
    preview: true,
  });

  const result = await runOpenSCAD(invocation);
  const errors = parseSyntaxErrors(result.stderr, entryPath);

  return {
    valid: errors.filter((e) => e.severity === "error").length === 0 && result.exitCode === 0,
    errors,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export function parseSyntaxErrors(stderr: string, entryPath = "/input.scad"): SyntaxError[] {
  const errors: SyntaxError[] = [];
  const escapedEntryPath = escapeRegex(entryPath);
  const errorRegex = new RegExp(
    `"?(?:${escapedEntryPath})"?:?(\\d+)?(?::?\\s*(warning|ERROR):\\s*)?(.+)`,
    "g",
  );

  for (const line of stderr.split("\n")) {
    const match = errorRegex.exec(line);
    if (match) {
      const lineNum = match[1] ? Number.parseInt(match[1], 10) - 1 : 0;
      const severity = match[2]?.toLowerCase() === "warning" ? "warning" : "error";
      errors.push({
        line: Math.max(0, lineNum),
        column: 0,
        message: match[3] || line,
        severity,
      });
    }
    errorRegex.lastIndex = 0;
  }

  return errors;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
