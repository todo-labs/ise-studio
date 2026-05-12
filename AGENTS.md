When changing project files or persistence, start in `packages/studio-core/src/project`.
When changing OpenSCAD compile behavior, start in `packages/studio-core/src/openscad`.
When changing preview rendering, start in `apps/studio/src/features/preview`.
When changing Monaco editor behavior, start in `packages/studio-core/src/editor` and `apps/studio/src/features/editor`.
When changing assistant tools or prompts, start in `packages/studio-core/src/ai`.
When changing visual primitives, start in `packages/studio-ui/src/components/ui` and `packages/studio-ui/src/components/ai-elements`.
Do not import app code from feature or library modules.
Do not import feature internals from another feature; use that feature's index export.
