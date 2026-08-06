import { expect, test } from "bun:test";

import { sanitizeMarkdown } from "./message";

test("strips raw HTML from assistant markdown while preserving fenced code", () => {
  expect(sanitizeMarkdown("Hello <script>alert(1)</script> world")).toBe("Hello alert(1) world");
  expect(sanitizeMarkdown("```html\n<script>alert(1)</script>\n```"))
    .toBe("```html\n<script>alert(1)</script>\n```");
});
