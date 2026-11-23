/* SPDX-License-Identifier: Apache-2.0
 * Copyright 2026 Jack
 */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: "Europe/Moscow",
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install({ time: new Date("2026-06-01T12:00:00+03:00") });
  await page.goto(
    "file://" + path.resolve(__dirname, "../app/src/main/assets/index.html"),
  );
  await page.waitForFunction(() => window.prettyCalendar);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.equal(await page.locator("button").count(), 0);
  assert.equal(await page.locator("body.night").count(), 0);
  assert.equal(
    await page.evaluate(() => /[А-Яа-яЁё]/.test(document.body.innerText)),
    false,
  );
  assert.equal(
    await page.locator(".day.today").getAttribute("data-date"),
    "2026-06-01",
  );
  const cell = (date) => page.locator(`[data-date="${date}"]`);
  async function hold(date) {
    const el = cell(date);
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 15);
    await page.mouse.down();
    await page.clock.runFor(600);
    await page.mouse.up();
  }
  await hold("2026-06-01");
  assert.equal(await cell("2026-06-01").locator(".marker.purple").count(), 1);
  assert.equal(await cell("2026-06-14").locator(".marker.pink").count(), 1);
  assert.equal(await cell("2026-06-28").locator(".marker.rose").count(), 1);
  assert.equal(await cell("2026-06-15").locator(".marker").count(), 0);
  assert.equal(await cell("2026-06-01").locator(".purple use").getAttribute("href"), "#lotus");
  assert.equal(await cell("2026-06-28").locator(".rose use").getAttribute("href"), "#flower");
  assert.equal(await page.locator(".credit").textContent(), "by Jack Littlejack");
  await page.reload();
  await page.waitForFunction(() => window.prettyCalendar);
  await page.waitForTimeout(150);
  assert.equal(
    await cell("2026-06-01").locator(".marker.purple").count(),
    1,
    "persists on reload",
  );
  // Moving a cycle replaces the anchor and both calculated dates atomically.
  await hold("2026-06-02");
  for (const date of ["2026-06-01", "2026-06-14", "2026-06-28"])
    assert.equal(await cell(date).locator(".marker").count(), 0, "old cycle cleared: " + date);
  assert.equal(await cell("2026-06-02").locator(".purple").count(), 1);
  assert.equal(await cell("2026-06-15").locator(".pink").count(), 1);
  assert.equal(await cell("2026-06-29").locator(".rose").count(), 1);
  assert.equal(await page.locator(".day .purple").count(), 1);
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("pretty-calendar-marks"))), ["2026-06-02"]);
  // A calculated heart can become the new lotus without leaving old settings.
  await hold("2026-06-15");
  assert.equal(await cell("2026-06-02").locator(".marker").count(), 0);
  assert.equal(await cell("2026-06-15").locator(".purple use").getAttribute("href"), "#lotus");
  assert.equal(await cell("2026-06-28").locator(".pink").count(), 1);
  assert.equal(await cell("2026-06-29").locator(".marker").count(), 0);
  assert.equal(await cell("2026-07-12").locator(".rose").count(), 1);
  await page.reload(); await page.waitForFunction(() => window.prettyCalendar); await page.waitForTimeout(150);
  assert.equal(await cell("2026-06-15").locator(".purple").count(), 1, "replacement persists after reopen");
  await hold("2026-06-01");
  const dates = await page.evaluate(() => {
    const f = window.prettyCalendar;
    return [
      f.addDays("2026-01-25", 13),
      f.addDays("2026-12-20", 27),
      f.addDays("2028-02-16", 13),
      f.addDays("2028-02-16", 27),
      f.addDays("2026-03-20", 13),
      f.validDate("2026-02-30"),
    ];
  });
  assert.deepEqual(dates, [
    "2026-02-07",
    "2027-01-16",
    "2028-02-29",
    "2028-03-14",
    "2026-04-02",
    false,
  ]);
  for (const [time, night] of [
    ["20:59:00", false],
    ["21:00:00", true],
    ["23:59:00", true],
    ["00:00:00", true],
    ["06:59:00", true],
    ["07:00:00", false],
  ]) {
    await page.clock.setSystemTime(new Date("2026-06-01T" + time + "+03:00"));
    await page.evaluate(() => window.prettyRefresh());
    assert.equal(
      await page.locator("body.night").count(),
      night ? 1 : 0,
      "theme at " + time,
    );
  }
  // Crossing 21:00 while the app remains open must update without user interaction.
  await page.clock.setSystemTime(new Date("2026-06-01T20:59:59+03:00"));
  await page.evaluate(() => window.prettyRefresh());
  await page.clock.runFor(16000);
  assert.equal(
    await page.locator("body.night").count(),
    1,
    "live night transition",
  );
  await page.clock.setSystemTime(new Date("2026-06-01T06:59:59+03:00"));
  await page.evaluate(() => window.prettyRefresh());
  await page.clock.runFor(16000);
  assert.equal(
    await page.locator("body.night").count(),
    0,
    "live morning transition",
  );
  // Backgrounding freezes the decorative motion and stops the polling timer.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  assert.equal(await page.locator(".mascot").evaluate(el => getComputedStyle(el).animationName), "blossom-breathe");
  await page.clock.setSystemTime(new Date("2026-06-01T20:59:59+03:00"));
  await page.evaluate(() => { window.prettyRefresh(); window.prettySetPaused(true); });
  assert.equal(await page.locator(".mascot").evaluate(el => getComputedStyle(el).animationPlayState), "paused");
  await page.clock.runFor(16000);
  assert.equal(await page.locator("body.night").count(), 0, "background polling stopped");
  await page.evaluate(() => window.prettySetPaused(false));
  assert.equal(await page.locator("body.night").count(), 1, "resume updates the clock immediately");
  assert.equal(await page.locator(".mascot").evaluate(el => getComputedStyle(el).animationPlayState), "running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.locator(".mascot").evaluate(el => getComputedStyle(el).animationName), "none");
  assert.equal(await page.locator(".petal").first().evaluate(el => getComputedStyle(el).animationName), "none");
  // Moving while pressed cancels the hold, so a scrolling gesture creates no flower.
  await cell("2026-06-02").scrollIntoViewIfNeeded();
  let box = await cell("2026-06-02").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 45);
  await page.clock.runFor(650);
  await page.mouse.up();
  assert.equal(await cell("2026-06-02").locator(".marker.purple").count(), 0);
  await hold("2026-06-01");
  for (const date of ["2026-06-01", "2026-06-14", "2026-06-28"])
    assert.equal(
      await cell(date).locator(".marker").count(),
      0,
      "removes linked " + date,
    );
  await hold("2026-06-25");
  assert.equal(
    await cell("2026-07-08").locator(".marker.pink").count(),
    1,
    "heart crosses month",
  );
  assert.equal(
    await cell("2026-07-22").locator(".marker.rose").count(),
    1,
    "pink flower crosses month",
  );
  await hold("2026-06-25");
  await hold("2026-06-01");
  // Both directions extend a bounded window instead of retaining every visited month.
  const firstMonth = await page
    .locator(".month")
    .first()
    .getAttribute("data-month");
  await page.evaluate(
    () => (document.getElementById("scroller").scrollTop = 0),
  );
  await page.waitForTimeout(100);
  assert.ok(
    Number(await page.locator(".month").first().getAttribute("data-month")) <
      Number(firstMonth),
    "previous months prepend",
  );
  const lastMonth = await page
    .locator(".month")
    .last()
    .getAttribute("data-month");
  await page.evaluate(() => {
    let s = document.getElementById("scroller");
    s.scrollTop = s.scrollHeight;
  });
  await page.waitForTimeout(100);
  assert.ok(
    Number(await page.locator(".month").last().getAttribute("data-month")) >
      Number(lastMonth),
    "future months append",
  );
  for (const direction of ["future", "past"])
    for (let i = 0; i < 12; i++) {
      await page.evaluate((direction) => {
        let s = document.getElementById("scroller");
        s.scrollTop = direction === "future" ? s.scrollHeight : 0;
      }, direction);
      await page.waitForTimeout(70);
      assert.ok(
        (await page.locator(".month").count()) <= 36,
        "bounded calendar memory",
      );
    }
  const datesInView = await page
    .locator(".day")
    .evaluateAll((days) => days.map((day) => day.dataset.date));
  assert.equal(
    new Set(datesInView).size,
    datesInView.length,
    "no duplicate dates after recycling months",
  );
  // Returning from background at midnight moves the today indicator.
  await page.clock.setSystemTime(new Date("2026-06-02T00:00:00+03:00"));
  await page.reload();
  await page.waitForFunction(() => window.prettyCalendar);
  await page.waitForTimeout(150);
  await page.evaluate(() => window.prettyRefresh());
  assert.equal(
    await page.locator(".day.today").getAttribute("data-date"),
    "2026-06-02",
  );
  // Produce screenshots of the actual interface, without the browser toolbar.
  const out =
    process.env.PRETTY_SCREENSHOTS ||
    path.resolve(__dirname, "../test-results");
  fs.mkdirSync(out, { recursive: true });
  for (const [theme, time] of [
    ["sakura", "12:00:00"],
    ["night-sakura", "21:00:00"],
  ]) {
    await page.clock.setSystemTime(new Date("2026-06-01T" + time + "+03:00"));
    await page.evaluate(() => {
      window.prettyRefresh();
      let s = document.getElementById("scroller"),
        m = document.querySelector('[data-month="' + (2026 * 12 + 5) + '"]');
      s.scrollTop = m.offsetTop;
    });
    await page.clock.runFor(3500);
    await page.screenshot({ path: path.join(out, theme + ".png") });
  }
  for (const [width, height] of [[320,568],[360,740],[412,740],[640,360]]) {
    await page.setViewportSize({ width, height });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "no horizontal clipping " + width,
    );
    assert.ok(await page.locator(".credit").evaluate(el => {
      const rect=el.getBoundingClientRect(),footer=el.closest("footer").getBoundingClientRect();
      return rect.bottom<=footer.bottom && rect.top>=footer.top && rect.left>=0 && rect.right<=innerWidth;
    }), "credit fits the footer at " + width + "x" + height);
  }
  assert.deepEqual(errors, []);
  // Exercise the Android bridge contract without pretending this runs Android.
  for (const corrupt of [false, true]) {
    const bridgeContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      timezoneId: "Europe/Moscow",
    });
    const bridgePage = await bridgeContext.newPage();
    await bridgePage.clock.install({
      time: new Date("2026-06-01T12:00:00+03:00"),
    });
    await bridgePage.addInitScript((corrupt) => {
      window.saveCalls = 0;
      window.PrettyNative = {
        loadMarks: () => (corrupt ? "broken-json" : '["2026-06-01"]'),
        saveMarks: () => {
          window.saveCalls++;
          return false;
        },
        haptic: () => {},
        setNight: () => {},
      };
    }, corrupt);
    await bridgePage.goto(
      "file://" + path.resolve(__dirname, "../app/src/main/assets/index.html"),
    );
    await bridgePage.waitForFunction(() => window.prettyCalendar);
    await bridgePage.evaluate(() => document.fonts.ready);
    await bridgePage.waitForTimeout(100);
    const target = bridgePage.locator('[data-date="2026-06-02"]');
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    await bridgePage.mouse.move(box.x + box.width / 2, box.y + 15);
    await bridgePage.mouse.down();
    await bridgePage.clock.runFor(600);
    await bridgePage.mouse.up();
    assert.equal(
      await target.locator(".marker").count(),
      0,
      "failed save rolls back",
    );
    assert.equal(
      await bridgePage.evaluate(() => window.saveCalls),
      corrupt ? 0 : 1,
      "unreadable data cannot be overwritten",
    );
    if (!corrupt) {
      assert.equal(
        await bridgePage.locator('[data-date="2026-06-01"] .purple').count(),
        1,
      );
      assert.equal(await bridgePage.locator('[data-date="2026-06-14"] .pink').count(), 1);
      assert.equal(await bridgePage.locator('[data-date="2026-06-28"] .rose').count(), 1);
    }
    await bridgeContext.close();
  }
  // Legacy multi-cycle data displays one latest anchor; user edits normalize storage.
  const legacyContext=await browser.newContext({viewport:{width:390,height:844},timezoneId:"Europe/Moscow",reducedMotion:"reduce"});
  const legacyPage=await legacyContext.newPage();
  await legacyPage.clock.install({time:new Date("2026-06-01T12:00:00+03:00")});
  await legacyPage.addInitScript(()=>{
    if(localStorage.getItem("legacy-test")===null)localStorage.setItem("legacy-test",'["2026-05-10","2026-06-01","2026-05-02"]');
    window.PrettyNative={
      loadMarks:()=>localStorage.getItem("legacy-test"),
      saveMarks:value=>{if(JSON.parse(value).length>1)return false;localStorage.setItem("legacy-test",value);return true;},
      haptic:()=>{},setNight:()=>{}
    };
  });
  await legacyPage.goto("file://"+path.resolve(__dirname,"../app/src/main/assets/index.html"));
  await legacyPage.waitForFunction(()=>window.prettyCalendar);await legacyPage.evaluate(()=>document.fonts.ready);await legacyPage.waitForTimeout(150);
  assert.equal(await legacyPage.locator(".day .purple").count(),1);
  assert.equal(await legacyPage.locator('[data-date="2026-06-01"] .purple').count(),1);
  assert.equal(await legacyPage.evaluate(()=>JSON.parse(localStorage.getItem("legacy-test")).length),3,"read does not rewrite legacy storage");
  const legacyTarget=legacyPage.locator('[data-date="2026-06-03"]');await legacyTarget.scrollIntoViewIfNeeded();const legacyBox=await legacyTarget.boundingBox();
  await legacyPage.mouse.move(legacyBox.x+legacyBox.width/2,legacyBox.y+15);await legacyPage.mouse.down();await legacyPage.clock.runFor(600);await legacyPage.mouse.up();
  assert.deepEqual(await legacyPage.evaluate(()=>JSON.parse(localStorage.getItem("legacy-test"))),["2026-06-03"]);
  assert.equal(await legacyPage.locator('[data-date="2026-06-01"] .marker').count(),0);
  assert.equal(await legacyPage.locator('[data-date="2026-06-16"] .pink').count(),1);
  assert.equal(await legacyPage.locator('[data-date="2026-06-30"] .rose').count(),1);
  await legacyPage.reload();await legacyPage.waitForFunction(()=>window.prettyCalendar);
  assert.equal(await legacyPage.locator('[data-date="2026-06-03"] .purple').count(),1);
  await legacyContext.close();
  console.log(
    "PASS: single-cycle replacement, lotus shape, legacy data, persistence, rollback, lightweight motion, pause/resume, credit, date rules, themes, scrolling and responsive layout.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
