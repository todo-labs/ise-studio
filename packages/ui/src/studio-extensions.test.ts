import { expect, test } from "bun:test";

import {
  getRegisteredStudioExtensions,
  registerStudioExtension,
  unregisterStudioExtension,
} from "./studio-extensions";

test("studio extensions register, replace, and unregister command providers", () => {
  unregisterStudioExtension("test-extension");
  const unregister = registerStudioExtension({
    id: "test-extension",
    name: "Test Extension",
    commands: [{ id: "hello", label: "Say hello", hint: "Test command", run: () => {} }],
  });

  expect(getRegisteredStudioExtensions()).toMatchObject([
    { id: "test-extension", name: "Test Extension" },
  ]);
  expect(unregister()).toBe(true);
  expect(
    getRegisteredStudioExtensions().some((extension) => extension.id === "test-extension"),
  ).toBe(false);
});

test("extension modules accept a default factory through the plugin seam", async () => {
  const moduleUrl = `data:text/javascript,${encodeURIComponent("export default () => ({ id: 'module-extension', name: 'Module Extension' })")}`;
  const unregister = await import("./studio-extensions").then(({ loadStudioExtension }) =>
    loadStudioExtension(moduleUrl),
  );

  expect(getRegisteredStudioExtensions()).toContainEqual({
    id: "module-extension",
    name: "Module Extension",
  });
  expect(unregister()).toBe(true);
});
