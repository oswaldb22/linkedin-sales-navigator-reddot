(() => {

  // ======== SETTINGS ========
  const FOLLOW_UP_AFTER_DAYS = 1; // <-- change this (e.g., 2, 5, 7)
  // ==========================

  // ======== LOGGING ========
  const log = (...args) => console.log("[SN-dot]", ...args);
  // ==========================

  // --- styles ---
  const style = document.createElement("style");
  style.textContent = `
    .snfu-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 999px;
      margin-left: 8px;
      vertical-align: middle;
      background: #e11d48; /* red */
      box-shadow: 0 0 0 1px rgba(0,0,0,.18);
      flex: 0 0 auto;
    }
    .snfu-dot-wrap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  `;
  document.documentElement.appendChild(style);

  // --- helpers ---
  const DAY_MS = 24 * 60 * 60 * 1000;
  const CACHE_KEY = "snfu_thread_status_cache";

  const cache = {
    _data: null,
    load() {
      if (this._data) return;
      log("Loading cache from localStorage");
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        this._data = raw ? JSON.parse(raw) : {};
        log("Cache loaded:", this._data);
      } catch (e) {
        log("Error parsing cache from localStorage", e);
        this._data = {};
      }
    },
    get(key) {
      this.load();
      return this._data[key];
    },
    set(key, value) {
      this.load();
      this._data[key] = value;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(this._data));
      } catch (e) {
        log("Error saving cache to localStorage", e);
      }
    }
  };

  function parseTimeTextToAgeMs(t) {
    // Returns age in milliseconds, or null if unknown.
    if (!t) return null;
    const text = t.trim().toLowerCase();

    // Common relative patterns like "2d", "3w", "5h", "10m", "1mo", "1y"
    let m = text.match(/^(\d+)\s*(m|min|h|d|w|mo|mon|month|y|yr|year)s?$/i);
    if (m) {
      const n = Number(m[1]);
      const unit = m[2].toLowerCase();
      if (unit === "m" || unit === "min") return n * 60 * 1000;
      if (unit === "h") return n * 60 * 60 * 1000;
      if (unit === "d") return n * DAY_MS;
      if (unit === "w") return n * 7 * DAY_MS;
      if (unit === "mo" || unit === "mon" || unit === "month")
        return n * 30 * DAY_MS; // approx
      if (unit === "y" || unit === "yr" || unit === "year")
        return n * 365 * DAY_MS; // approx
    }

    // "Yesterday"/"Hier"
    if (text.includes("yesterday") || text === "hier") return 1 * DAY_MS;

    // "Today"/"Aujourd’hui"/"aujourd'hui"
    if (text.includes("today") || text.includes("aujourd")) return 0;

    // Day-of-week names (assume within last 7 days)
    const dowEn = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const dowFr = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
    const now = new Date();
    const today = now.getDay();

    const idxEn = dowEn.findIndex((d) => text.startsWith(d));
    const idxFr = dowFr.findIndex((d) => text.startsWith(d));
    const idx = idxEn !== -1 ? idxEn : idxFr !== -1 ? idxFr : -1;
    if (idx !== -1) {
      let diff = (today - idx + 7) % 7;
      if (diff === 0) diff = 7; // if it says "Mon" and today is Mon, treat as last week
      return diff * DAY_MS;
    }

    // Absolute dates like "Jan 3" sometimes appear; try Date.parse
    // If no year provided, Date.parse usually assumes current year in many browsers, but not always.
    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed)) {
      const age = Date.now() - parsed;
      return age >= 0 ? age : null;
    }

    return null;
  }

  function findThreadListRoot() {
    // Anchor on the "Search messages" input to scope to the left thread list area.
    const inputs = Array.from(
      document.querySelectorAll('input[type="text"], input[type="search"]')
    );
    const searchInput = inputs.find((i) => {
      const ph = (i.getAttribute("placeholder") || "").toLowerCase();
      return (
        (ph.includes("search") && ph.includes("message")) ||
        (ph.includes("rechercher") && ph.includes("message"))
      );
    });

    if (!searchInput) {
      log("findThreadListRoot: no search input found");
      return null;
    }

    // Go up a few levels to a stable-ish container
    let node = searchInput;
    for (let k = 0; k < 6 && node; k++) node = node.parentElement;

    return node || null;
  }

  function getCandidateThreadAnchors(root) {
    if (!root) return [];
    const anchors = Array.from(
      root.querySelectorAll('a[href*="/sales/inbox"]')
    );
    log(`found ${anchors.length} raw anchors`);

    return anchors.filter((a) => {
      const href = a.getAttribute("href") || "";
      if (!href.includes("/sales/inbox")) return false;
      if (href === "/sales/inbox/" || href === "/sales/inbox") return false;

      // Must look like a thread selection (query params or deeper path)
      if (!(href.includes("?") || href.split("/").length > 3)) return false;

      // Must have visible text content (thread row)
      const txt = (a.innerText || "").trim();
      return txt.length >= 2;
    });
  }

  function ensureDot(anchor) {
    // Find a place to attach dot: prefer a title/name element if present
    const nameEl =
      anchor.querySelector(".artdeco-entity-lockup__title") ||
      anchor.querySelector('[data-anonymize="person-name"]') ||
      anchor.querySelector("strong") ||
      anchor;

    // Prevent duplicates for this row
    if (nameEl.querySelector(":scope > .snfu-dot")) return;
    log("ensureDot", anchor);

    const wrap = document.createElement("span");
    wrap.className = "snfu-dot-wrap";

    // Move current name text nodes into wrapper? No — keep minimal: append dot only.
    const dot = document.createElement("span");
    dot.className = "snfu-dot";
    dot.title = `No reply for ≥ ${FOLLOW_UP_AFTER_DAYS} days (heuristic)`;

    nameEl.appendChild(dot);
  }

  function removeDot(anchor) {
    const nameEl =
      anchor.querySelector(".artdeco-entity-lockup__title") ||
      anchor.querySelector('[data-anonymize="person-name"]') ||
      anchor.querySelector("strong") ||
      anchor;

    const dot = nameEl.querySelector(":scope > .snfu-dot");
    if (dot) {
      log("removeDot", anchor);
      dot.remove();
    }
  }

  function scan() {
    if (!location.pathname.startsWith("/sales/inbox")) return;
    log("scan");
    const root = findThreadListRoot();
    if (!root) {
      log("findThreadListRoot: no root found");
      return;
    }

    // Evaluate the active thread from the detail pane
    const activeConvIdMatch = location.pathname.match(/sales\/inbox\/(\S+)/);
    if (activeConvIdMatch) {
      const activeConvId = activeConvIdMatch[1];
      const lastMessageEl = Array.from(
        document.querySelectorAll(".thread-container article")
      ).pop();
      if (lastMessageEl) {
        const isFromMe = !!lastMessageEl.querySelector(
          '[aria-label="Message from you"]'
        );
        const timeEl = lastMessageEl.querySelector("time");
        const timeText = timeEl
          ? timeEl.getAttribute("datetime") || timeEl.innerText
          : "";
        const ageMs = parseTimeTextToAgeMs(timeText);

        if (ageMs !== null) {
          const ageDays = ageMs / DAY_MS;
          const isDue = isFromMe && ageDays >= FOLLOW_UP_AFTER_DAYS;

          cache.set(activeConvId, {
            isDue,
            fromMe: isFromMe,
            time: timeText,
            ageDays,
          });
          log("Evaluated active thread from detail view:", {
            activeConvId,
            isDue,
          });
        }
      }
    }

    // Update all visible threads based on cache
    const anchors = getCandidateThreadAnchors(root);
    log(`found ${anchors.length} candidate anchors to update`);
    for (const anchor of anchors) {
      const href = anchor.getAttribute("href");
      const convIdMatch = href.match(/sales\/inbox\/(\S+)/);
      if (convIdMatch) {
        const convId = convIdMatch[1];
        const cachedStatus = cache.get(convId);
        if (convId && cachedStatus) {
          log("Using cached result for", convId, cachedStatus);
          if (cachedStatus.isDue) {
            ensureDot(anchor);
          } else {
            removeDot(anchor);
          }
        } else {
          // We don't have information about this thread, so we can't do anything.
          removeDot(anchor);
        }
      }
    }
  }

  // --- keep up with SPA/infinite scroll ---
  let scheduled = false;
  const scheduleScan = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      try {
        scan();
      } catch (e) {
        log("error in scan", e);
      }
    }, 300);
  };

  const obs = new MutationObserver(scheduleScan);
  obs.observe(document.body, { childList: true, subtree: true });

  // initial + periodic refresh (for times like "23h" -> "1d")
  scheduleScan();
  setInterval(scheduleScan, 60 * 1000);

  log("script loaded");
})();
