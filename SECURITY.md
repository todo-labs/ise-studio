# Security

ISE Studio is a client-only application. OpenRouter requests are sent directly
from the browser using the API key supplied by the user; ISE Studio servers do
not receive or store that key.

## Local data

The editor source, selected model, and OpenRouter API key are stored in browser
storage when the user chooses to use those features. Anyone who can execute
JavaScript in the same browser origin can access that data, so users should
avoid using the app on untrusted origins and should clear the key after using a
shared device.

## OpenSCAD WebAssembly

OpenSCAD compilation runs in a dedicated Web Worker. Source files and bundled
libraries are mounted in the worker's in-memory filesystem; they are not
uploaded by the compiler. Compilation is bounded by a timeout and a cancelled
or failed worker is discarded before the next request.

## AI responses

Assistant responses are rendered through the Streamdown component. Raw HTML is
stripped from Markdown before rendering, and the UI does not use
`dangerouslySetInnerHTML` for assistant content. Code changes are applied only
through the explicitly defined editor tools.

## Reporting a vulnerability

Please report security issues privately to the project maintainers before
opening a public issue. Include reproduction steps, affected browser/runtime,
and whether the issue requires an API key or a malicious document.
