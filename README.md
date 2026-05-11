# ISE Studio

An open-source, client-side web IDE for an OpenSCAD-inspired DSL with AI-powered assistance. Built with Vite, React, TypeScript, and shadcn/ui.

![ISE Studio](https://via.placeholder.com/800x400?text=ISE+Studio+Preview)

## Features

🚀 **Modern IDE Experience**

- VSCode-like interface with resizable panels
- File explorer with context menus
- Tabbed editor with Monaco Editor
- Real-time 3D preview
- Syntax highlighting for OpenSCAD

🤖 **AI-Powered Assistance**

- Code generation and explanation
- Interactive chat assistant
- Smart code suggestions tuned for the DSL
- Bring your own API key for direct browser-to-provider AI calls

🎨 **Beautiful UI**

- Built with shadcn/ui components
- Dark/light theme support
- Responsive design
- Keyboard shortcuts

⚙️ **DSL-native Preview**

- Custom OpenSCAD-like builder API
- Instant Three.js previews via signed-distance fields + Marching Cubes
- Export clean `.scad` files for the desktop OpenSCAD app
- No WebAssembly dependency required

⚡ **Performance**

- Built with Vite + React 19
- TypeScript for type safety
- Tailwind CSS for styling
- Three.js for 3D rendering

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Your own OpenAI, Anthropic, or Gemini API key for AI features

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/ise-studio.git
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

4. Open the Vite URL shown in your terminal, usually [http://localhost:5173](http://localhost:5173).

### Setting up AI Features

1. Click Settings in the header
2. Select your AI provider and enter your API key
3. Start using AI assistance!

API keys are stored in browser local storage and sent directly from the browser to the selected AI provider. This app does not require a backend server for AI features.

## Tech Stack

- **Framework**: Vite + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **UI Components**: shadcn/ui
- **Code Editor**: Monaco Editor
- **3D Rendering**: React Three Fiber + custom Marching Cubes pipeline
- **DSL**: OpenSCAD-inspired builder that round-trips to `.scad`
- **AI**: Client-side provider API calls with user-supplied keys
- **Icons**: Lucide React

## Project Structure

```
src/
├── App.tsx             # Vite application root
├── main.tsx            # Browser entry point
├── components/
│   ├── ide/            # IDE-specific components
│   │   ├── ide-layout.tsx
│   │   ├── file-explorer.tsx
│   │   ├── code-editor.tsx
│   │   ├── preview-panel.tsx
│   │   └── ai-chat.tsx
│   └── ui/             # shadcn/ui components
├── lib/                # Utilities, DSL, and client-side AI providers
└── styles/            # Global styles
```

## Roadmap

- [ ] STL exports generated from the DSL geometry
- [ ] Richer DSL surface area (text, hull, minkowski, tapered cylinders, etc.)
- [ ] File import/export (.scad, .stl)
- [ ] Advanced AI features (code refactoring, optimization)
- [ ] Collaborative editing
- [ ] Plugin system
- [ ] Mobile support
- [ ] Offline mode

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

- [OpenSCAD](https://openscad.org/) for the amazing 3D modeling language
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the code editor
- [Three.js](https://threejs.org/) for 3D rendering
- OpenAI, Anthropic, and Google Gemini for AI provider APIs

## Support

If you like this project, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs and issues
- 💡 Suggesting new features
- 🤝 Contributing to the codebase

---

Built with ❤️ by the open-source community
