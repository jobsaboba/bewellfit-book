/* Be Well Fit — class booking app
   Static client: browses the timetable and opens the visitor's email app with
   a pre-filled booking request. No API keys, server or backend required. */
(function () {
  "use strict";

  var CFG = window.BWF_CONFIG || {};
  var CATEGORIES = window.BWF_CATEGORIES || [];
  var CLASS_INFO = window.BWF_CLASS_INFO || {};
  var PRICING = window.BWF_PRICING || {};
  var SLOTS = window.BWF_SLOTS || [];
  var UPDATED = window.BWF_UPDATED || "";
  var APP_VERSION = "7";
  var MAX_WEEKS = 8;
  var LEAD_TIME = 60 * 60 * 1000;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var HISTORY_KEY = "bewellfit.requests.v1";
  var SAVED_DETAILS_KEY = "bewellfit.details.v1";

  var DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var WEEK_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var CAT_ICON = {
    fitness: "i-dumbbell",
    aerial: "i-hoop",
    yoga: "i-yoga",
    dance: "i-note",
    seniors: "i-chair",
    kids: "i-star"
  };

  var CAT_BY_ID = {};
  CATEGORIES.forEach(function (cat) { CAT_BY_ID[cat.id] = cat; });

  var CLASSES = [];
  var CLASS_BY_NAME = {};
  var seenClasses = {};
  SLOTS.forEach(function (slot) {
    if (!slot || !slot.name || seenClasses[slot.name]) return;
    seenClasses[slot.name] = true;
    var info = CLASS_INFO[slot.name] || { cats: ["fitness"], desc: "" };
    CLASSES.push({
      name: slot.name,
      info: info,
      slots: SLOTS.filter(function (s) { return s.name === slot.name; })
    });
  });
  CLASSES.sort(function (a, b) { return a.name.localeCompare(b.name, "en"); });
  CLASSES.forEach(function (cls) { CLASS_BY_NAME[cls.name] = cls; });

  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };

  var els = {};
  var deferredInstallPrompt = null;
  var toastTimer = null;
  var currentDayKey = "";

  var state = {
    tab: "book",
    step: 1,
    category: "all",
    query: "",
    className: null,
    weekStart: null,
    selectedDate: null,
    slot: null,
    request: null,
    emailPending: false,
    guideQuery: "",
    history: [],
    ttDay: null
  };

  /* -----------------------------------------------------------------------
     Small helpers
     ----------------------------------------------------------------------- */
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function svgIcon(id, extraClass) {
    return '<svg class="icon' + (extraClass ? " " + extraClass : "") + '" aria-hidden="true"><use href="#' + id + '"></use></svg>';
  }
  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }
  function startOfWeek(date) {
    var day = startOfDay(date);
    var offset = (day.getDay() + 6) % 7; // Monday = 0
    return addDays(day, -offset);
  }
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function dateKey(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }
  function parseDateKey(key) {
    var parts = String(key).split("-").map(Number);
    if (parts.length !== 3 || parts.some(function (n) { return !isFinite(n); })) return null;
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    return isNaN(date.getTime()) ? null : date;
  }
  function slotStart(date, time) {
    var parts = String(time).split(":").map(Number);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), parts[0] || 0, parts[1] || 0, 0, 0);
  }
  function isBookable(date, slot) {
    return slotStart(date, slot.time).getTime() - Date.now() >= LEAD_TIME;
  }
  function fmtTime(time) {
    var parts = String(time).split(":").map(Number);
    var hours = parts[0] || 0;
    var minutes = parts[1] || 0;
    var suffix = hours >= 12 ? "pm" : "am";
    var h12 = hours % 12 || 12;
    return h12 + ":" + String(minutes).padStart(2, "0") + " " + suffix;
  }
  function fmtDateFull(date) {
    return DAYS_LONG[date.getDay()] + " " + date.getDate() + " " + MONTHS_LONG[date.getMonth()] + " " + date.getFullYear();
  }
  function fmtDayLong(date) {
    return DAYS_LONG[date.getDay()] + " " + date.getDate() + " " + MONTHS_LONG[date.getMonth()];
  }
  function fmtDayShort(date) {
    return DAYS_SHORT[date.getDay()] + " " + date.getDate() + " " + MONTHS_SHORT[date.getMonth()];
  }
  function fmtWeekRange(weekStart) {
    var end = addDays(weekStart, 6);
    if (weekStart.getMonth() === end.getMonth() && weekStart.getFullYear() === end.getFullYear()) {
      return weekStart.getDate() + " – " + end.getDate() + " " + MONTHS_LONG[end.getMonth()] + " " + end.getFullYear();
    }
    return weekStart.getDate() + " " + MONTHS_SHORT[weekStart.getMonth()] + " – " + end.getDate() + " " + MONTHS_SHORT[end.getMonth()] + " " + end.getFullYear();
  }
  function fmtTimeFromDate(date) {
    return fmtTime(String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0"));
  }
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function categoryIcon(category, extraClass) {
    var cat = CAT_ICON[category] ? category : "fitness";
    return '<span class="' + (extraClass || "class-icon") + " cat-" + cat + '" aria-hidden="true">' +
      svgIcon(CAT_ICON[cat]) + "</span>";
  }
  function primaryCategory(cls) {
    return (cls.info.cats && cls.info.cats[0]) || "fitness";
  }
  function slotsForDate(className, date) {
    return SLOTS.filter(function (slot) {
      return slot.name === className && slot.day === date.getDay();
    }).sort(function (a, b) { return a.time.localeCompare(b.time); });
  }
  function bookableSlotsForDate(className, date) {
    return slotsForDate(className, date).filter(function (slot) { return isBookable(date, slot); });
  }
  function firstBookableDateInWeek(className, weekStart) {
    for (var i = 0; i < 7; i++) {
      var date = addDays(weekStart, i);
      if (bookableSlotsForDate(className, date).length) return date;
    }
    return null;
  }
  function nextBookableDate(className) {
    var today = startOfDay(new Date());
    for (var i = 0; i < MAX_WEEKS * 7; i++) {
      var date = addDays(today, i);
      if (bookableSlotsForDate(className, date).length) return date;
    }
    return null;
  }
  function nextDateForSlot(slot) {
    if (!slot) return null;
    var today = startOfDay(new Date());
    for (var i = 0; i < MAX_WEEKS * 7; i++) {
      var date = addDays(today, i);
      if (date.getDay() === slot.day && isBookable(date, slot)) return date;
    }
    return null;
  }
  function nextWeekdayDate(day) {
    var today = startOfDay(new Date());
    var diff = (day - today.getDay() + 7) % 7;
    return addDays(today, diff);
  }
  function weekDates(weekStart) {
    var out = [];
    for (var i = 0; i < 7; i++) out.push(addDays(weekStart, i));
    return out;
  }
  function plural(count, one, many) {
    return count + " " + (count === 1 ? one : (many || one + "s"));
  }

  /* -----------------------------------------------------------------------
     Data helpers
     ----------------------------------------------------------------------- */
  function filteredClasses() {
    var q = state.query.trim().toLowerCase();
    return CLASSES.filter(function (cls) {
      var cats = cls.info.cats || [];
      if (state.category !== "all" && cats.indexOf(state.category) === -1) return false;
      if (!q) return true;
      var catLabels = cats.map(function (id) { return CAT_BY_ID[id] ? CAT_BY_ID[id].label : id; }).join(" ");
      var dayLabels = cls.slots.map(function (slot) { return DAYS_LONG[slot.day] || ""; }).join(" ");
      var haystack = (cls.name + " " + (cls.info.desc || "") + " " + catLabels + " " + dayLabels).toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
  }
  function resultCountLabel(list) {
    if (!list.length) return "No matches";
    var pluralWord = list.length === 1 ? "class" : "classes";
    if (state.query.trim() || state.category !== "all") return list.length + " " + pluralWord;
    return list.length + " " + pluralWord;
  }

  /* -----------------------------------------------------------------------
     Persistent request history (local device only)
     ----------------------------------------------------------------------- */
  function loadHistory() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.filter(function (item) {
        return item && typeof item.className === "string" && typeof item.startISO === "string" && !isNaN(new Date(item.startISO).getTime());
      }).slice(0, 5);
    } catch (err) {
      return [];
    }
  }
  function saveHistory() {
    if (!state.slot) return;
    var item = {
      className: state.className,
      startISO: state.slot.start.toISOString(),
      studio: state.slot.studio,
      createdAt: new Date().toISOString()
    };
    state.history = state.history.filter(function (old) {
      return !(old.className === item.className && old.startISO === item.startISO);
    });
    state.history.unshift(item);
    state.history = state.history.slice(0, 5);
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
    } catch (err) {
      /* private mode / storage full — the booking itself still succeeded */
    }
  }

  /* -----------------------------------------------------------------------
     Saved details (optional, local device only)
     ----------------------------------------------------------------------- */
  function loadSavedDetails() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(SAVED_DETAILS_KEY) || "null");
      if (!raw || typeof raw !== "object") return null;
      var saved = {
        firstName: String(raw.firstName || "").trim().slice(0, 400),
        lastName: String(raw.lastName || "").trim().slice(0, 400),
        email: String(raw.email || "").trim().slice(0, 400)
      };
      if (!saved.firstName && !saved.lastName && !saved.email) return null;
      return saved;
    } catch (err) {
      return null;
    }
  }
  function saveDetails(data) {
    try {
      window.localStorage.setItem(SAVED_DETAILS_KEY, JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email
      }));
    } catch (err) {
      /* private mode / storage full — the booking still works */
    }
  }
  function clearSavedDetails() {
    try {
      window.localStorage.removeItem(SAVED_DETAILS_KEY);
    } catch (err) {
      /* nothing to clear */
    }
  }

  /* -----------------------------------------------------------------------
     Templates
     ----------------------------------------------------------------------- */
  function heroHTML() {
    return '' +
      '<section class="hero">' +
        '<img src="img/hero.webp" alt="" width="1000" height="667" fetchpriority="high">' +
        '<span class="hero-tag">' + svgIcon("i-spark") + ' Hastings</span>' +
        '<div class="hero-copy">' +
          '<p class="eyebrow">Be Well Fit · Studio 1 &amp; 2</p>' +
          '<h1>Find your class. Feel your best.</h1>' +
          '<p>Pick a class and time — we’ll confirm your place by email.</p>' +
        '</div>' +
      '</section>';
  }

  function stepperHTML() {
    var steps = [
      { n: 1, label: "Class", enabled: true },
      { n: 2, label: "Day & time", enabled: !!state.className },
      { n: 3, label: "Details", enabled: !!state.slot }
    ];
    return '<nav class="stepper" aria-label="Booking steps">' + steps.map(function (step) {
      var active = state.step === step.n;
      var done = state.step > step.n;
      var disabled = !step.enabled || active;
      return '<button type="button" class="stepper-step' + (active ? " is-active" : "") + (done ? " is-done" : "") + '"' +
        ' data-action="go-step" data-step="' + step.n + '"' +
        (disabled ? " disabled" : "") + (active ? ' aria-current="step"' : "") +
        ' aria-label="Step ' + step.n + ": " + step.label + '">' +
        '<span class="dot">' + (done ? svgIcon("i-check") : step.n) + '</span>' +
        '<span>' + step.label + '</span>' +
      '</button>';
    }).join("") + '</nav>';
  }

  function chipsHTML() {
    var items = [{ id: "all", label: "All" }].concat(CATEGORIES);
    return items.map(function (cat) {
      var active = state.category === cat.id;
      return '<button type="button" class="chip' + (active ? " is-active" : "") + '" data-action="filter-category" data-category="' + esc(cat.id) + '" aria-pressed="' + (active ? "true" : "false") + '">' +
        esc(cat.label) + '</button>';
    }).join("");
  }

  function classCardsHTML(list) {
    if (!list.length) {
      return '<div class="empty">' +
        '<div class="empty-icon">' + svgIcon("i-search") + '</div>' +
        '<h3>No classes found</h3>' +
        '<p>Try a different search or show every class.</p>' +
        '<button type="button" class="btn btn-soft" data-action="reset-filters">Show all classes</button>' +
      '</div>';
    }
    return list.map(function (cls) {
      var count = cls.slots.length;
      return '<button type="button" class="class-card" data-action="choose-class" data-class="' + esc(cls.name) + '">' +
        categoryIcon(primaryCategory(cls)) +
        '<span class="class-name">' + esc(cls.name) + '</span>' +
        '<span class="class-meta"><span>' + count + '</span> ' + (count === 1 ? "session" : "sessions") + ' a week</span>' +
      '</button>';
    }).join("");
  }

  function historyHTML() {
    if (!state.history.length) return "";
    var rows = state.history.slice(0, 4).map(function (item) {
      var start = new Date(item.startISO);
      return '<div class="history-row">' +
        '<div class="history-info">' +
          '<strong>' + esc(item.className) + '</strong>' +
          '<span>' + esc(fmtDayShort(start)) + ' · ' + esc(fmtTimeFromDate(start)) + ' · Studio ' + esc(item.studio) + '</span>' +
        '</div>' +
        '<span class="history-status">' + svgIcon("i-clock") + 'Awaiting reply</span>' +
      '</div>';
    }).join("");
    return '<section class="history-card" aria-labelledby="history-title">' +
      '<div class="section-head">' +
        '<h2 class="section-title" id="history-title">Your requests</h2>' +
        '<span class="section-meta">Saved on this phone</span>' +
      '</div>' +
      '<div class="history-list">' + rows + '</div>' +
    '</section>';
  }

  function step1HTML() {
    var list = filteredClasses();
    return heroHTML() + stepperHTML() +
      '<div class="section-head">' +
        '<h2 class="section-title">Choose a class</h2>' +
        '<span class="section-meta" id="result-count">' + esc(resultCountLabel(list)) + '</span>' +
      '</div>' +
      '<div class="search">' +
        svgIcon("i-search", "search-icon") +
        '<label class="sr-only" for="class-search">Search classes</label>' +
        '<input id="class-search" type="search" placeholder="Search classes…" autocomplete="off" spellcheck="false" value="' + esc(state.query) + '">' +
        '<button class="search-clear" type="button" data-action="clear-search" aria-label="Clear search"' + (state.query ? "" : " hidden") + '>' +
          svgIcon("i-x") +
        '</button>' +
      '</div>' +
      '<div class="chips" role="group" aria-label="Filter by class type">' + chipsHTML() + '</div>' +
      '<div class="class-grid" id="class-grid">' + classCardsHTML(list) + '</div>' +
      historyHTML() +
      '<p class="fineprint">Timetable updated ' + esc(UPDATED) + '. Classes run Monday to Saturday.</p>' +
      '<p class="info-nudge"><button type="button" class="link-button" data-action="open-info">See prices, memberships &amp; class guide</button></p>';
  }

  function timeSectionHTML() {
    var date = state.selectedDate;
    if (!date) {
      var weekStart = state.weekStart || startOfWeek(new Date());
      var hasSessions = weekDates(weekStart).some(function (day) {
        return bookableSlotsForDate(state.className, day).length > 0;
      });
      return '<div class="time-head"><h3>Times</h3></div>' +
        '<div class="no-times">' + (hasSessions
          ? "Choose a highlighted day above to see its times."
          : "No sessions are left this week. Use the arrows above to see the next week.") + '</div>';
    }
    var slots = bookableSlotsForDate(state.className, date);
    var head = '<div class="time-head"><h3>' + (slots.length ? "Choose a time" : "Times") + '</h3><span>' + esc(fmtDayLong(date)) + '</span></div>';
    if (!slots.length) {
      return head + '<div class="no-times">No more times available on this day. Try another day.</div>';
    }
    return head + '<div class="time-list">' + slots.map(function (slot) {
      return '<button type="button" class="time-card" data-action="choose-time" data-day="' + slot.day + '" data-time="' + esc(slot.time) + '" data-studio="' + slot.studio + '"' +
        ' aria-label="' + esc(fmtTime(slot.time)) + ', Studio ' + slot.studio + ', ' + esc(fmtDayLong(date)) + '">' +
        '<span class="time-card-time">' + esc(fmtTime(slot.time)) + '</span>' +
        '<span class="time-card-sub">Studio ' + slot.studio + '</span>' +
        '<span class="time-card-arrow">' + svgIcon("i-chevron-right") + '</span>' +
      '</button>';
    }).join("") + '</div>';
  }

  function step2HTML() {
    var cls = CLASS_BY_NAME[state.className];
    if (!cls) return step1HTML();
    var weekStart = state.weekStart || startOfWeek(new Date());
    var minStart = startOfWeek(new Date());
    var maxStart = addDays(minStart, 7 * (MAX_WEEKS - 1));
    var canPrev = weekStart.getTime() > minStart.getTime();
    var canNext = weekStart.getTime() < maxStart.getTime();
    var dates = weekDates(weekStart);
    var todayKey = dateKey(new Date());
    var selectedKey = state.selectedDate ? dateKey(state.selectedDate) : "";
    var categories = (cls.info.cats || []).map(function (id) {
      var cat = CAT_BY_ID[id];
      return '<span class="mini-tag">' + esc(cat ? cat.label : id) + '</span>';
    }).join("");
    var dayCells = dates.map(function (date) {
      var allSlots = slotsForDate(cls.name, date);
      var bookable = bookableSlotsForDate(cls.name, date);
      var isToday = dateKey(date) === todayKey;
      var isSelected = dateKey(date) === selectedKey;
      var isPast = date.getTime() < startOfDay(new Date()).getTime() || (isToday && !bookable.length && allSlots.length > 0);
      var classes = "cal-day";
      if (allSlots.length) classes += " has-class";
      if (isToday) classes += " is-today";
      if (isSelected) classes += " is-selected";
      if (isPast) classes += " is-past";
      var label = fmtDateFull(date);
      if (bookable.length) label += ", " + plural(bookable.length, "time") + " available";
      else if (allSlots.length) label += isToday ? ", no more times today" : ", no times available";
      else label += ", no classes";
      return '<button type="button" class="' + classes + '" data-action="select-date" data-date="' + dateKey(date) + '" aria-pressed="' + (isSelected ? "true" : "false") + '" aria-label="' + esc(label) + '"' +
        (bookable.length ? "" : " disabled") + '>' +
        '<span>' + date.getDate() + '</span><span class="dot"></span>' +
      '</button>';
    }).join("");

    return '<button type="button" class="back-btn" data-action="go-step" data-step="1">' + svgIcon("i-arrow-left") + 'All classes</button>' +
      '<h1 class="sr-only">Book ' + esc(cls.name) + '</h1>' +
      stepperHTML() +
      '<section class="class-hero">' +
        categoryIcon(primaryCategory(cls)) +
        '<div class="class-hero-copy">' +
          '<h2>' + esc(cls.name) + '</h2>' +
          '<p>' + esc(cls.info.desc || "A class at Be Well Fit.") + '</p>' +
          '<div class="class-hero-tags">' +
            categories +
            '<span class="mini-tag">' + svgIcon("i-calendar") + plural(cls.slots.length, "session") + ' a week</span>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="calendar" aria-label="Choose a day">' +
        '<div class="cal-head">' +
          '<button type="button" class="cal-nav" data-action="nav-week" data-delta="-1" aria-label="Previous week"' + (canPrev ? "" : " disabled") + '>' + svgIcon("i-arrow-left") + '</button>' +
          '<div class="cal-title">' + esc(fmtWeekRange(weekStart)) + '</div>' +
          '<button type="button" class="cal-nav" data-action="nav-week" data-delta="1" aria-label="Next week"' + (canNext ? "" : " disabled") + '>' + svgIcon("i-chevron-right") + '</button>' +
        '</div>' +
        '<div class="cal-grid">' +
          WEEK_HEADERS.map(function (day) { return '<div class="cal-dow">' + day + '</div>'; }).join("") +
          dayCells +
        '</div>' +
      '</section>' +
      '<section id="time-section">' + timeSectionHTML() + '</section>' +
      '<p class="fineprint">Times are UK time. Sessions take place in Studio 1 or Studio 2.</p>';
  }

  function step3HTML() {
    var cls = CLASS_BY_NAME[state.className];
    var slot = state.slot;
    if (!cls || !slot) return step1HTML();
    var request = state.request || {};
    var saved = loadSavedDetails();
    var firstName = request.firstName || (saved && saved.firstName) || "";
    var lastName = request.lastName || (saved && saved.lastName) || "";
    var email = request.email || (saved && saved.email) || "";
    var notes = request.notes || "";
    var remember = !!saved;

    return '<button type="button" class="back-btn" data-action="go-step" data-step="2">' + svgIcon("i-arrow-left") + 'Change time</button>' +
      '<h1 class="sr-only">Your details for ' + esc(cls.name) + '</h1>' +
      stepperHTML() +
      '<section class="summary-card">' +
        '<div class="summary-top">' +
          categoryIcon(primaryCategory(cls)) +
          '<div class="summary-copy"><small>Your class</small><h2>' + esc(cls.name) + '</h2></div>' +
          '<button type="button" class="summary-change" data-action="go-step" data-step="2">Change</button>' +
        '</div>' +
        '<div class="summary-when">' +
          '<span>' + svgIcon("i-calendar") + esc(fmtDayLong(slot.date)) + '</span>' +
          '<span>' + svgIcon("i-clock") + esc(fmtTime(slot.time)) + '</span>' +
          '<span>' + svgIcon("i-pin") + 'Studio ' + slot.studio + '</span>' +
        '</div>' +
      '</section>' +
      '<form id="booking-form" class="form-card" novalidate>' +
        '<h2>Your details</h2>' +
        '<p class="form-intro">We only use these to arrange your class.</p>' +
        '<div class="field-row">' +
          '<div class="field" data-field="firstName">' +
            '<label for="first-name">First name</label>' +
            '<input id="first-name" name="firstName" type="text" autocomplete="given-name" maxlength="400" required value="' + esc(firstName) + '" aria-describedby="error-firstName">' +
            '<p class="field-error" id="error-firstName"></p>' +
          '</div>' +
          '<div class="field" data-field="lastName">' +
            '<label for="last-name">Last name</label>' +
            '<input id="last-name" name="lastName" type="text" autocomplete="family-name" maxlength="400" required value="' + esc(lastName) + '" aria-describedby="error-lastName">' +
            '<p class="field-error" id="error-lastName"></p>' +
          '</div>' +
        '</div>' +
        '<div class="field" data-field="email">' +
          '<label for="booking-email">Email</label>' +
          '<input id="booking-email" name="email" type="email" inputmode="email" autocomplete="email" spellcheck="false" maxlength="400" required value="' + esc(email) + '" aria-describedby="error-email error-email-hint">' +
          '<p class="field-hint" id="error-email-hint">We’ll reply to this address to confirm your place.</p>' +
          '<p class="field-error" id="error-email"></p>' +
        '</div>' +
        '<div class="field" data-field="notes">' +
          '<label for="booking-notes">Anything we should know? <span class="optional">(optional)</span></label>' +
          '<textarea id="booking-notes" name="notes" maxlength="2000" rows="3" placeholder="First class, injuries, questions…">' + esc(notes) + '</textarea>' +
        '</div>' +
        '<label class="remember-row" for="remember-details">' +
          '<input type="checkbox" id="remember-details" name="remember" value="yes"' + (remember ? ' checked' : '') + '>' +
          '<span class="remember-copy"><strong>Remember me on this phone</strong><span>Your name and email will be filled in next time. Saved only on this device.</span></span>' +
        '</label>' +
        '<div class="form-note">' + svgIcon("i-mail") +
          '<span><strong>This is a booking request.</strong> Your email app will open with the details — press Send there. No payment is taken in this app.</span>' +
        '</div>' +
        '<button class="btn btn-primary btn-block" type="submit">' + svgIcon("i-mail") + 'Send booking request</button>' +
        '<p class="form-footnote">Your place is confirmed when the team replies by email.</p>' +
      '</form>';
  }

  function bookingSummaryHTML(cls, slot) {
    return '<div class="success-summary" aria-label="Booking request summary">' +
      '<div class="success-row"><span>Class</span><span>' + esc(cls.name) + '</span></div>' +
      '<div class="success-row"><span>Day</span><span>' + esc(fmtDateFull(slot.date)) + '</span></div>' +
      '<div class="success-row"><span>Time</span><span>' + esc(fmtTime(slot.time)) + '</span></div>' +
      '<div class="success-row"><span>Studio</span><span>Studio ' + slot.studio + '</span></div>' +
    '</div>';
  }

  function step4HTML() {
    var cls = CLASS_BY_NAME[state.className];
    var slot = state.slot;
    var request = state.request || {};
    if (!cls || !slot) return step1HTML();
    var contact = CFG.contactEmail || "bewellfit@gmx.com";
    var summary = bookingSummaryHTML(cls, slot);

    if (state.emailPending) {
      return '<section class="success-wrap">' +
        '<div class="success-badge">' + svgIcon("i-mail") + '</div>' +
        '<h1>Press Send in your email app</h1>' +
        '<p class="success-lead">Your email app should have opened with your request for <strong>' + esc(cls.name) + '</strong>. Press <strong>Send</strong> there and the team will get it.</p>' +
        summary +
        '<div class="success-next"><strong>Didn’t see your email app?</strong><br>Tap <strong>Open my email app</strong> below. If you don’t have email set up on this phone, email <a href="mailto:' + esc(contact) + '">' + esc(contact) + '</a> instead.</div>' +
        '<div class="success-actions">' +
          '<a class="btn btn-primary btn-block" href="' + esc(buildMailto(request)) + '">' + svgIcon("i-mail") + 'Open my email app</a>' +
          '<button type="button" class="btn btn-ghost btn-block" data-action="email-sent">' + svgIcon("i-check") + 'I’ve sent the email</button>' +
        '</div>' +
        '<p class="success-help">No email app? <button type="button" class="link-button" data-action="email-copy">Copy the request details</button> and send them to ' + esc(contact) + '.</p>' +
      '</section>';
    }

    return '<section class="success-wrap">' +
      '<div class="success-badge">' + svgIcon("i-check") + '</div>' +
      '<h1>Request sent!</h1>' +
      '<p class="success-lead">Your booking email is on its way to the Be Well Fit team. They’ll reply to <strong>' + esc(request.email || "your email") + '</strong> to confirm your place.</p>' +
      summary +
      '<div class="success-next"><strong>What happens next</strong><br>Keep an eye on your inbox. If you don’t hear back within 24 hours, email <a href="mailto:' + esc(contact) + '">' + esc(contact) + '</a> so your request isn’t missed.</div>' +
      '<div class="success-actions">' +
        '<button type="button" class="btn btn-primary btn-block" data-action="book-again">Book another class</button>' +
        '<button type="button" class="btn btn-ghost btn-block" data-action="view-timetable">View timetable</button>' +
      '</div>' +
      '<p class="success-help">Requests are saved on this phone so you can check what you sent. Your place isn’t confirmed until the team replies.</p>' +
    '</section>';
  }

  /* -----------------------------------------------------------------------
     Rendering
     ----------------------------------------------------------------------- */
  function renderBook(opts) {
    opts = opts || {};
    if (!els.bookFlow) return;
    var html;
    if (state.step === 2) html = step2HTML();
    else if (state.step === 3) html = step3HTML();
    else if (state.step === 4) html = step4HTML();
    else { state.step = 1; html = step1HTML(); }
    els.bookFlow.innerHTML = html;
    if (opts.scroll) scrollToTop();
    if (opts.focus) focusMain();
    if (opts.focusCalNav) {
      var nav = $('[data-action="nav-week"][data-delta="' + opts.focusCalNav + '"]', els.bookFlow);
      if (nav && !nav.disabled) nav.focus({ preventScroll: true });
    }
  }

  function renderClassResults() {
    if (!els.bookFlow) return;
    var list = filteredClasses();
    var grid = $("#class-grid", els.bookFlow);
    if (grid) grid.innerHTML = classCardsHTML(list);
    var count = $("#result-count", els.bookFlow);
    if (count) count.textContent = resultCountLabel(list);
  }

  function renderTimeSection() {
    var holder = $("#time-section", els.bookFlow);
    if (holder) holder.innerHTML = timeSectionHTML();
  }

  function renderTimetable(opts) {
    opts = opts || {};
    if (!els.ttDays || !els.ttContent) return;
    var today = startOfDay(new Date());
    var day = state.ttDay;
    if (!day || day < 1 || day > 6) day = today.getDay() >= 1 && today.getDay() <= 6 ? today.getDay() : 1;
    state.ttDay = day;
    var date = nextWeekdayDate(day);

    els.ttDays.innerHTML = [1, 2, 3, 4, 5, 6].map(function (d) {
      var tabDate = nextWeekdayDate(d);
      var active = d === day;
      var isToday = sameDay(tabDate, today);
      return '<button type="button" role="tab" id="tt-tab-' + d + '" class="day-tab' + (active ? " is-active" : "") + '" data-day="' + d + '" aria-selected="' + (active ? "true" : "false") + '" aria-controls="tt-content" tabindex="' + (active ? "0" : "-1") + '" aria-label="' + esc(DAYS_LONG[d] + ", " + tabDate.getDate() + " " + MONTHS_LONG[tabDate.getMonth()] + " " + tabDate.getFullYear()) + '">' +
        '<span>' + DAYS_SHORT[d] + '</span>' + (isToday ? '<span class="today-mark" aria-hidden="true"></span>' : "") +
      '</button>';
    }).join("");

    var title = $("#tt-day-title");
    var dateEl = $("#tt-day-date");
    var pill = $("#tt-today-pill");
    var isTodaySelected = sameDay(date, today);
    if (title) title.textContent = DAYS_LONG[day];
    if (dateEl) {
      dateEl.textContent = isTodaySelected
        ? date.getDate() + " " + MONTHS_LONG[date.getMonth()] + " " + date.getFullYear()
        : "Next " + DAYS_LONG[day] + " · " + date.getDate() + " " + MONTHS_LONG[date.getMonth()] + " " + date.getFullYear();
    }
    if (pill) pill.hidden = !isTodaySelected;

    els.ttContent.setAttribute("role", "tabpanel");
    els.ttContent.setAttribute("aria-labelledby", "tt-tab-" + day);

    var slots = SLOTS.filter(function (slot) { return slot.day === day; }).sort(function (a, b) {
      return a.time.localeCompare(b.time);
    });
    if (!slots.length) {
      els.ttContent.innerHTML = '<div class="tt-closed">No classes are listed for this day.</div>';
    } else {
      els.ttContent.innerHTML = [1, 2].map(function (studio) {
        var group = slots.filter(function (slot) { return slot.studio === studio; });
        if (!group.length) return "";
        return '<section class="studio-card" aria-label="Studio ' + studio + '">' +
          '<h3 class="studio-head">' + svgIcon("i-pin") + 'Studio ' + studio + '</h3>' +
          group.map(function (slot) {
            var passedToday = sameDay(date, today) && !isBookable(date, slot);
            var bookDate = passedToday ? nextDateForSlot(slot) : date;
            var dateLabel = bookDate ? fmtDateFull(bookDate) : "the next available session";
            return '<button type="button" class="tt-row' + (passedToday ? " is-past" : "") + '" data-action="book-row" data-class="' + esc(slot.name) + '" data-day="' + slot.day + '" data-time="' + esc(slot.time) + '" data-studio="' + slot.studio + '"' +
              ' aria-label="Book ' + esc(slot.name) + ' on ' + esc(dateLabel) + ' at ' + esc(fmtTime(slot.time)) + ', Studio ' + slot.studio + '">' +
              '<span class="tt-time">' + esc(fmtTime(slot.time)) + '</span>' +
              '<span class="tt-name">' + esc(slot.name) + '</span>' +
              '<span class="tt-book">' + (passedToday ? "Next week" : "Book") + '</span>' +
            '</button>';
          }).join("") +
        '</section>';
      }).join("");
    }

    if (opts.focusDay) {
      var activeTab = $(".day-tab.is-active", els.ttDays);
      if (activeTab) activeTab.focus({ preventScroll: true });
    }
  }

  function priceOptionHTML(item) {
    return '<div class="price-option' + (item.featured ? " is-featured" : "") + '">' +
      '<div class="price-copy">' +
        '<strong>' + esc(item.name) + '</strong>' +
        (item.desc ? '<span>' + esc(item.desc) + '</span>' : "") +
      '</div>' +
      '<div class="price-amount">' + esc(item.price) +
        (item.unit ? '<small>' + esc(item.unit) + '</small>' : "") +
      '</div>' +
    '</div>';
  }

  function priceGroupHTML(title, items) {
    if (!items || !items.length) return "";
    return '<div class="price-group">' +
      '<h3>' + esc(title) + '</h3>' +
      items.map(priceOptionHTML).join("") +
    '</div>';
  }

  function priceListHTML(title, items) {
    if (!items || !items.length) return "";
    return '<div class="price-subgroup">' +
      '<h4>' + esc(title) + '</h4>' +
      '<dl class="price-list">' +
        items.map(function (item) {
          return '<div class="price-row"><dt>' + esc(item.name) + '</dt><dd>' + esc(item.price) + '</dd></div>';
        }).join("") +
      '</dl>' +
    '</div>';
  }

  function pricesHTML() {
    if (!PRICING || !PRICING.memberships) return "";
    var html = priceGroupHTML("Memberships", PRICING.memberships);
    html += priceGroupHTML("Class passes", PRICING.passes);
    if (PRICING.individualGroups && PRICING.individualGroups.length) {
      html += '<div class="price-group">' +
        '<h3>Individual classes</h3>' +
        PRICING.individualGroups.map(function (group) {
          return priceListHTML(group.title, group.items);
        }).join("") +
      '</div>';
    }
    return html;
  }

  function guideNames() {
    var query = state.guideQuery.trim().toLowerCase();
    return Object.keys(CLASS_INFO).filter(function (name) {
      if (!query) return true;
      var info = CLASS_INFO[name] || {};
      var categoryLabels = (info.cats || []).map(function (id) {
        return CAT_BY_ID[id] ? CAT_BY_ID[id].label : id;
      }).join(" ");
      return (name + " " + (info.desc || "") + " " + categoryLabels).toLowerCase().indexOf(query) !== -1;
    }).sort(function (a, b) { return a.localeCompare(b, "en"); });
  }

  function guideItemHTML(name) {
    var info = CLASS_INFO[name] || {};
    var category = CAT_BY_ID[(info.cats && info.cats[0]) || "fitness"];
    return '<details class="guide-item">' +
      '<summary>' +
        '<span class="guide-name">' + esc(name) + '</span>' +
        (category ? '<span class="guide-cat">' + esc(category.label) + '</span>' : "") +
        '<svg class="icon guide-chevron" aria-hidden="true"><use href="#i-chevron-right"/></svg>' +
      '</summary>' +
      '<p>' + esc(info.desc || "Ask the team for more information about this class.") + '</p>' +
    '</details>';
  }

  function renderClassGuide() {
    var listEl = $("#guide-list");
    var countEl = $("#guide-count");
    var names = guideNames();
    var query = state.guideQuery.trim();
    if (listEl) {
      listEl.innerHTML = names.length
        ? names.map(guideItemHTML).join("")
        : '<div class="guide-empty">No classes match “' + esc(query) + '”. Try another search.</div>';
    }
    if (countEl) {
      countEl.textContent = query
        ? names.length + (names.length === 1 ? " match" : " matches")
        : names.length + " classes";
    }
  }

  function fillInfo() {
    var email = CFG.contactEmail || "bewellfit@gmx.com";
    var emailEl = $("#info-email");
    if (emailEl) {
      emailEl.textContent = email;
      emailEl.href = "mailto:" + email;
    }
    var addressEl = $("#info-address");
    if (addressEl) addressEl.textContent = (CFG.address || "Clifton Rd, Hastings TN34 2AA").replace(/^Bewellfit,\s*/i, "");
    var address2El = $("#info-address-2");
    if (address2El) address2El.textContent = CFG.studio2Address || "Ore Community Centre, Hastings TN35 5BH";
    var mapsEl = $("#info-maps");
    if (mapsEl && CFG.mapsUrl) mapsEl.href = CFG.mapsUrl;
    var maps2El = $("#info-maps-2");
    if (maps2El && CFG.studio2MapsUrl) maps2El.href = CFG.studio2MapsUrl;

    var priceGroups = $("#price-groups");
    if (priceGroups) priceGroups.innerHTML = pricesHTML();
    var pricesUpdated = $("#prices-updated");
    if (pricesUpdated) pricesUpdated.textContent = PRICING.updated || UPDATED;
    var priceEmail = $("#info-prices-email");
    if (priceEmail) {
      priceEmail.href = "mailto:" + email + "?subject=" + encodeURIComponent("Membership and class passes");
    }

    var guideSearch = $("#guide-search");
    if (guideSearch && guideSearch.value !== state.guideQuery) guideSearch.value = state.guideQuery;
    renderClassGuide();

    ["#tt-updated", "#info-updated"].forEach(function (selector) {
      var el = $(selector);
      if (el) el.textContent = UPDATED;
    });
    var versionEl = $("#info-version");
    if (versionEl) versionEl.textContent = "v" + APP_VERSION;
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
  function focusMain() {
    if (els.main) els.main.focus({ preventScroll: true });
  }
  function announce(message) {
    var live = els.live;
    if (!live) return;
    live.textContent = "";
    window.setTimeout(function () { live.textContent = message; }, 60);
  }
  function stepAnnouncement() {
    if (state.step === 2) return state.className ? "Choose a day and time for " + state.className + "." : "Choose a day and time.";
    if (state.step === 3) return "Enter your details and send the booking request.";
    if (state.step === 4) {
      return state.emailPending
        ? "Your email app should open. Press Send there to request your place."
        : "Booking request emailed. The team will reply by email to confirm.";
    }
    return "Choose a class.";
  }

  /* -----------------------------------------------------------------------
     Navigation
     ----------------------------------------------------------------------- */
  function tabFromHash() {
    var hash = (window.location.hash || "").replace(/^#\/?/, "").split("?")[0];
    return ["book", "timetable", "info"].indexOf(hash) !== -1 ? hash : "book";
  }

  function switchTab(name, opts) {
    opts = opts || {};
    if (["book", "timetable", "info"].indexOf(name) === -1) name = "book";
    state.tab = name;
    Object.keys(els.views).forEach(function (key) {
      if (els.views[key]) els.views[key].hidden = key !== name;
    });
    els.tabs.forEach(function (tab) {
      var active = tab.dataset.nav === name;
      tab.classList.toggle("is-active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    if (name === "book") renderBook();
    else if (name === "timetable") renderTimetable();
    else fillInfo();

    if (opts.replaceHash !== false && window.location.hash !== "#" + name) {
      try { window.history.replaceState(null, "", "#" + name); } catch (err) { /* file:// */ }
    }
    document.title = name === "book" ? "Book a class — Be Well Fit" : name === "timetable" ? "Timetable — Be Well Fit" : "Info — Be Well Fit";
    if (opts.scroll) scrollToTop();
    if (opts.focus) {
      focusMain();
      announce(name === "book" ? stepAnnouncement() : name === "timetable" ? "Timetable." : "Information about Be Well Fit.");
    }
  }

  function goToStep(step) {
    step = Number(step);
    if (step === 2 && !state.className) return;
    if (step === 3 && !state.slot) return;
    if (![1, 2, 3].includes(step) || step === state.step) return;
    state.step = step;
    renderBook({ scroll: true, focus: true });
    announce(stepAnnouncement());
  }

  function chooseClass(name) {
    var cls = CLASS_BY_NAME[name];
    if (!cls) return;
    state.className = name;
    state.slot = null;
    var next = nextBookableDate(name);
    state.weekStart = startOfWeek(next || new Date());
    state.selectedDate = next;
    state.step = 2;
    renderBook({ scroll: true, focus: true });
    announce(stepAnnouncement());
  }

  function changeWeek(delta) {
    if (!state.className) return;
    var minStart = startOfWeek(new Date());
    var maxStart = addDays(minStart, 7 * (MAX_WEEKS - 1));
    var current = state.weekStart || minStart;
    var next = addDays(current, delta * 7);
    if (next.getTime() < minStart.getTime() || next.getTime() > maxStart.getTime()) return;
    state.weekStart = next;
    state.selectedDate = firstBookableDateInWeek(state.className, next);
    renderBook({ scroll: false, focusCalNav: String(delta) });
    announce(fmtWeekRange(next) + (state.selectedDate ? ". " + fmtDayLong(state.selectedDate) + " selected." : ". No sessions left this week."));
  }

  function selectDate(key) {
    if (!state.className) return;
    var date = parseDateKey(key);
    if (!date) return;
    if (!bookableSlotsForDate(state.className, date).length) return;
    state.selectedDate = date;
    $$(".cal-day", els.bookFlow).forEach(function (button) {
      var selected = button.dataset.date === key;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    renderTimeSection();
    var count = bookableSlotsForDate(state.className, date).length;
    announce(fmtDayLong(date) + " selected. " + plural(count, "time") + " available.");
  }

  function chooseTime(button) {
    if (!state.className || !state.selectedDate) return;
    var slot = SLOTS.filter(function (item) {
      return item.name === state.className &&
        item.day === Number(button.dataset.day) &&
        item.time === button.dataset.time &&
        item.studio === Number(button.dataset.studio);
    })[0];
    if (!slot) return;
    if (!isBookable(state.selectedDate, slot)) {
      showToast("That session has just passed. Please choose another time.");
      renderBook({ scroll: false });
      return;
    }
    state.slot = {
      name: slot.name,
      day: slot.day,
      time: slot.time,
      studio: slot.studio,
      date: state.selectedDate,
      start: slotStart(state.selectedDate, slot.time)
    };
    state.step = 3;
    renderBook({ scroll: true, focus: true });
    announce(stepAnnouncement());
  }

  function resetBooking() {
    state.step = 1;
    state.className = null;
    state.weekStart = null;
    state.selectedDate = null;
    state.slot = null;
    state.request = null;
    state.emailPending = false;
    state.category = "all";
    state.query = "";
    renderBook({ scroll: true, focus: true });
    announce("Choose a class.");
  }

  function startFromTimetable(className, day, time, studio) {
    var slot = SLOTS.filter(function (item) {
      return item.name === className && item.day === Number(day) && item.time === time && item.studio === Number(studio);
    })[0];
    if (!slot) return;
    var date = nextDateForSlot(slot);
    if (!date) {
      showToast("No upcoming session was found for that class.");
      return;
    }
    state.className = className;
    state.weekStart = startOfWeek(date);
    state.selectedDate = date;
    state.slot = null;
    state.step = 2;
    switchTab("book", { scroll: true, focus: true });
  }

  /* -----------------------------------------------------------------------
     Booking request by email
     ----------------------------------------------------------------------- */
  function validateRequest(data) {
    var errors = {};
    if (!data.firstName) errors.firstName = "Please enter your first name.";
    else if (data.firstName.length > 400) errors.firstName = "Please use 400 characters or fewer.";
    if (!data.lastName) errors.lastName = "Please enter your last name.";
    else if (data.lastName.length > 400) errors.lastName = "Please use 400 characters or fewer.";
    if (!data.email) errors.email = "Please enter your email address.";
    else if (!EMAIL_RE.test(data.email)) errors.email = "Enter a valid email address, like name@example.com.";
    else if (data.email.length > 400) errors.email = "Please use 400 characters or fewer.";
    if (data.notes.length > 2000) errors.notes = "Please use 2,000 characters or fewer.";
    return errors;
  }

  function clearFieldError(input) {
    var field = input.closest(".field");
    if (!field) return;
    field.classList.remove("has-error");
    input.removeAttribute("aria-invalid");
    var error = $(".field-error", field);
    if (error) error.textContent = "";
  }

  function applyFieldErrors(errors) {
    if (!errors) return;
    var form = $("#booking-form");
    if (!form) return;
    $$(".field", form).forEach(function (field) {
      field.classList.remove("has-error");
      var error = $(".field-error", field);
      if (error) error.textContent = "";
      var input = $("input, textarea", field);
      if (input) input.removeAttribute("aria-invalid");
    });
    Object.keys(errors).forEach(function (key) {
      var field = $('.field[data-field="' + key + '"]', form);
      if (!field) return;
      field.classList.add("has-error");
      var error = $(".field-error", field);
      if (error) error.textContent = errors[key];
      var input = $("input, textarea", field);
      if (input) input.setAttribute("aria-invalid", "true");
    });
    var firstKey = Object.keys(errors)[0];
    if (firstKey) {
      var firstInput = $('[name="' + firstKey + '"]', form);
      if (firstInput) firstInput.focus({ preventScroll: false });
    }
  }

  function requestSubject() {
    return "Class booking request – " + state.className + " – " + fmtDayShort(state.slot.date);
  }

  function requestBody(data) {
    var lines = [
      "Hi Be Well Fit,",
      "",
      "I'd like to book " + state.className + " on " + fmtDateFull(state.slot.date) + " at " + fmtTime(state.slot.time) + ", Studio " + state.slot.studio + ".",
      "",
      "Name: " + data.firstName + " " + data.lastName,
      "Email: " + data.email
    ];
    if (data.notes.trim()) lines.push("Notes: " + data.notes.trim());
    lines.push("", "Please reply to confirm my place.", "", "Sent from the Be Well Fit app.");
    return lines.join("\n");
  }

  function buildMailto(data) {
    return "mailto:" + (CFG.contactEmail || "bewellfit@gmx.com") +
      "?subject=" + encodeURIComponent(requestSubject()) +
      "&body=" + encodeURIComponent(requestBody(data));
  }

  function requestText(data) {
    return "To: " + (CFG.contactEmail || "bewellfit@gmx.com") + "\n" +
      "Subject: " + requestSubject() + "\n\n" + requestBody(data);
  }

  function launchEmail(data) {
    try {
      window.location.href = buildMailto(data);
      return true;
    } catch (err) {
      showToast("Your email app couldn’t be opened. Email " + (CFG.contactEmail || "bewellfit@gmx.com") + " directly.");
      return false;
    }
  }

  function startEmailRequest(data) {
    state.request = data;
    state.emailPending = true;
    state.step = 4;
    switchTab("book", { scroll: true, focus: true });
    announce(stepAnnouncement());
    launchEmail(data);
  }

  function confirmEmailSent() {
    if (!state.emailPending) return;
    state.emailPending = false;
    saveHistory();
    renderBook({ scroll: true, focus: true });
    announce(stepAnnouncement());
  }

  function copyEmailRequest() {
    if (!state.request) return;
    var email = CFG.contactEmail || "bewellfit@gmx.com";
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      showToast("Please email " + email + " directly.");
      return;
    }
    navigator.clipboard.writeText(requestText(state.request)).then(function () {
      showToast("Request copied. Paste it into an email to " + email + ".");
    }, function () {
      showToast("Couldn’t copy the request. Please email " + email + " directly.");
    });
  }

  function submitBooking(form) {
    var formData = new FormData(form);
    var data = {
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      notes: String(formData.get("notes") || "").trim()
    };
    state.request = data;
    var errors = validateRequest(data);
    if (Object.keys(errors).length) {
      applyFieldErrors(errors);
      announce("Please check the highlighted fields.");
      return;
    }

    if (formData.get("remember") === "yes") saveDetails(data);
    else clearSavedDetails();

    startEmailRequest(data);
  }

  /* -----------------------------------------------------------------------
     Events
     ----------------------------------------------------------------------- */
  function onBookClick(event) {
    var target = event.target instanceof Element ? event.target : null;
    var button = target ? target.closest("[data-action]") : null;
    if (!button || !els.bookFlow || !els.bookFlow.contains(button)) return;
    var action = button.dataset.action;

    if (action === "filter-category") {
      state.category = button.dataset.category || "all";
      $$(".chip", els.bookFlow).forEach(function (chip) {
        var active = chip.dataset.category === state.category;
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", active ? "true" : "false");
      });
      renderClassResults();
    } else if (action === "clear-search") {
      state.query = "";
      var search = $("#class-search", els.bookFlow);
      if (search) { search.value = ""; search.focus(); }
      var clear = $(".search-clear", els.bookFlow);
      if (clear) clear.hidden = true;
      renderClassResults();
    } else if (action === "reset-filters") {
      state.category = "all";
      state.query = "";
      renderBook({ scroll: false });
      var field = $("#class-search", els.bookFlow);
      if (field) field.focus({ preventScroll: true });
      announce("Showing all classes.");
    } else if (action === "choose-class") {
      chooseClass(button.dataset.class);
    } else if (action === "go-step") {
      goToStep(button.dataset.step);
    } else if (action === "nav-week") {
      changeWeek(Number(button.dataset.delta));
    } else if (action === "select-date") {
      selectDate(button.dataset.date);
    } else if (action === "choose-time") {
      chooseTime(button);
    } else if (action === "book-again") {
      resetBooking();
    } else if (action === "view-timetable") {
      switchTab("timetable", { scroll: true, focus: true });
    } else if (action === "open-info") {
      switchTab("info", { scroll: true, focus: true });
    } else if (action === "email-sent") {
      confirmEmailSent();
    } else if (action === "email-copy") {
      copyEmailRequest();
    }
  }

  function onBookInput(event) {
    var input = event.target;
    if (!input || !input.matches) return;
    if (input.id === "remember-details") {
      if (!input.checked) clearSavedDetails();
      return;
    }
    if (input.id === "class-search") {
      state.query = input.value;
      var clear = $(".search-clear", els.bookFlow);
      if (clear) clear.hidden = !input.value;
      renderClassResults();
      return;
    }
    if (state.step === 3 && input.name && ["firstName", "lastName", "email", "notes"].indexOf(input.name) !== -1) {
      state.request = Object.assign({}, state.request || {}, { [input.name]: input.value });
      if (input.closest(".field.has-error")) clearFieldError(input);
    }
  }

  function onBookSubmit(event) {
    if (!event.target || event.target.id !== "booking-form") return;
    event.preventDefault();
    submitBooking(event.target);
  }

  function onDayTabClick(event) {
    var target = event.target instanceof Element ? event.target : null;
    var tab = target ? target.closest(".day-tab") : null;
    if (!tab) return;
    var day = Number(tab.dataset.day);
    if (!day || day === state.ttDay) return;
    state.ttDay = day;
    renderTimetable({ focusDay: true });
    announce(DAYS_LONG[day] + " timetable.");
  }

  function onDayTabsKeydown(event) {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) === -1) return;
    var tabs = $$(".day-tab", els.ttDays);
    var index = tabs.indexOf(document.activeElement);
    if (index === -1) return;
    event.preventDefault();
    var nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex = index === 0 ? tabs.length - 1 : index - 1;
    if (event.key === "ArrowRight") nextIndex = index === tabs.length - 1 ? 0 : index + 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    var next = tabs[nextIndex];
    if (!next) return;
    state.ttDay = Number(next.dataset.day);
    renderTimetable({ focusDay: true });
    announce(DAYS_LONG[state.ttDay] + " timetable.");
  }

  function onTimetableClick(event) {
    var target = event.target instanceof Element ? event.target : null;
    var row = target ? target.closest(".tt-row") : null;
    if (!row) return;
    startFromTimetable(row.dataset.class, row.dataset.day, row.dataset.time, row.dataset.studio);
  }

  function onBeforeInstall(event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    refreshInstallUI();
  }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  }

  function refreshInstallUI() {
    var standalone = isStandalone();
    var showButton = !!deferredInstallPrompt && !standalone;
    if (els.installBtn) els.installBtn.hidden = !showButton;
    if (els.installCardBtn) els.installCardBtn.hidden = !showButton;
    if (els.installHelp) els.installHelp.hidden = standalone;
    if (els.installedNote) els.installedNote.hidden = !standalone;
  }

  async function promptInstall() {
    if (!deferredInstallPrompt) {
      showToast("Use your browser menu to add the app to your home screen.");
      return;
    }
    deferredInstallPrompt.prompt();
    var choice = { outcome: "dismissed" };
    try { choice = await deferredInstallPrompt.userChoice; } catch (err) { /* ignore */ }
    deferredInstallPrompt = null;
    refreshInstallUI();
    if (choice && choice.outcome === "accepted") showToast("Installing Be Well Fit…");
  }

  function handleInstalled() {
    deferredInstallPrompt = null;
    refreshInstallUI();
    showToast("Be Well Fit is installed.");
  }

  function updateOnlineStatus() {
    var offline = !navigator.onLine;
    if (els.offlineBanner) els.offlineBanner.hidden = !offline;
    document.body.classList.toggle("is-offline", offline);
  }
  function handleOffline() {
    updateOnlineStatus();
    showToast("You’re offline. You can still browse the timetable.");
  }
  function handleOnline() {
    updateOnlineStatus();
    showToast("You’re back online.");
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove("is-visible");
    }, 2800);
  }

  function hasBookingDraft() {
    if (state.step !== 3 || !state.request) return false;
    return ["firstName", "lastName", "email", "notes"].some(function (key) {
      return String(state.request[key] || "").trim() !== "";
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    var local = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (window.location.protocol !== "https:" && !local) return;

    var hadController = !!navigator.serviceWorker.controller;
    var refreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!hadController || refreshing) return;
      if (hasBookingDraft()) {
        showToast("A new version is ready. Reopen the app after this booking to update.");
        return;
      }
      refreshing = true;
      window.location.reload();
    });

    var register = function () {
      navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (registration) {
        if (registration && registration.update) registration.update().catch(function () {});
      }).catch(function () {
        /* offline installation just won’t be available */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);
  }

  /* -----------------------------------------------------------------------
     Boot
     ----------------------------------------------------------------------- */
  function cacheElements() {
    els.main = $("#main");
    els.bookFlow = $("#book-flow");
    els.views = {
      book: $("#view-book"),
      timetable: $("#view-timetable"),
      info: $("#view-info")
    };
    els.tabs = $$(".tab");
    els.ttDays = $("#tt-days");
    els.ttContent = $("#tt-content");
    els.offlineBanner = $("#offline-banner");
    els.toast = $("#toast");
    els.live = $("#live");
    els.installBtn = $("#install-btn");
    els.installCardBtn = $("#install-card-btn");
    els.installHelp = $("#install-help");
    els.installedNote = $("#installed-note");
  }

  function bindEvents() {
    els.tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        switchTab(tab.dataset.nav, { scroll: true, focus: true });
      });
    });
    var brand = $("#brand-link");
    if (brand) {
      brand.addEventListener("click", function (event) {
        event.preventDefault();
        switchTab("book", { scroll: true, focus: true });
      });
    }
    if (els.bookFlow) {
      els.bookFlow.addEventListener("click", onBookClick);
      els.bookFlow.addEventListener("input", onBookInput);
      els.bookFlow.addEventListener("submit", onBookSubmit);
    }
    if (els.ttDays) {
      els.ttDays.addEventListener("click", onDayTabClick);
      els.ttDays.addEventListener("keydown", onDayTabsKeydown);
    }
    if (els.ttContent) els.ttContent.addEventListener("click", onTimetableClick);
    var guideSearch = $("#guide-search");
    if (guideSearch) {
      guideSearch.addEventListener("input", function () {
        state.guideQuery = guideSearch.value;
        renderClassGuide();
      });
    }
    if (els.installBtn) els.installBtn.addEventListener("click", promptInstall);
    if (els.installCardBtn) els.installCardBtn.addEventListener("click", promptInstall);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("hashchange", function () {
      var hash = (window.location.hash || "").replace(/^#\/?/, "").split("?")[0];
      if (["book", "timetable", "info"].indexOf(hash) === -1) return;
      if (hash !== state.tab) switchTab(hash, { scroll: true, focus: true, replaceHash: false });
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible") return;
      var key = dateKey(new Date());
      if (key === currentDayKey) return;
      currentDayKey = key;
      if (state.tab === "timetable") renderTimetable();
      else if (state.tab === "book" && state.step === 2) renderBook();
    });
    var mq = window.matchMedia ? window.matchMedia("(display-mode: standalone)") : null;
    if (mq && mq.addEventListener) mq.addEventListener("change", refreshInstallUI);
  }

  function init() {
    cacheElements();
    state.history = loadHistory();
    currentDayKey = dateKey(new Date());
    fillInfo();
    refreshInstallUI();
    updateOnlineStatus();
    bindEvents();
    switchTab(tabFromHash(), { scroll: false, focus: false });
    registerServiceWorker();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
