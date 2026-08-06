import { expect, test } from "bun:test";

import { DEFAULT_CODE, STORAGE_KEY, loadCode, persistCode } from "./use-studio-workspace";
import { createProjectArchive, decodeCodeShareHash } from "./file-io";
import { strFromU8, unzipSync } from "fflate";

test("single-file persistence falls back to the default document", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };

  expect(loadCode(storage)).toBe(DEFAULT_CODE);
  expect(persistCode("sphere(2);", storage)).toBe(true);
  expect(values.get(STORAGE_KEY)).toBe("sphere(2);");
  expect(loadCode(storage)).toBe("sphere(2);");
});

test("shared code hash decodes into the single-file document", () => {
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode("cube(4);")));
  expect(decodeCodeShareHash(`#code=${encodeURIComponent(encoded)}`)).toBe("cube(4);");
});

test("portable project archive contains a versioned single-file manifest", () => {
  const archive = unzipSync(createProjectArchive("cube(2);", "part.scad"));
  expect(JSON.parse(strFromU8(archive["ise-studio.json"]!))).toEqual({
    version: 1,
    code: "cube(2);",
    fileName: "part.scad",
  });
});
