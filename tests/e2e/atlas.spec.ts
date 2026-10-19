import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://telegram.org/**", (route) => route.abort());
  await page.goto("./");
});

test("catalogue, structure search, original illustration and saved progress", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await expect(
    page.getByRole("heading", { name: "Атлас костей" }),
  ).toBeVisible();
  await expect(page.locator(".bone-card")).toHaveCount(14);
  await page
    .getByRole("button", { name: "Мозговой отдел", exact: true })
    .click();
  await expect(page.locator(".bone-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Все кости", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Поиск по атласу" })
    .fill("foramen ovale");
  await expect(page.locator(".bone-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Открыть: Клиновидная кость" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Клиновидная кость", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Иллюстрации OpenStax", exact: true })
    .click();
  const image = page.locator(".illustration-button img");
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await page
    .getByRole("button", {
      name: "На иллюстрации: Зрительный канал",
      exact: true,
    })
    .click();
  await expect(page.locator(".selected-annotation")).toContainText(
    "Canalis opticus",
  );
  await page
    .getByRole("searchbox", { name: "Поиск структур кости" })
    .fill("овальное");
  await page
    .locator(".structures-list")
    .getByRole("button", { name: /Овальное отверстие/ })
    .click();
  await expect(page.locator(".structure-explanation")).toContainText(
    "Проводит нижнечелюстной нерв",
  );
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page.getByRole("button", { name: "Отметить как изученную" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "В избранном", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Изучено — снять отметку" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toHaveJSProperty("scrollWidth", 0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("finishes a quiz, explains answers and records its actual result", async ({
  page,
}) => {
  await page.goto("./#/practice");
  await page.getByRole("button", { name: "5", exact: true }).click();
  await page.getByRole("button", { name: "Начать тест", exact: true }).click();
  for (let i = 0; i < 5; i++) {
    await expect(
      page.getByText(`Вопрос ${i + 1} из 5`, { exact: true }),
    ).toBeVisible();
    const next = page.getByRole("button", {
      name: i === 4 ? "Показать результат" : "Следующий вопрос",
    });
    await expect(next).toBeDisabled();
    await page.locator(".answer-options button").first().click();
    await expect(page.getByRole("status")).toBeVisible();
    await expect(page.locator(".answer-options button.correct")).toHaveCount(1);
    await next.click();
  }
  await expect(page.getByText("ПРАКТИКА ЗАВЕРШЕНА")).toBeVisible();
  const result = await page.evaluate(
    () => JSON.parse(localStorage.getItem("cranium.progress.v1")!).history[0],
  );
  expect(result.total).toBe(5);
  expect(result.correct + result.mistakes.length).toBe(5);
  await page.getByRole("button", { name: "Мой прогресс", exact: true }).click();
  await expect(page.locator(".history-row")).toHaveCount(1);
});

test("supports interactive map, image dialog, references and keyboard navigation", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Схема", exact: true }).click();
  await page
    .locator(".hero-drawing")
    .getByRole("button", { name: "Лобная кость", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Лобная кость", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Иллюстрации OpenStax", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Увеличить анатомическую иллюстрацию" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("./#/sources");
  await expect(
    page.getByRole("heading", { name: "У знаний есть источник" }),
  ).toBeVisible();
  await expect(page.locator(".source-card")).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("degrades gracefully with storage disabled and rejects an unknown bone route", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Unavailable");
      },
    });
  });
  await page.reload();
  await expect(
    page.getByText("Хранилище недоступно.", { exact: false }),
  ).toBeVisible();
  await page.goto("./#/bone/not-real");
  await expect(
    page.getByRole("heading", { name: "Кость не найдена" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Открыть атлас" }).click();
  await expect(page.locator(".bone-card")).toHaveCount(14);
});
