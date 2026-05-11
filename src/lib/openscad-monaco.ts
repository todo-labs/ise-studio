import type * as Monaco from "monaco-editor";

export function buildInstance(monacoInstance: typeof Monaco) {
  // Register the language
  monacoInstance.languages.register({ id: "openscad" });

  // Define syntax highlighting for OpenSCAD
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

  // Set language configuration
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

  // Add OpenSCAD code snippets
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
        suggestions: [
          {
            label: "cube",
            kind: monacoInstance.languages.CompletionItemKind.Function,
            insertText: "cube([${1:10}, ${2:10}, ${3:10}]);",
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Create a cube with specified dimensions",
            range: range,
          },
          {
            label: "sphere",
            kind: monacoInstance.languages.CompletionItemKind.Function,
            insertText: "sphere(r=${1:5});",
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Create a sphere with specified radius",
            range: range,
          },
          {
            label: "cylinder",
            kind: monacoInstance.languages.CompletionItemKind.Function,
            insertText: "cylinder(h=${1:10}, r=${2:5});",
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Create a cylinder with specified height and radius",
            range: range,
          },
          {
            label: "translate",
            kind: monacoInstance.languages.CompletionItemKind.Function,
            insertText: "translate([${1:0}, ${2:0}, ${3:0}]) {\n\t${4:// object}\n}",
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Translate an object in 3D space",
            range: range,
          },
          {
            label: "rotate",
            kind: monacoInstance.languages.CompletionItemKind.Function,
            insertText: "rotate([${1:0}, ${2:0}, ${3:0}]) {\n\t${4:// object}\n}",
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Rotate an object around specified axes",
            range: range,
          },
          {
            label: "difference",
            kind: monacoInstance.languages.CompletionItemKind.Function,
            insertText: "difference() {\n\t${1:// positive object}\n\t${2:// negative object}\n}",
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Create a difference between objects",
            range: range,
          },
          {
            label: "union",
            kind: monacoInstance.languages.CompletionItemKind.Function,
            insertText: "union() {\n\t${1:// objects to unite}\n}",
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Unite multiple objects",
            range: range,
          },
          {
            label: "module",
            kind: monacoInstance.languages.CompletionItemKind.Module,
            insertText: "module ${1:name}(${2:parameters}) {\n\t${3:// module content}\n}",
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Define a reusable module",
            range: range,
          },
        ],
      };
    },
  });
}
