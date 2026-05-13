import type * as Monaco from "monaco-editor";

import { OPENSCAD_LIBRARY_DEFINITIONS } from "@ise-studio/openscad";
import { THEME_PRESETS } from "../../studio-ui/src/lib/theme";

const installedInstances = new WeakSet<typeof Monaco>();

export function installOpenSCADMonaco(monacoInstance: typeof Monaco) {
  if (installedInstances.has(monacoInstance)) return;
  installedInstances.add(monacoInstance);

  monacoInstance.languages.register({ id: "openscad" });
  registerOpenSCADLanguage(monacoInstance);
  registerOpenSCADEditorThemes(monacoInstance);
  registerOpenSCADCompletions(monacoInstance);
}

function registerOpenSCADLanguage(monacoInstance: typeof Monaco) {
  monacoInstance.languages.setMonarchTokensProvider("openscad", {
    keywords: [
      "module",
      "function",
      "if",
      "else",
      "for",
      "each",
      "let",
      "assert",
      "echo",
      "true",
      "false",
      "undef",
      "PI",
      "include",
      "use",
    ],

    builtins: [
      // 2D primitives
      "circle",
      "square",
      "polygon",
      "text",
      "import",
      // 3D primitives
      "sphere",
      "cube",
      "cylinder",
      "polyhedron",
      // Transformations
      "translate",
      "rotate",
      "scale",
      "resize",
      "mirror",
      "multmatrix",
      "color",
      "offset",
      "hull",
      "minkowski",
      // Boolean operations
      "union",
      "difference",
      "intersection",
      // Extrusion
      "linear_extrude",
      "rotate_extrude",
      // Other functions
      "projection",
      "surface",
      "render",
    ],

    typeKeywords: [],

    operators: [
      "=",
      ">",
      "<",
      "!",
      "~",
      "?",
      ":",
      "==",
      "<=",
      ">=",
      "!=",
      "&&",
      "||",
      "++",
      "--",
      "+",
      "-",
      "*",
      "/",
      "&",
      "|",
      "^",
      "%",
      "<<",
      ">>",
      ">>>",
      "+=",
      "-=",
      "*=",
      "/=",
      "&=",
      "|=",
      "^=",
      "%=",
      "<<=",
      ">>=",
      ">>>=",
    ],

    symbols: /[=><!~?:&|+*/^%-]+/,

    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
      root: [
        // identifiers and keywords
        [
          /[a-z_$][\w$]*/,
          {
            cases: {
              "@typeKeywords": "keyword",
              "@keywords": "keyword",
              "@builtins": "type",
              "@default": "identifier",
            },
          },
        ],
        [/[A-Z][\w$]*/, "type.identifier"],

        // whitespace
        { include: "@whitespace" },

        // delimiters and operators
        [/[{}()[\]]/, "@brackets"],
        [/[<>](?!@symbols)/, "@brackets"],
        [/@symbols/, { cases: { "@operators": "operator", "@default": "" } }],

        // numbers
        [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/\d+/, "number"],

        // delimiter: after number because of .\d floats
        [/[;,.]/, "delimiter"],

        // strings
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

        // characters
        [/'[^\\']'/, "string"],
        [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
        [/'/, "string.invalid"],
      ],

      comment: [
        [/[^/*]+/, "comment"],
        [/\/\*/, "comment", "@push"],
        ["\\*/", "comment", "@pop"],
        [/[/*]/, "comment"],
      ],

      string: [
        [/[^\\"]+/, "string"],
        [/@escapes/, "string.escape"],
        [/\\./, "string.escape.invalid"],
        [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
      ],

      whitespace: [
        [/[ \t\r\n]+/, "white"],
        [/\/\*/, "comment", "@comment"],
        [/\/\/.*$/, "comment"],
      ],
    },
  });

  monacoInstance.languages.setLanguageConfiguration("openscad", {
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"', notIn: ["string"] },
      { open: "'", close: "'", notIn: ["string", "comment"] },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });

}

function registerOpenSCADEditorThemes(monacoInstance: typeof Monaco) {
  THEME_PRESETS.forEach((preset) => {
    const syntax = preset.editor.syntax;
    monacoInstance.editor.defineTheme(preset.monacoTheme, {
      base: preset.mode === "dark" ? "vs-dark" : "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: syntax.keyword.replace("#", ""), fontStyle: "bold" },
        { token: "number", foreground: syntax.primitive.replace("#", "") },
        { token: "string", foreground: syntax.string.replace("#", "") },
        { token: "comment", foreground: syntax.comment.replace("#", ""), fontStyle: "italic" },
        { token: "type", foreground: syntax.type.replace("#", "") },
        { token: "operator", foreground: syntax.operator.replace("#", "") },
      ],
      colors: {
        "editor.background": preset.editor.background,
        "editor.foreground": preset.editor.foreground,
        "editor.lineHighlightBackground": preset.editor.lineHighlight,
        "editorLineNumber.foreground": syntax.comment,
        "editorCursor.foreground": preset.swatches.primary,
        "editor.selectionBackground": preset.editor.selection,
        "editor.inactiveSelectionBackground": preset.editor.lineHighlight,
        "editorIndentGuide.background1": preset.editor.selection,
        "editorIndentGuide.activeBackground1": preset.swatches.primary,
        "editorSuggestWidget.background": preset.editor.lineHighlight,
        "editorSuggestWidget.border": preset.editor.border,
        "editorSuggestWidget.selectedBackground": preset.editor.selection,
        "editorWidget.background": preset.editor.lineHighlight,
        focusBorder: preset.swatches.primary,
      },
    });
  });
}

function registerOpenSCADCompletions(monacoInstance: typeof Monaco) {
  monacoInstance.languages.registerCompletionItemProvider("openscad", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: buildOpenSCADCompletionItems(monacoInstance, range),
      };
    },
  });
}

