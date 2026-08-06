When changing project files or persistence, start in `packages/project/src`.
When changing OpenSCAD compile behavior, start in `packages/openscad/src`.
When changing preview rendering, start in `apps/studio/src/features/preview`.
When changing Monaco editor behavior, start in `packages/editor/src` and `apps/studio/src/features/editor`.
When changing assistant tools or prompts, start in `packages/ai/src`.
When changing visual primitives, start in `packages/ui/src/components/ui` and `packages/ui/src/components/ai-elements`.
Do not import app code from feature or library modules.
Do not import feature internals from another feature; use that feature's index export.
