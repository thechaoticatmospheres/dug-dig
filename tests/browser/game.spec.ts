import { test, expect } from "@playwright/test";
test("alternating mode changes turns after death and preserves separate boards", async ({
  page,
}) => {
  await page.goto("/?qa=1");
  await page.getByRole("button", { name: "02 TAKE TURNS" }).click();
  await page.waitForFunction(
    () => (window as any).__dug?.state()?.phase === "play",
  );
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(750);
  await page.keyboard.up("ArrowRight");
  const first = await page.evaluate(() =>
    (window as any).__dug.state().terrain.join(""),
  );
  await page.waitForFunction(
    () => (window as any).__dug?.state()?.players[0].id === "local-1",
    undefined,
    { timeout: 30000 },
  );
  expect(
    await page.evaluate(() => (window as any).__dug.state().players[0].lives),
  ).toBe(3);
  expect(
    await page.evaluate(() => (window as any).__dug.state().terrain.join("")),
  ).not.toBe(first);
  await expect(page.locator("#play-status")).toHaveText("PLAYER 2’S TURN");
});
test("two browsers play a competitive race and host departure preserves the match", async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const host = await a.newPage(),
    guest = await b.newPage();
  try {
    for (const p of [host, guest]) {
      await p.goto("/?qa=1");
      await p.getByRole("button", { name: "04 SCORE RACE" }).click();
    }
    await host.getByRole("button", { name: "CREATE / JOIN ROOM" }).click();
    await expect(host.locator("#room-code")).toHaveText(/^[A-Z2-9]{6}$/);
    const code = await host.locator("#room-code").innerText();
    await guest.getByLabel("ROOM CODE").fill(code);
    await guest.getByRole("button", { name: "CREATE / JOIN ROOM" }).click();
    await expect(guest.locator("#room-panel")).toBeVisible();
    for (const p of [host, guest])
      await p.getByRole("button", { name: "I’M READY" }).click();
    await expect(host.locator("#start")).toBeEnabled();
    await host.locator("#start").click();
    await guest.waitForFunction(
      () => (window as any).__dug?.state()?.phase === "play",
    );
    expect(await guest.evaluate(() => (window as any).__dug.state().mode)).toBe(
      "versus",
    );
    await guest.screenshot({
      path: "docs/screenshots/competitive.png",
      fullPage: true,
    });
    await host.locator("#exit-button").click();
    await host.locator("#exit-confirm").click();
    await guest.waitForFunction(() => {
      const n = (window as any).__dug.network();
      return n.room.host === n.id;
    });
    await expect(guest.locator("#play-panel")).toBeVisible();
  } finally {
    await a.close();
    await b.close();
  }
});
test("arcade menu, real movement, pump input, pause, sound, screenshot and responsive layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?qa=1");
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/menu.png", fullPage: true });
  await page.getByRole("button", { name: "01 ARCADE" }).click();
  await page.waitForFunction(
    () => (window as any).__dug?.state()?.phase === "play",
  );
  const before = await page.evaluate(
    () => (window as any).__dug.state().players[0].x,
  );
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(700);
  await page.keyboard.up("ArrowRight");
  const after = await page.evaluate(
    () => (window as any).__dug.state().players[0].x,
  );
  expect(after).toBeGreaterThan(before + 15);
  await page.keyboard.down("Space");
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(() => (window as any).__dug.state().players[0].pumping),
  ).toBe(true);
  await page.keyboard.up("Space");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => (window as any).__dug.pause())).toBe(true);
  await page.screenshot({
    path: "docs/screenshots/arcade.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "RESUME", exact: true }).click();
  expect(await page.evaluate(() => (window as any).__dug.audio().state)).toBe(
    "running",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});
test("four browsers create room, start co-op, synchronize terrain and restore a refreshed player", async ({
  browser,
}) => {
  const contexts = await Promise.all(
    Array.from({ length: 4 }, () =>
      browser.newContext({ viewport: { width: 1280, height: 900 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  try {
    for (const p of pages) {
      await p.goto("/?qa=1");
      await p.getByRole("button", { name: "03 ONLINE CO-OP" }).click();
    }
    await pages[0].getByLabel("YOUR NAME").fill("Host");
    await pages[0].getByRole("button", { name: "CREATE / JOIN ROOM" }).click();
    await expect(pages[0].locator("#room-code")).toHaveText(/^[A-Z2-9]{6}$/, {
      timeout: 15000,
    });
    const code = await pages[0].locator("#room-code").innerText();
    for (let i = 1; i < 4; i++) {
      await pages[i].getByLabel("YOUR NAME").fill(`Digger ${i + 1}`);
      await pages[i].getByLabel("ROOM CODE").fill(code);
      await pages[i]
        .getByRole("button", { name: "CREATE / JOIN ROOM" })
        .click();
      await expect(pages[i].locator("#room-panel")).toBeVisible();
    }
    for (const p of pages)
      await p.getByRole("button", { name: "I’M READY" }).click();
    await expect(
      pages[0].getByRole("button", { name: "START GAME" }),
    ).toBeEnabled();
    await pages[0].getByRole("button", { name: "START GAME" }).click();
    for (const p of pages)
      await p.waitForFunction(
        () => (window as any).__dug?.state()?.phase === "play",
      );
    await pages[0].keyboard.down("ArrowLeft");
    await pages[0].waitForTimeout(850);
    await pages[0].keyboard.up("ArrowLeft");
    await pages[0].waitForTimeout(150);
    const views = await Promise.all(
      pages.map((p) =>
        p.evaluate(() => {
          const g = (window as any).__dug.state();
          return {
            terrain: g.terrain.join(""),
            score: g.teamScore,
            players: g.players.length,
          };
        }),
      ),
    );
    expect(views.every((v) => v.players === 4)).toBe(true);
    expect(views[0].terrain).toBe(views[1].terrain);
    await pages[0].screenshot({
      path: "docs/screenshots/coop.png",
      fullPage: true,
    });
    const oldId = await pages[1].evaluate(
      () => (window as any).__dug.network().id,
    );
    await pages[1].goto(`/?qa=1&room=${code}&mode=coop`);
    await pages[1].getByRole("button", { name: "CREATE / JOIN ROOM" }).click();
    await pages[1].waitForFunction(
      () => (window as any).__dug?.state()?.players?.length === 4,
    );
    expect(
      await pages[1].evaluate(() => (window as any).__dug.network().id),
    ).toBe(oldId);
  } finally {
    for (const c of contexts) await c.close();
  }
});
