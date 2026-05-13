import { expect, test } from "bun:test";

import type { BrowserProject } from "./model";
import {
  createDebouncedProjectSave,
  createWorkspaceProject,
  ensureActiveFileFallback,
  mutateWorkspaceActiveProject,
  selectWorkspaceProject,
  type StudioWorkspace,
} from "./workspace";

test("workspace selection falls back to the first project", () => {
  const workspace = createWorkspace(["one", "two"], "two");

  expect(selectWorkspaceProject(workspace, "missing").activeProjectId).toBe("one");
});

test("project mutations keep an active file fallback", () => {
  const workspace = createWorkspace(["project"], "project");
  const updated = mutateWorkspaceActiveProject(workspace, {
    type: "delete-file",
    path: "main.scad",
  });

  expect(updated.projects[0]?.activeFilePath).toBe("alt.scad");
});

test("creating a workspace project appends and selects it", () => {
  const workspace = createWorkspace(["existing"], "existing");
  const project = makeProject("new-project");
  const result = createWorkspaceProject(workspace, project);

  expect(result.workspace.projects.map((item) => item.id)).toEqual(["existing", "new-project"]);
  expect(result.workspace.activeProjectId).toBe("new-project");
});

test("debounced project save calls the persistence adapter once with the latest project", async () => {
  const saved: string[] = [];
  const saver = createDebouncedProjectSave(async (project) => {
    saved.push(project.id);
  }, 1);

  saver.schedule(makeProject("first"));
  saver.schedule(makeProject("second"));
  await new Promise((resolve) => setTimeout(resolve, 5));

  expect(saved).toEqual(["second"]);
});

test("active file fallback prefers editable files", () => {
  const project = makeProject("project", "missing.off");

  expect(ensureActiveFileFallback(project).activeFilePath).toBe("main.scad");
});

function createWorkspace(ids: string[], activeProjectId: string): StudioWorkspace {
  return {
    projects: ids.map((id) => makeProject(id)),
    activeProjectId,
  };
}

function makeProject(id: string, activeFilePath = "main.scad"): BrowserProject {
  return {
    id,
    name: id,
    activeFilePath,
    createdAt: 1,
    updatedAt: 1,
    files: [
      { path: "main.scad", kind: "scad", content: "cube(1);" },
      { path: "alt.scad", kind: "scad", content: "sphere(1);" },
    ],
  };
}
