import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://telegram.org/**", (route) => route.abort());
  await page.goto("./#/model");
  await expect(page.locator('canvas[data-ready="true"]')).toBeVisible({
    timeout: 45000,
  });
});

test("renders real geometry and animates disassembly, assembly and rotation", async ({
  page,
}) => {
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-visible-bones", "22");
  await expect.poll(() => canvas.getAttribute("data-triangles")).toBe("166838");
  await page.getByRole("button", { name: "Разобрать", exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-explosion")))
    .toBeGreaterThan(0.98);
  await page.getByRole("button", { name: "Собрать", exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-explosion")))
    .toBeLessThan(0.02);
  const before = await canvas.getAttribute("data-camera");
  await page.getByRole("button", { name: "Вращение", exact: true }).click();
  await expect.poll(() => canvas.getAttribute("data-camera")).not.toBe(before);
  await page.getByRole("button", { name: "Вращение", exact: true }).click();
  await page.getByRole("button", { name: "Снизу", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Снизу", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("isolates either side of paired bones and reaches their structure catalogue", async ({
  page,
}) => {
  const select = page.getByRole("combobox", {
    name: "Выбор отдельной 3D-кости",
  });
  await select.selectOption("FJ3281");
  await page
    .getByRole("button", { name: "Кость отдельно", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-visible-bones",
    "1",
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-selected",
    "FJ3281",
  );
  await expect(page.locator(".selected-model-bone")).toContainText(
    "Височная кость · левая",
  );
  await select.selectOption("FJ3386");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-selected",
    "FJ3386",
  );
  await expect(page.locator(".selected-model-bone")).toContainText(
    "Височная кость · правая",
  );
  await page
    .getByRole("button", { name: "Структуры кости", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Височная кость", exact: true }),
  ).toBeVisible();
  await expect(page.locator('canvas[data-ready="true"]')).toBeVisible({
    timeout: 45000,
  });
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-visible-bones",
    "1",
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-selected",
    "FJ3386",
  );
  await expect(page.locator(".structure-row")).toHaveCount(29);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("filters the actual 3D meshes by cranial or facial department", async ({
  page,
}) => {
  const scope = page.getByRole("combobox", { name: "Отдел в 3D-просмотре" });
  await scope.selectOption("cranial");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-visible-bones",
    "8",
  );
  await scope.selectOption("facial");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-visible-bones",
    "14",
  );
  await scope.selectOption("all");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-visible-bones",
    "22",
  );
});

test("links a sourced 3D landmark to its bilingual structure and focuses the camera", async ({
  page,
}) => {
  await page.goto("./#/bone/frontal");
  const canvas = page.locator('canvas[data-ready="true"]');
  await expect(canvas).toBeVisible({ timeout: 45000 });
  await page
    .locator(".structures-list")
    .getByRole("button", { name: /Надпереносье/ })
    .click();
  await expect(canvas).toHaveAttribute("data-landmark", "frontal-8");
  await page.locator(".model-canvas-wrap").scrollIntoViewIfNeeded();
  await expect(page.locator(".model-landmark-note")).toContainText("Glabella");
  await expect(page.locator(".model-landmark-pin.active")).toHaveAttribute(
    "aria-label",
    "3D-ориентир: Надпереносье",
  );
  await expect(page.locator(".structure-explanation")).toContainText(
    "Гладкий участок между надбровными дугами",
  );
});
