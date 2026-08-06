export function formatOpenSCAD(code: string): string {
  let indent = 0;
  return code
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line, index, lines) => line.length > 0 || (index > 0 && index < lines.length - 1))
    .map((line) => {
      if (line.startsWith("}")) indent = Math.max(0, indent - 1);
      const formatted = `${"  ".repeat(indent)}${line}`;
      if (line.endsWith("{")) indent += 1;
      if (line.startsWith("}") && line.endsWith("{")) indent += 1;
      return formatted;
    })
    .join("\n");
}
