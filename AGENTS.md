When changing project files or persistence, start in `src/lib/project`.
When changing OpenSCAD compile behavior, start in `src/lib/openscad-runner`.
When changing preview rendering, start in `src/features/preview`.
When changing Monaco editor behavior, start in `src/lib/openscad-monaco` and `src/features/editor`.
When changing assistant tools or prompts, start in `src/lib/ai-tools` and `src/lib/openrouter-chat-agent`.
When changing visual primitives, start in `packages/studio-ui/src/components/ui` and `packages/studio-ui/src/components/ai-elements`.
Do not import app code from feature or library modules.
Do not import feature internals from another feature; use that feature's index export.
