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

const extensions = new Map<string, StudioExtension>();
const listeners = new Set<() => void>();
let snapshot: StudioExtension[] = [];

export function registerStudioExtension(extension: StudioExtension) {
  if (!extension.id || !extension.name) throw new Error("Studio extensions require an id and name.");
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

function notify() {
  snapshot = Array.from(extensions.values());
  listeners.forEach((listener) => listener());
}