export function buildOpenSCADCompletionItems(
  monacoInstance: typeof Monaco,
  range: Monaco.IRange,
): Monaco.languages.CompletionItem[] {
  const snippetRule = monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  const functionKind = monacoInstance.languages.CompletionItemKind.Function;

  return [
    ...OPENSCAD_LIBRARY_DEFINITIONS.flatMap((library) =>
      Object.keys(library.symlinks ?? { [library.name]: "." }).flatMap((alias) => [
        {
          label: `include <${alias}/...>`,
          kind: monacoInstance.languages.CompletionItemKind.Reference,
          insertText: `include <${alias}/\${1:file.scad}>`,
          insertTextRules: snippetRule,
          documentation: `Include a file from the bundled ${library.name} library`,
          range,
        },
        {
          label: `use <${alias}/...>`,
          kind: monacoInstance.languages.CompletionItemKind.Reference,
          insertText: `use <${alias}/\${1:file.scad}>`,
          insertTextRules: snippetRule,
          documentation: `Use modules and functions from the bundled ${library.name} library`,
          range,
        },
      ]),
    ),
    {
      label: "cube",
      kind: functionKind,
      insertText: "cube([${1:10}, ${2:10}, ${3:10}]);",
      insertTextRules: snippetRule,
      documentation: "Create a cube with specified dimensions",
      range,
    },
    {
      label: "sphere",
      kind: functionKind,
      insertText: "sphere(r=${1:5});",
      insertTextRules: snippetRule,
      documentation: "Create a sphere with specified radius",
      range,
    },
    {
      label: "cylinder",
      kind: functionKind,
      insertText: "cylinder(h=${1:10}, r=${2:5});",
      insertTextRules: snippetRule,
      documentation: "Create a cylinder with specified height and radius",
      range,
    },
    {
      label: "translate",
      kind: functionKind,
      insertText: "translate([${1:0}, ${2:0}, ${3:0}]) {\n\t${4:// object}\n}",
      insertTextRules: snippetRule,
      documentation: "Translate an object in 3D space",
      range,
    },
    {
      label: "rotate",
      kind: functionKind,
      insertText: "rotate([${1:0}, ${2:0}, ${3:0}]) {\n\t${4:// object}\n}",
      insertTextRules: snippetRule,
      documentation: "Rotate an object around specified axes",
      range,
    },
    {
      label: "difference",
      kind: functionKind,
      insertText: "difference() {\n\t${1:// positive object}\n\t${2:// negative object}\n}",
      insertTextRules: snippetRule,
      documentation: "Create a difference between objects",
      range,
    },
    {
      label: "union",
      kind: functionKind,
      insertText: "union() {\n\t${1:// objects to unite}\n}",
      insertTextRules: snippetRule,
      documentation: "Unite multiple objects",
      range,
    },
    {
      label: "module",
      kind: monacoInstance.languages.CompletionItemKind.Module,
      insertText: "module ${1:name}(${2:parameters}) {\n\t${3:// module content}\n}",
      insertTextRules: snippetRule,
      documentation: "Define a reusable module",
      range,
    },
  ];
}
