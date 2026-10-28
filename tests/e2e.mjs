import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4176";
const viewportWidth = Number(process.env.VIEWPORT_WIDTH ?? 390);
const viewportHeight = Number(process.env.VIEWPORT_HEIGHT ?? 844);
const profile = viewportWidth <= 500 ? "mobile" : "desktop";
const server = process.env.BASE_URL
  ? undefined
  : spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4176"], {
      cwd: new URL("..", import.meta.url),
      stdio: "ignore",
    });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

try {
  if (server) await sleep(900);
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: viewportWidth, height: viewportHeight },
    hasTouch: viewportWidth <= 500,
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  if ((await page.evaluate(() => document.documentElement.scrollWidth)) > viewportWidth) {
    throw new Error("The mobile layout overflows horizontally");
  }

  await page.getByRole("button", { name: /Nova simulació/i }).click();
  await page.getByRole("button", { name: /Entès, continuar/i }).click();
  await page.getByLabel("Nom del participant").nth(0).fill("Maria");
  await page.getByLabel("Nom del participant").nth(1).fill("Jorge");
  await page.getByRole("button", { name: /Afegir participant/i }).click();
  await page.getByLabel("Nom del participant").nth(2).fill("Jaume");
  await page.getByRole("button", { name: /Afegir participant/i }).click();
  await page.getByLabel("Nom del participant").nth(3).fill("Blanca");
  await page.getByLabel("Nom del participant").nth(3).blur();
  await page.getByText("Configuració avançada", { exact: true }).click();
  await page.getByRole("checkbox", { name: /Mode sense filtre/i }).check();
  await page.getByLabel("Llavor reproduïble").fill("airdrop-e2e-weapon");
  const launchButton = page.getByRole("button", { name: /Iniciar simulació/i });
  await launchButton.scrollIntoViewIfNeeded();
  await launchButton.click();
  await page.locator(".deployment-screen .primary-button").click();
  await page.locator(".reveal-button").waitFor();

  for (let day = 1; day <= 8; day += 1) {
    console.log(`e2e: reveal day ${day}`);
    let expectedVisibleSurvivors = Number(await page.locator(".survivor-panel__heading > span").textContent());
    let reloadChecked = false;
    if ((await page.locator(".survivor-row").count()) !== expectedVisibleSurvivors) {
      throw new Error(`The survivor list leaks a hidden elimination at the start of day ${day}`);
    }
    if (day === 1 && (await page.locator(".survivor-panel .tactical-figure__weapon").count()) !== 0) {
      throw new Error("The survivor list leaks the airdrop weapon before its incident");
    }
    while (await page.locator(".reveal-button").count()) {
      const previousFatalCount = await page.locator(".event-card--fatal").count();
      const previousAirdropCount = await page.locator(".event-card--airdrop").count();
      await page.locator(".reveal-button").click();
      const currentFatalCount = await page.locator(".event-card--fatal").count();
      const currentAirdropCount = await page.locator(".event-card--airdrop").count();
      expectedVisibleSurvivors -= currentFatalCount - previousFatalCount;
      const sidebarCount = await page.locator(".survivor-row").count();
      const telemetryCount = Number(await page.locator(".mission-telemetry > div").first().locator("strong").textContent());
      if (sidebarCount !== expectedVisibleSurvivors || telemetryCount !== expectedVisibleSurvivors) {
        throw new Error(`Survivor visibility is out of sync after a reveal on day ${day}`);
      }
      if (day === 1 && currentAirdropCount === 0) {
        if ((await page.locator(".survivor-panel .tactical-figure__weapon").count()) !== 0) {
          throw new Error("The survivor list reveals a supplied weapon too early");
        }
      }
      if (day === 1 && previousAirdropCount === 0 && currentAirdropCount === 1) {
        if ((await page.locator(".survivor-panel .tactical-figure__weapon").count()) === 0) {
          throw new Error("The survivor list does not reveal the supplied weapon with its incident");
        }
      }
      if (day === 2 && !reloadChecked) {
        await page.locator(".reveal-button:not([disabled])").waitFor();
        await page.reload({ waitUntil: "networkidle" });
        const archivedSurvivors = Number(
          await page.locator(".operation-card").first().locator(".operation-stats strong").first().textContent(),
        );
        if (archivedSurvivors !== expectedVisibleSurvivors) {
          throw new Error("The home archive leaks a hidden elimination");
        }
        await page.getByRole("button", { name: /Reprendre/i }).click();
        await page.locator(".survivor-panel").waitFor();
        const restoredEvents = await page.locator(".event-card").count();
        const restoredSurvivors = await page.locator(".survivor-row").count();
        if (restoredEvents !== 1 || restoredSurvivors !== expectedVisibleSurvivors) {
          throw new Error(
            `Reveal progress was not restored after a reload: events=${restoredEvents}, survivors=${restoredSurvivors}, expected=${expectedVisibleSurvivors}`,
          );
        }
        reloadChecked = true;
      }
    }
    await page.locator(".day-report").waitFor();
    if (day === 1) {
      const supplyDrop = page.locator(".supply-drop-visual");
      await supplyDrop.waitFor();
      if ((await supplyDrop.locator(".tactical-figure").count()) !== 1) {
        throw new Error("The airdrop does not show its recipient figure");
      }
      await supplyDrop.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      if ((await page.evaluate(() => document.documentElement.scrollWidth)) > viewportWidth) {
        throw new Error("The airdrop causes horizontal overflow");
      }
      await supplyDrop.screenshot({ path: `/tmp/zona-zero-airdrop-card-${profile}.png` });
      await page.screenshot({ path: `/tmp/zona-zero-airdrop-${profile}.png`, fullPage: true });
    }
    if (day === 2) {
      const replayButton = page.locator(".event-replay-button").first();
      await replayButton.scrollIntoViewIfNeeded();
      await replayButton.click();
      await page.locator(".replay-stage").waitFor();
      await page.getByText(/REPLAY \/ D02/i).waitFor();
      if ((await page.locator(".replay-stage .tactical-figure").count()) < 1) {
        throw new Error("The replay does not include tactical figures");
      }
      await page.waitForTimeout(1_250);
      if ((await page.evaluate(() => document.documentElement.scrollWidth)) > viewportWidth) {
        throw new Error("The replay causes horizontal overflow");
      }
      await page.screenshot({ path: `/tmp/zona-zero-replay-${profile}.png`, fullPage: true });
      await page.getByRole("button", { name: /Tornar a reproduir/i }).click();
      await page.getByRole("button", { name: "Tancar", exact: true }).click();
    }
    console.log(`e2e: close day ${day}`);
    await page.locator(".day-report .primary-button").click();
    if (day < 8) {
      await page.locator(".reveal-button").waitFor();
      console.log(`e2e: day ${day + 1} ready`);
    }
  }

  await page.getByText("Operació completada", { exact: true }).waitFor();
  if ((await page.locator(".ranking-row--winner").count()) !== 1) {
    throw new Error("The final ranking does not have exactly one winner");
  }
  await page.screenshot({ path: `/tmp/zona-zero-e2e-${profile}.png`, fullPage: true });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar", exact: true }).click(),
  ]);
  const archivePath = await download.path();
  if (!archivePath || !download.suggestedFilename().endsWith(".zonazero")) {
    throw new Error("The exported archive is not valid");
  }
  await page.getByRole("button", { name: /Tornar a l'inici/i }).click();
  await page.locator('input[type="file"]').setInputFiles(archivePath);
  await page.getByText("Operació completada", { exact: true }).waitFor();

  await page.getByRole("button", { name: /Español/i }).click();
  await page.getByText("Operación completada", { exact: true }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Operaciones guardadas", { exact: true }).waitFor();
  await browser.close();
} finally {
  server?.kill("SIGTERM");
}
