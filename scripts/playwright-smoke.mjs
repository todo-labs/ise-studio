import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const artifactDir = `${process.cwd()}/output/playwright`;
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  // Exercise the documented download fallback instead of opening a native
  // File System Access dialog in headless Chromium.
  await page.addInitScript(() => {
    delete window.showSaveFilePicker;
  });
  // Vite keeps an HMR connection open in development, so networkidle never
  // settles reliably. The assertions below wait for the actual app states.
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

  const onboardingClose = page.getByRole("button", { name: "Close" }).last();
  if (await onboardingClose.isVisible().catch(() => false)) {
    await onboardingClose.click();
    await page.waitForTimeout(250);
  }

  await openCommandPalette(page);
  await page.screenshot({ path: `${artifactDir}/command-palette.png`, fullPage: true });
  await page.keyboard.press("Escape");

  await page.getByText(/Last successful compile/).waitFor({ state: "visible", timeout: 30_000 });
  if (!(await page.getByLabel("Conversation context usage").isVisible())) {
    throw new Error("AI Elements context usage strip is not visible");
  }

  await page.evaluate(() => localStorage.setItem("ise-studio-code", "sphere(2);"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText("sphere(2);").waitFor({ state: "visible", timeout: 10_000 });

  await openCommandPalette(page);
  let downloadedName = "";
  page.on("download", (download) => {
    downloadedName = download.suggestedFilename();
  });
  await page.getByRole("button", { name: /Export \.scad file/ }).click();
  await page.waitForTimeout(500);
  if (!downloadedName.endsWith(".scad")) {
    throw new Error(`Unexpected export filename: ${downloadedName || "none"}`);
  }

  if (!(await page.getByText("AI Assistant").first().isVisible())) {
    throw new Error("AI assistant panel is not visible");
  }
  await page.screenshot({ path: `${artifactDir}/chat-toggle.png`, fullPage: true });
  console.log(`Playwright smoke passed for ${baseUrl}`);
} finally {
  await browser.close();
}

async function openCommandPalette(page) {
  const search = page.getByLabel("Search commands");
  await page.keyboard.press("Meta+k");
  if (!(await search.isVisible().catch(() => false))) {
    await page.locator("button").filter({ hasText: "⌘K" }).click();
  }
  await search.waitFor({ state: "visible", timeout: 5_000 });
}
