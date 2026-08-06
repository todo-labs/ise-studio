export type CustomizerValue = number | string | boolean;

export interface CustomizerControl {
  name: string;
  label: string;
  type: "number" | "select" | "boolean";
  value: CustomizerValue;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  line: number;
}

const ASSIGNMENT = /^(\s*)([A-Za-z_]\w*)\s*=\s*([^;]+);(.*)$/;
const RANGE = /^\[\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)(?:\s*:\s*(-?\d+(?:\.\d+)?))?\s*\]$/;

export function parseCustomizerControls(code: string): CustomizerControl[] {
  return code.split(/\r?\n/).flatMap<CustomizerControl>((line, index): CustomizerControl[] => {
    const match = line.match(ASSIGNMENT);
    if (!match) return [];

    const name = match[2];
    const rawValue = match[3];
    const trailing = match[4];
    if (!name || rawValue == null || trailing == null || name.startsWith("$")) return [];
    const annotation = trailing.match(/\/\/\s*(.*)$/)?.[1]?.trim();
    if (!annotation) return [];

    const range = annotation.match(RANGE);
    const value = parseValue(rawValue.trim());
    if (range && typeof value === "number") {
      const min = Number(range[1]);
      const max = Number(range[2]);
      const step = range[3] ? Number(range[3]) : inferStep(min, max);
      if (Number.isFinite(min) && Number.isFinite(max) && min <= max) {
        return [{ name, label: humanize(name), type: "number", value, min, max, step, line: index + 1 }];
      }
    }

    const options = annotation
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split(",")
      .map((option) => option.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
    if (
      typeof value === "boolean" &&
      options.length === 2 &&
      options.includes("true") &&
      options.includes("false")
    ) {
      return [{ name, label: humanize(name), type: "boolean", value, options, line: index + 1 }];
    }
    if (options.length >= 2 && options.length <= 32 && options.includes(String(value))) {
      return [{ name, label: humanize(name), type: "select", value, options, line: index + 1 }];
    }

    if (typeof value === "boolean" && options.length === 0) {
      return [{ name, label: humanize(name), type: "boolean", value, options: ["true", "false"], line: index + 1 }];
    }
    return [];
  });
}

export function updateCustomizerValue(code: string, control: CustomizerControl, nextValue: CustomizerValue) {
  const lines = code.split(/\r?\n/);
  const lineIndex = control.line - 1;
  const line = lines[lineIndex];
  if (line == null) return code;
  const match = line.match(ASSIGNMENT);
  if (!match || match[2] !== control.name) return code;

  const serialized = control.type === "select" ? `"${String(nextValue).replaceAll('"', '\\"')}"` : String(nextValue);
  lines[lineIndex] = `${match[1]}${match[2]} = ${serialized};${match[4]}`;
  return lines.join("\n");
}

function parseValue(value: string): CustomizerValue {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value.replace(/^['"]|['"]$/g, "");
}

function inferStep(min: number, max: number) {
  const span = Math.abs(max - min);
  return span >= 100 ? 1 : span >= 10 ? 0.5 : 0.1;
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
