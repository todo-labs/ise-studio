# ISE Studio

An open-source, browser-based IDE for OpenSCAD with AI-powered coding assistance. Write, compile, and preview 3D models directly in your browser using the official OpenSCAD compiler via WebAssembly.

[![ISE Studio Preview](apps/studio/public/screenshot.png)](https://ise-studio.app/)
Built with [**Vite**](https://vitejs.dev/), [**React 19**](https://reactjs.org/), [**TypeScript**](https://www.typescriptlang.org/), [**Monaco Editor**](https://microsoft.github.io/monaco-editor/) [**shadcn/ui**](https://ui.shadcn.com/) and [WebAssembly](https://webassembly.org/).

## Features

🚀 **Native OpenSCAD Support**

- Full OpenSCAD language support with real compiler via WebAssembly
- Monaco Editor with syntax highlighting and code intelligence
- Live compilation with auto-preview (debounced for performance)
- Direct STL and OBJ export from OpenSCAD models
- Responsive resizable layout

🤖 **AI-Powered Development**

- Interactive AI chat assistant powered by OpenRouter
- Tool-based AI workflows with code validation and modification
- Search OpenSCAD documentation in context
- AI-assisted code editing with selection awareness
- AI Elements context usage bar with model, tokens, context limit, and estimated cost
- Bring your own API key (no backend required)
- Agentic function calling for intelligent code suggestions

🎨 **Modern UI**

- Built with shadcn/ui components  
- Dark/light theme support
- Keyboard shortcuts (Ctrl+Shift+C for chat toggle, F5 for render)
- Accessible and responsive design
- Clean, distraction-free interface

⚡ **Performance**

- Built with Vite + React 19
- TypeScript for full type safety
- Tailwind CSS with utility-first styling
- Web Workers for compilation without blocking UI
- CORS-enabled WASM execution with COOP/COEP headers

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- An API key from OpenRouter (supports OpenAI, Anthropic, Google, and 200+ models)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/todo-labs/ise-studio.git
cd ise-studio
```

2. Install dependencies:

```bash
bun install
# or
npm install
```

3. Run the development server:

```bash
bun dev
# or
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Setting Up AI Features

1. Click **Settings** in the top right of the header
2. Paste your OpenRouter API key
3. Select a model (defaults to OpenRouter AutoRouter)
4. Start using AI-assisted coding!

Your API key is stored securely in your browser's local storage and sent directly to OpenRouter—no backend server needed.

## Architecture

ISE Studio uses a client-first architecture:

- **OpenSCAD Compilation**: Official OpenSCAD compiler compiled to WebAssembly
- **Web Workers**: Compilation runs in a background worker to keep the UI responsive
- **3D Rendering**: Three.js renders STL/OBJ geometry data from the compiler
- **AI Integration**: OpenRouter API handles all LLM requests with tool calling support
- **Local Tools**: Validate syntax, inspect geometry, search docs, and apply code patches via AI functions
- **Parametric Customizer**: Annotate assignments with ranges or option lists and edit them without leaving the preview
- **Offline Shell**: Installable PWA caching the editor shell, WASM compiler, and commonly used bundled libraries
- **Keyboard Workflow**: Command palette with import/export, formatting, library insertion, and preview commands

## Tech Stack

- **Frontend**: Vite 7 + React 19 + TypeScript
- **Editor**: Monaco Editor with OpenSCAD language support
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **3D Rendering**: Three.js + React Three Fiber
- **OpenSCAD Compiler**: Official OpenSCAD compiled to WebAssembly
- **Geometry Parsing**: OBJ and STL parser for WASM output
- **AI**: OpenRouter API with agentic function calling
- **Icons**: Lucide React
- **Build Tools**: Vite with worker and WASM support

## Project Structure

```
apps/
└── studio/                    # Vite React app shell
    ├── src/
    │   ├── app/               # IDE layout and app-level composition
    │   ├── features/
    │   │   ├── ai-assistant/  # Assistant panel integration
    │   │   ├── editor/        # Monaco editor feature wiring
    │   │   ├── preview/       # Compile + render workflow
    │   │   └── settings/      # Settings modal and UX
    │   ├── hooks/             # App-specific hooks
    │   └── styles/            # Global styles
    └── public/static/wasm/    # OpenSCAD WebAssembly assets

packages/
├── ai/                        # OpenRouter agent, tools, pricing, settings
├── editor/                    # Monaco language setup and editor settings
├── geometry/                  # Geometry DSL and OFF parsing
├── openscad/                  # OpenSCAD compiler, worker client, docs, cache
└── ui/                        # Shared UI primitives and AI UI elements

docs/
├── CONTEXT.md                 # Domain and architecture context
└── adr/                       # Architecture decision records

tests/                         # End-to-end and integration tests
```

## AI Tools & Workflows

ISE Studio provides AI-powered tools that enable intelligent code modifications:

- **`validate_dsl`**: Check OpenSCAD syntax and compilation errors
- **`inspect_scene`**: Analyze the compiled geometry (bounds, face count, etc.)
- **`search_docs`**: Search OpenSCAD documentation for functions and examples
- **`apply_patch_to_selection`**: Apply code edits to the current selection or whole document
- **`openrouter:web_search`**: Optional web search for external references

Use `⌘K`/`Ctrl+K` for the command palette. Customizer controls are generated from annotations such as
`width = 20; // [1:40:1]` and `shape = "cube"; // [cube, sphere]`.
The command palette can also copy a URL-encoded source link; opening that link seeds the local single-file document.

The AI assistant can chain these tools together to help you write, debug, and optimize OpenSCAD code.

## Roadmap

- [x] Custom themes and editor configurations
- [x] Performance profiling and optimization tips
- [x] GPU-accelerated preview for complex models (opt in with `?renderer=webgpu`; WebGL remains the default)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

**Special thanks to the [OpenSCAD Playground](https://github.com/openscad/openscad-playground) project** for pioneering browser-based OpenSCAD editing and the compilation architecture that inspired ISE Studio.

We also extend our gratitude to:

- [OpenSCAD](https://openscad.org/) - The amazing 3D modeling language
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful, accessible UI components
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Professional code editor
- [Three.js](https://threejs.org/) - 3D graphics library
- [OpenRouter](https://openrouter.ai/) - Unified LLM API
- The open-source community for all the amazing tools and libraries

## Support

If you like this project, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs and issues
- 💡 Suggesting new features
- 🤝 Contributing to the codebase

---

Built with ❤️ by the open-source community
