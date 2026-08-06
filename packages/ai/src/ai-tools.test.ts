import { expect, test } from "bun:test";

import { runLocalTool } from "./ai-tools";

test("selection patching changes only the active range", async () => {
  const result = JSON.parse(
    await runLocalTool(
      "apply_patch_to_selection",
      JSON.stringify({ replacement: "sphere(2);" }),
      {
        currentCode: "cube(1);\nsphere(1);",
        selection: {
          text: "cube(1);",
          range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 9,
          },
        },
      },
    ),
  ) as { applied: boolean; updatedCode: string };

  expect(result.applied).toBe(true);
  expect(result.updatedCode).toBe("sphere(2);\nsphere(1);");
});
