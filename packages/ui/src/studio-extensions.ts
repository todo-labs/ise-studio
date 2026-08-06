export interface StudioExtensionCommand {
  id: string;
  label: string;
  hint: string;
  run: () => void | Promise<void>;
}

export interface StudioExtension {
  id: string;
  name: string;
  commands?: StudioExtensionCommand[];
}

export interface StudioExtensionModule {
  default?: StudioExtension | (() => StudioExtension | Promise<StudioExtension>);
  extension?: StudioExtension;
}

const extensions = new Map<string, StudioExtension>();
const listeners = new Set<() => void>();
let snapshot: StudioExtension[] = [];

export function registerStudioExtension(extension: StudioExtension) {
  if (!extension.id || !extension.name)
    throw new Error("Studio extensions require an id and name.");
  extensions.set(extension.id, extension);
  notify();
  return () => unregisterStudioExtension(extension.id);
}

export function unregisterStudioExtension(extensionId: string) {
  if (!extensions.delete(extensionId)) return false;
  notify();
  return true;
}

export function getRegisteredStudioExtensions() {
  return snapshot;
}

export function subscribeToStudioExtensions(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Load an extension module through the explicit plugin seam used by the command palette. */
export async function loadStudioExtension(moduleUrl: string) {
  const normalizedUrl = moduleUrl.trim();
  if (!normalizedUrl) throw new Error("An extension module URL is required.");

  const loaded = (await import(/* @vite-ignore */ normalizedUrl)) as StudioExtensionModule;
  const candidate = loaded.extension ?? loaded.default;
  const extension = typeof candidate === "function" ? await candidate() : candidate;
  if (!extension || typeof extension !== "object")
    throw new Error("The module did not export a studio extension.");
  return registerStudioExtension(extension);
}

function notify() {
  snapshot = Array.from(extensions.values());
  listeners.forEach((listener) => listener());
}
