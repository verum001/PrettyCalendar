/* SPDX-License-Identifier: Apache-2.0
 * Copyright 2026 Jack
 */
"use strict";
(() => {
  const DAY = 86400000;
  const MAX_MONTHS = 36;
  const FIRST_MONTH = 12; // January, year 1.
  const LAST_MONTH = 119999; // December, year 9999.
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const native = typeof PrettyNative !== "undefined" ? PrettyNative : null;
  const scroller = document.getElementById("scroller");
  const container = document.getElementById("months");
  let marks = new Set();
  let hold = null,
    toastTimer,
    currentDay = "",
    topMonth,
    bottomMonth;
  let mutatingScroll = false,
    canEdit = true,
    previousTheme = null,
    nativePaused = false,
    clockTimer = null;
  const iso = (d) =>
    `${String(d.getUTCFullYear()).padStart(4, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const localToday = (d = new Date()) =>
    `${String(d.getFullYear()).padStart(4, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function utcDate(year, month, day) {
    const date = new Date(0);
    date.setUTCFullYear(year, month, day);
    date.setUTCHours(12, 0, 0, 0);
    return date;
  }
  function addDays(date, count) {
    return iso(new Date(Date.parse(date + "T12:00:00Z") + count * DAY));
  }
  function isNight(hour) {
    return hour >= 21 || hour < 7;
  }
  function validDate(s) {
    return (
      typeof s === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      !s.startsWith("0000-") &&
      !Number.isNaN(Date.parse(s + "T12:00:00Z")) &&
      iso(new Date(s + "T12:00:00Z")) === s
    );
  }
  function notify(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("visible"), 2200);
  }
  function readMarks() {
    try {
      const raw = native
        ? native.loadMarks()
        : localStorage.getItem("pretty-calendar-marks") || "[]";
      if (typeof raw !== "string" || raw.length > 150000)
        throw new Error("Invalid stored flowers");
      const data = JSON.parse(raw);
      if (!Array.isArray(data) || data.length > 10000 || !data.every(validDate))
        throw new Error("Invalid stored flowers");
      // Older builds allowed multiple cycles. Display the latest dated one;
      // the next successful user edit saves the new single-cycle format.
      marks = new Set(data.length ? [data.reduce((latest, date) => date > latest ? date : latest)] : []);
    } catch (_) {
      canEdit = false;
      notify("Could not read flowers. Your saved data was kept.");
    }
  }
  function persist() {
    const value = JSON.stringify([...marks].sort());
    try {
      if (native) {
        if (!native.saveMarks(value)) throw new Error("storage");
      } else localStorage.setItem("pretty-calendar-marks", value);
      return true;
    } catch (_) {
      notify("Could not save your flower");
      return false;
    }
  }
  function markersFor(date) {
    if (marks.has(date)) return ["purple"];
    const result = [];
    if (marks.has(addDays(date, -13))) result.push("heart");
    if (marks.has(addDays(date, -27))) result.push("rose");
    return result;
  }
  function paintDay(el) {
    const date = el.dataset.date,
      types = markersFor(date),
      group = el.querySelector(".markers");
    group.textContent = "";
    for (const type of types) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "marker " + (type === "heart" ? "pink" : type));
      svg.setAttribute("aria-hidden", "true");
      const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      use.setAttribute("href", type === "purple" ? "#lotus" : type === "heart" ? "#heart" : "#flower");
      svg.append(use);
      group.append(svg);
    }
    el.classList.toggle("marked", marks.has(date));
    el.classList.toggle("today", date === currentDay);
    const labels = {
      purple: "violet lotus, day 1",
      heart: "heart, day 14",
      rose: "pink flower, day 28",
    };
    el.setAttribute(
      "aria-label",
      el.dataset.label +
        (date === currentDay ? ", today" : "") +
        (types.length ? ", " + types.map((t) => labels[t]).join(", ") : "") +
        ". Hold to " +
        (marks.has(date) ? "clear this cycle" : "start a new cycle"),
    );
  }
  function repaint() {
    container.querySelectorAll(".day").forEach(paintDay);
  }
  function toggle(date, el) {
    if (!canEdit) {
      notify("Reopen the app to try reading your saved flowers.");
      return;
    }
    const had = marks.has(date);
    const previousMarks = marks;
    marks = had ? new Set() : new Set([date]);
    if (!persist()) {
      marks = previousMarks;
      return;
    }
    repaint();
    el.classList.remove("new-mark");
    void el.offsetWidth;
    el.classList.add("new-mark");
    if (native) native.haptic();
    else if (navigator.vibrate) navigator.vibrate(25);
    notify(had ? "Cycle cleared" : previousMarks.size ? "Cycle moved" : "Lotus saved");
  }
  function monthElement(index) {
    const first = utcDate(Math.floor(index / 12), index % 12, 1);
    const y = first.getUTCFullYear(),
      m = first.getUTCMonth();
    const section = document.createElement("section");
    section.className = "month";
    section.dataset.month = String(index);
    const heading = document.createElement("h2");
    heading.className = "month-title";
    heading.id = "month-" + index;
    heading.innerHTML = MONTHS[m] + '<span class="year">' + y + "</span>";
    section.setAttribute("aria-labelledby", heading.id);
    section.append(heading);
    const weekdays = document.createElement("div");
    weekdays.className = "weekdays";
    weekdays.setAttribute("aria-hidden", "true");
    for (const name of ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]) {
      const span = document.createElement("span");
      span.textContent = name;
      weekdays.append(span);
    }
    section.append(weekdays);
    const grid = document.createElement("div");
    grid.className = "grid";
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", MONTHS[m] + " " + y);
    const offset = (first.getUTCDay() + 6) % 7,
      count = utcDate(y, m + 1, 0).getUTCDate();
    for (let i = 0; i < Math.ceil((count + offset) / 7) * 7; i++) {
      const number = i - offset + 1,
        cell = document.createElement("div");
      if (number < 1 || number > count) {
        cell.className = "blank";
        cell.setAttribute("aria-hidden", "true");
      } else {
        cell.className = "day" + (i % 7 >= 5 ? " weekend" : "");
        cell.setAttribute("role", "gridcell");
        cell.tabIndex = 0;
        cell.dataset.date = iso(utcDate(y, m, number));
        cell.dataset.label = number + " " + MONTHS[m] + " " + y;
        cell.innerHTML =
          '<span class="number">' +
          number +
          '</span><span class="markers"></span>';
        paintDay(cell);
      }
      grid.append(cell);
    }
    section.append(grid);
    return section;
  }
  function cancelHold() {
    if (hold) {
      clearTimeout(hold.timer);
      hold.el.classList.remove("holding");
      hold = null;
    }
  }
  container.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary) {
      cancelHold();
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const el = event.target.closest(".day");
    if (!el) return;
    cancelHold();
    hold = {
      el,
      x: event.clientX,
      y: event.clientY,
      scroll: scroller.scrollTop,
      timer: null,
    };
    el.classList.add("holding");
    hold.timer = setTimeout(() => {
      const target = hold;
      if (!target) return;
      target.el.classList.remove("holding");
      hold = null;
      toggle(target.el.dataset.date, target.el);
    }, 550);
  });
  container.addEventListener(
    "pointermove",
    (event) => {
      if (
        hold &&
        (Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 10 ||
          Math.abs(scroller.scrollTop - hold.scroll) > 3)
      )
        cancelHold();
    },
    { passive: true },
  );
  window.addEventListener("pointerup", cancelHold);
  window.addEventListener("pointercancel", cancelHold);
  window.addEventListener("blur", cancelHold);
  container.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".day")) event.preventDefault();
  });
  container.addEventListener("keydown", (event) => {
    const el = event.target.closest(".day");
    if (el && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      if (!event.repeat) toggle(el.dataset.date, el);
    }
  });
  function trimMonths(removeFromStart) {
    while (container.children.length > MAX_MONTHS) {
      if (removeFromStart) {
        const first = container.firstElementChild;
        const height = first.nextElementSibling.offsetTop - first.offsetTop;
        const oldTop = scroller.scrollTop;
        first.remove();
        topMonth++;
        scroller.scrollTop = Math.max(0, oldTop - height);
      } else {
        container.lastElementChild.remove();
        bottomMonth--;
      }
    }
  }
  scroller.addEventListener(
    "scroll",
    () => {
      cancelHold();
      if (mutatingScroll) return;
      if (scroller.scrollTop < 500 && topMonth > FIRST_MONTH) {
        mutatingScroll = true;
        const previousHeight = scroller.scrollHeight,
          previousTop = scroller.scrollTop;
        const nextTop = Math.max(FIRST_MONTH, topMonth - 6),
          fragment = document.createDocumentFragment();
        for (let i = nextTop; i < topMonth; i++)
          fragment.append(monthElement(i));
        topMonth = nextTop;
        container.prepend(fragment);
        scroller.scrollTop =
          previousTop + (scroller.scrollHeight - previousHeight);
        trimMonths(false);
        requestAnimationFrame(() => (mutatingScroll = false));
      } else if (
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <
          800 &&
        bottomMonth < LAST_MONTH
      ) {
        mutatingScroll = true;
        const nextBottom = Math.min(LAST_MONTH, bottomMonth + 6),
          fragment = document.createDocumentFragment();
        for (let i = bottomMonth + 1; i <= nextBottom; i++)
          fragment.append(monthElement(i));
        bottomMonth = nextBottom;
        container.append(fragment);
        trimMonths(true);
        requestAnimationFrame(() => (mutatingScroll = false));
      }
    },
    { passive: true },
  );
  function refreshClock(now = new Date()) {
    const night = isNight(now.getHours());
    document.body.classList.toggle("night", night);
    const bg = night ? "#291d31" : "#fff8f2";
    document.querySelector('meta[name="theme-color"]').content = bg;
    document.getElementById("greeting").textContent = night
      ? "sweet dreams, little blossom"
      : "a little space for you";
    if (native && previousTheme !== night) native.setNight(night);
    previousTheme = night;
    const today = localToday(now);
    if (today !== currentDay) {
      currentDay = today;
      repaint();
    }
  }
  readMarks();
  refreshClock();
  const now = new Date(),
    current = Math.max(
      FIRST_MONTH,
      Math.min(LAST_MONTH, now.getFullYear() * 12 + now.getMonth()),
    );
  topMonth = Math.max(FIRST_MONTH, current - 12);
  bottomMonth = Math.min(LAST_MONTH, current + 18);
  const fragment = document.createDocumentFragment();
  for (let i = topMonth; i <= bottomMonth; i++)
    fragment.append(monthElement(i));
  container.append(fragment);
  const scrollToCurrent = () => {
    const el = container.querySelector('[data-month="' + current + '"]');
    if (el) scroller.scrollTop = el.offsetTop;
  };
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => requestAnimationFrame(scrollToCurrent));
  else requestAnimationFrame(scrollToCurrent);
  function syncActivity() {
    const paused = nativePaused || document.hidden;
    document.body.classList.toggle("motion-paused", paused);
    clearInterval(clockTimer);
    clockTimer = null;
    if (paused) cancelHold();
    else {
      refreshClock();
      clockTimer = setInterval(() => refreshClock(), 15000);
    }
  }
  window.prettySetPaused = (paused) => { nativePaused = Boolean(paused); syncActivity(); };
  document.addEventListener("visibilitychange", syncActivity);
  window.addEventListener("focus", syncActivity);
  syncActivity();
  window.prettyRefresh = () => refreshClock();
  // Pure date functions exposed for regression checks; no preview overrides in the shipped app.
  window.prettyCalendar = { addDays, isNight, validDate, markersFor };
})();
