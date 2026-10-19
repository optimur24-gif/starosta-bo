import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://telegram.org/**", (route) => route.abort());
});
async function ready(page: import("@playwright/test").Page) {
  const canvas = page.locator(".body-viewer canvas");
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-ready", "true");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-triangles")))
    .toBeGreaterThan(0);
  await expect
    .poll(async () =>
      canvas.evaluate((element) => {
        const source = element as HTMLCanvasElement;
        const buffer = document.createElement("canvas");
        buffer.width = source.width;
        buffer.height = source.height;
        const ctx = buffer.getContext("2d")!;
        ctx.drawImage(source, 0, 0);
        const pixels = ctx.getImageData(0, 0, buffer.width, buffer.height).data;
        let opaque = 0;
        for (let i = 3; i < pixels.length; i += 4)
          if (pixels[i] > 128) opaque++;
        return opaque / (buffer.width * buffer.height);
      }),
    )
    .toBeGreaterThan(0.005);
  return canvas;
}

test("whole-body source meshes, muscles, isolation, three authored zone groups and notes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./#/body");
  const canvas = await ready(page);
  await expect(canvas).toHaveAttribute("data-visible-parts", "238");
  await page.getByLabel("Раздел", { exact: true }).selectOption("muscle");
  await canvas.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-visible-parts")), {
      timeout: 30000,
    })
    .toBe(462);
  await page.getByLabel("Раздел", { exact: true }).selectOption("bone");
  await page.getByLabel("Поиск анатомической структуры").fill("большеберцовая");
  await page.locator(".body-catalog-list button").first().click();
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-isolated", "true");
  await expect(canvas).toHaveAttribute("data-visible-parts", "1");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Сохранить изображение", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  // Read after the export frame has finished; a discarded drawing buffer used to leave only DOM labels.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await ready(page);
  for (const zone of ["articular", "muscle", "ligament"]) {
    const button = page.locator(
      `.body-zone-buttons button[data-zone="${zone}"]`,
    );
    await expect(button).toBeEnabled();
    await button.click();
    await canvas.scrollIntoViewIfNeeded();
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-visible-zones")))
      .toBeGreaterThan(0);
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "3D-конспект", exact: true }).click();
  await page.getByLabel("Поиск анатомической структуры").fill("бедренная");
  await page.locator(".body-catalog-list button").first().click();
  await page
    .getByLabel("Мой конспект", { exact: true })
    .fill("Тело, головка и шейка бедренной кости");
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("cranium-body-study-v1")),
    )
    .toContain("головка");
  await expect(page.locator(".body-source-note").last()).toContainText(
    "покрытие зон прикрепления неполное",
  );
  expect(errors).toEqual([]);
});

test("real 3D flashcards in both directions and a complete 3D quiz", async ({
  page,
}) => {
  await page.goto("./#/body/cards");
  await page.getByLabel("Направление", { exact: true }).selectOption("la-ru");
  await page
    .getByRole("button", { name: "Начать карточки", exact: true })
    .click();
  const canvas = await ready(page);
  await expect(canvas).toHaveAttribute("data-visible-parts", "1");
  await expect(page.locator(".body-card-answer")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Показать ответ", exact: true })
    .click();
  await expect(page.locator(".body-card-answer")).toBeVisible();
  await page
    .getByRole("button", { name: "Следующая карточка", exact: true })
    .click();
  await expect(page.locator(".body-card-answer")).toHaveCount(0);
  await page.getByRole("button", { name: "3D-тест", exact: true }).click();
  await page
    .getByLabel("Направление", { exact: true })
    .selectOption("model-ru");
  await page
    .getByRole("button", { name: "Начать 3D-тест", exact: true })
    .click();
  await ready(page);
  await expect(page.locator(".body-question h2")).toContainText("показанная");
  await expect(
    page.locator(".body-viewer .model-heading > span").first(),
  ).toHaveText("3D-задание");
  for (let index = 0; index < 10; index++) {
    await page.locator(".body-answers button").first().click();
    await page
      .getByRole("button", {
        name: index === 9 ? "Результат" : "Следующий вопрос",
        exact: true,
      })
      .click();
  }
  await expect(page.getByRole("heading", { name: /Результат:/ })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("cranium-body-study-v1") || "{}")
            .history?.length,
      ),
    )
    .toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("skull markers hide rear points and separate visible numbers in every view", async ({
  page,
}) => {
  await page.goto("./#/bone/sphenoid");
  const canvas = page.locator(".skull-viewer canvas");
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-ready", "true");
  for (const name of ["Спереди", "Сзади", "Сверху"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1100);
    const points = await page
      .locator(".model-landmark-pin:visible")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        }),
      );
    expect(points.length).toBeGreaterThan(0);
    expect(points.length).toBeLessThan(26);
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++)
        expect(
          Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y),
        ).toBeGreaterThan(26);
  }
});
