import { expect, test } from "bun:test";

import type { BrowserProject, ProjectMutation } from "@ise-studio/project";

import { createOpenRouterAssistantTools } from "./assistant-tool-registry";

test("assistant project file tools validate editable paths and emit mutations", async () => {
  const mutations: ProjectMutation[] = [];
  const tools = createOpenRouterAssistantTools({
    getCurrentProject: () => makeProject(),
    getCurrentSelection: () => null,
    onProjectMutation: (mutation) => mutations.push(mutation),
  });

  const invalid = await tools.create_project_file.execute({ path: "mesh.stl" }, {} as never);
  const created = await tools.create_project_file.execute(
    { path: "part", content: "cube(1);" },
    {} as never,
  );
  const updated = await tools.update_project_file.execute(
    { path: "main.scad", content: "sphere(1);" },
    {} as never,
  );

  expect(invalid).toEqual({
    ok: false,
    error: "AI-created editable files must use the .scad extension.",
  });
  expect(created).toEqual({ ok: true, path: "part.scad" });
  expect(updated).toEqual({ ok: true, path: "main.scad" });
  expect(mutations).toEqual([
    { type: "create-file", path: "part.scad", content: "cube(1);" },
    { type: "update-file", path: "main.scad", content: "sphere(1);" },
  ]);
});

function makeProject(): BrowserProject {
  return {
    id: "project",
    name: "Project",
    activeFilePath: "main.scad",
    createdAt: 1,
    updatedAt: 1,
    files: [{ path: "main.scad", kind: "scad", content: "cube(1);" }],
  };
}
