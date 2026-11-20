/* Be Well Fit — class booking app
   Static client: browses the timetable and sends booking requests through the
   studio's existing Contact Form 7 form. No API keys or backend required. */
(function () {
  "use strict";

  var CFG = window.BWF_CONFIG || {};
  var CATEGORIES = window.BWF_CATEGORIES || [];
  var CLASS_INFO = window.BWF_CLASS_INFO || {};
  var CLASS_IMAGES = window.BWF_CLASS_IMAGES || {};
  var SLOTS = window.BWF_SLOTS || [];
  var UPDATED = window.BWF_UPDATED || "";
  var PLACEHOLDER_IMAGE = "img/classes/placeholder.webp";
  var MAX_WEEKS = 8;
  var LEAD_TIME = 60 * 60 * 1000;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var HISTORY_KEY = "bewellfit.requests.v1";

  var DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
    className: null,
    slot: null,
    request: null,
    submitting: false,
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
  function stripTags(value) {
    return String(value == null ? "" : value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function dateKey(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
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
  function fmtTimeFromDate(date) {
    return fmtTime(String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0"));
  }
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function classPhoto(name) {
    return CLASS_IMAGES[name] || PLACEHOLDER_IMAGE;
  }
  function orderedSlots(cls) {
    return cls.slots.slice().sort(function (a, b) {
      return a.day - b.day || a.time.localeCompare(b.time);
    });
  }
  function categoryTags(cls) {
    return (cls.info.cats || []).map(function (id) {
      var cat = CAT_BY_ID[id];
      return '<span class="mini-tag">' + esc(cat ? cat.label : id) + '</span>';
    }).join("");
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
     Templates
     ----------------------------------------------------------------------- */
  function classCardsHTML(list) {
    return list.map(function (cls, index) {
      return '<button type="button" class="class-tile" data-action="choose-class" data-class="' + esc(cls.name) + '">' +
        '<img src="' + esc(classPhoto(cls.name)) + '" alt="" width="640" height="800"' +
          (index < 2 ? ' fetchpriority="high"' : index > 3 ? ' loading="lazy"' : "") +
          ' decoding="async">' +
        '<span class="class-tile-name">' + esc(cls.name) + '</span>' +
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
    return '<h1 class="sr-only">Choose a class</h1>' +
      '<div class="class-grid" id="class-grid">' + classCardsHTML(CLASSES) + '</div>';
  }

  function sessionRowsHTML(cls) {
    return orderedSlots(cls).map(function (slot) {
      var date = nextDateForSlot(slot);
      var dateLabel = date ? fmtDateFull(date) : "no upcoming date";
      return '<li class="session-row">' +
        '<div class="session-when">' +
          '<span class="session-day">' + esc(DAYS_LONG[slot.day]) + '</span>' +
          '<span class="session-date">' + (date ? esc(fmtDayShort(date)) : "No upcoming date") + '</span>' +
        '</div>' +
        '<div class="session-detail">' +
          '<span class="session-time">' + esc(fmtTime(slot.time)) + '</span>' +
          '<span class="session-studio">' + svgIcon("i-pin") + 'Studio ' + slot.studio + '</span>' +
        '</div>' +
        '<button type="button" class="session-book" data-action="book-session" data-day="' + slot.day + '" data-time="' + esc(slot.time) + '" data-studio="' + slot.studio + '"' +
          (date ? ' aria-label="Book here — ' + esc(dateLabel) + ' at ' + esc(fmtTime(slot.time)) + ', Studio ' + slot.studio + '"' : " disabled") + '>' +
          'Book here</button>' +
      '</li>';
    }).join("");
  }

  function step2HTML() {
    var cls = CLASS_BY_NAME[state.className];
    if (!cls) return step1HTML();
    return '<button type="button" class="back-btn" data-action="go-step" data-step="1">' + svgIcon("i-arrow-left") + 'All classes</button>' +
      '<section class="class-detail">' +
        '<div class="class-detail-photo">' +
          '<img src="' + esc(classPhoto(cls.name)) + '" alt="" width="640" height="800" fetchpriority="high">' +
          '<h1 class="class-detail-name">' + esc(cls.name) + '</h1>' +
        '</div>' +
        '<p class="class-detail-desc">' + esc(cls.info.desc || "A class at Be Well Fit.") + '</p>' +
        '<div class="class-hero-tags">' + categoryTags(cls) + '</div>' +
      '</section>' +
      '<div class="sessions-head"><h2>Weekly sessions</h2><span>Choose a session to book</span></div>' +
      '<ul class="session-list">' + sessionRowsHTML(cls) + '</ul>' +
      '<p class="fineprint">Times are UK time. Sessions take place in Studio 1 or Studio 2. “Book here” chooses the next available date.</p>';
  }

  function step3HTML() {
    var cls = CLASS_BY_NAME[state.className];
    var slot = state.slot;
    if (!cls || !slot) return step1HTML();
    var request = state.request || {};
    var firstName = request.firstName || "";
    var lastName = request.lastName || "";
    var email = request.email || "";
    var notes = request.notes || "";

    return '<button type="button" class="back-btn" data-action="go-step" data-step="2">' + svgIcon("i-arrow-left") + 'Change time</button>' +
      '<h1 class="sr-only">Your details for ' + esc(cls.name) + '</h1>' +
      '<section class="summary-card">' +
        '<div class="summary-top">' +
          '<img class="summary-thumb" src="' + esc(classPhoto(cls.name)) + '" alt="" width="96" height="96">' +
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
        '<div id="form-error-slot"></div>' +
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
        '<div class="form-note">' + svgIcon("i-mail") +
          '<span><strong>This is a booking request.</strong> The team will reply to confirm your place. No payment is taken in this app.</span>' +
        '</div>' +
        '<button class="btn btn-primary btn-block" type="submit">' + svgIcon("i-mail") + 'Send booking request</button>' +
        '<p class="form-footnote">Your place is confirmed when the team replies by email.</p>' +
      '</form>';
  }

  function step4HTML() {
    var cls = CLASS_BY_NAME[state.className];
    var slot = state.slot;
    var request = state.request || {};
    if (!cls || !slot) return step1HTML();
    return '<section class="success-wrap">' +
      '<div class="success-badge">' + svgIcon("i-check") + '</div>' +
      '<h1>Request sent!</h1>' +
      '<p class="success-lead">We’ve emailed your request to the Be Well Fit team. They’ll reply to <strong>' + esc(request.email || "your email") + '</strong> to confirm your place.</p>' +
      '<div class="success-summary" aria-label="Booking request summary">' +
        '<div class="success-row"><span>Class</span><span>' + esc(cls.name) + '</span></div>' +
        '<div class="success-row"><span>Day</span><span>' + esc(fmtDateFull(slot.date)) + '</span></div>' +
        '<div class="success-row"><span>Time</span><span>' + esc(fmtTime(slot.time)) + '</span></div>' +
        '<div class="success-row"><span>Studio</span><span>Studio ' + slot.studio + '</span></div>' +
      '</div>' +
      '<div class="success-next"><strong>What happens next</strong><br>Keep an eye on your inbox. If you don’t hear back within 24 hours, email <a href="mailto:' + esc(CFG.contactEmail) + '">' + esc(CFG.contactEmail) + '</a> so your request isn’t missed.</div>' +
      '<div class="success-actions">' +
        '<button type="button" class="btn btn-primary btn-block" data-action="book-again">Book another class</button>' +
        '<button type="button" class="btn btn-ghost btn-block" data-action="view-timetable">View timetable</button>' +
      '</div>' +
      '<p class="success-help">Requests are saved on this phone — find them on the Info tab. Your place isn’t confirmed until the team replies.</p>' +
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

  function fillInfo() {
    var email = CFG.contactEmail || "bewellfit@gmx.com";
    var emailEl = $("#info-email");
    if (emailEl) {
      emailEl.textContent = email;
      emailEl.href = "mailto:" + email;
    }
    var addressEl = $("#info-address");
    if (addressEl) addressEl.textContent = (CFG.address || "Clifton Rd, Hastings TN34 2AA").replace(/^Bewellfit,\s*/i, "");
    var mapsEl = $("#info-maps");
    if (mapsEl && CFG.mapsUrl) mapsEl.href = CFG.mapsUrl;
    ["#tt-updated", "#info-updated"].forEach(function (selector) {
      var el = $(selector);
      if (el) el.textContent = UPDATED;
    });
    var historyHolder = $("#info-history");
    if (historyHolder) historyHolder.innerHTML = historyHTML();
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
    if (state.step === 2) return state.className ? "Choose a session for " + state.className + "." : "Choose a session.";
    if (state.step === 3) return "Enter your details and send the booking request.";
    if (state.step === 4) return "Booking request sent. The team will reply by email to confirm.";
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
    if (state.submitting) {
      showToast("Sending your request…");
      return;
    }
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
    state.step = 2;
    renderBook({ scroll: true, focus: true });
    announce(stepAnnouncement());
  }

  function bookSession(day, time, studio) {
    if (!state.className) return;
    var slot = SLOTS.filter(function (item) {
      return item.name === state.className &&
        item.day === Number(day) &&
        item.time === time &&
        item.studio === Number(studio);
    })[0];
    if (!slot) return;
    var date = nextDateForSlot(slot);
    if (!date) {
      showToast("No upcoming date was found for that session.");
      return;
    }
    state.slot = {
      name: slot.name,
      day: slot.day,
      time: slot.time,
      studio: slot.studio,
      date: date,
      start: slotStart(date, slot.time)
    };
    state.step = 3;
    renderBook({ scroll: true, focus: true });
    announce(stepAnnouncement());
  }

  function resetBooking() {
    state.step = 1;
    state.className = null;
    state.slot = null;
    state.request = null;
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
    state.slot = {
      name: slot.name,
      day: slot.day,
      time: slot.time,
      studio: slot.studio,
      date: date,
      start: slotStart(date, slot.time)
    };
    state.step = 3;
    switchTab("book", { scroll: true, focus: true });
  }

  /* -----------------------------------------------------------------------
     Booking submit
     ----------------------------------------------------------------------- */
  function BookingError(code, message, fieldErrors) {
    this.name = "BookingError";
    this.code = code;
    this.message = message;
    this.fieldErrors = fieldErrors || null;
    if (Error.captureStackTrace) Error.captureStackTrace(this, BookingError);
  }
  BookingError.prototype = Object.create(Error.prototype);
  BookingError.prototype.constructor = BookingError;

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

  function mapCf7Errors(result) {
    var map = { "first-name": "firstName", "last-name": "lastName", "your-email": "email" };
    var out = {};
    (result.invalid_fields || []).forEach(function (field) {
      if (map[field.field]) out[map[field.field]] = stripTags(field.message) || "Please check this field.";
    });
    return Object.keys(out).length ? out : null;
  }

  function buildPayload(data) {
    if (!CFG.bookingEndpoint) throw new BookingError("config", "The booking service isn’t configured.");
    var when = fmtDateFull(state.slot.date) + " at " + fmtTime(state.slot.time) + " (Studio " + state.slot.studio + ")";
    var notes = [data.notes.trim(), "Sent from the Be Well Fit app.", "Reply to: " + data.email].filter(Boolean).join("\n\n");
    var formData = new FormData();
    formData.append("_wpcf7", CFG.bookingFormId || "503");
    formData.append("_wpcf7_version", CFG.bookingFormVersion || "6.2.4.1");
    formData.append("_wpcf7_locale", CFG.bookingLocale || "en_US");
    formData.append("_wpcf7_unit_tag", CFG.bookingUnitTag || "wpcf7-f503-p93-o1");
    formData.append("_wpcf7_container_post", CFG.bookingContainerPost || "93");
    formData.append("_wpcf7_posted_data_hash", "");
    formData.append("first-name", data.firstName);
    formData.append("last-name", data.lastName);
    formData.append("your-email", data.email);
    formData.append("class-booking", state.className);
    formData.append("class-time-date", when);
    formData.append("other-enquiries", notes);
    return formData;
  }

  function buildMailto(data) {
    var subject = "Class booking request – " + state.className + " – " + fmtDayShort(state.slot.date);
    var body = [
      "Hi Be Well Fit,",
      "",
      "I'd like to book " + state.className + " on " + fmtDateFull(state.slot.date) + " at " + fmtTime(state.slot.time) + ", Studio " + state.slot.studio + ".",
      "",
      "Name: " + data.firstName + " " + data.lastName,
      "Email: " + data.email,
      data.notes.trim() ? "Notes: " + data.notes.trim() : "",
      "",
      "Please reply to confirm my place.",
      "",
      "Sent from the Be Well Fit app."
    ].filter(function (line) { return line !== ""; }).join("\n");
    return "mailto:" + (CFG.contactEmail || "bewellfit@gmx.com") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  function showFormError(form, error, data) {
    var slot = $("#form-error-slot", form);
    if (!slot) return;
    var title = error.code === "offline" ? "You’re offline" : error.code === "timeout" ? "Request timed out" : "Request not sent";
    var mailto = "";
    try { mailto = buildMailto(data); } catch (err) { mailto = "mailto:" + (CFG.contactEmail || "bewellfit@gmx.com"); }
    slot.innerHTML = '<div class="form-error" role="alert">' +
      svgIcon("i-alert") +
      '<div>' +
        '<strong>' + esc(title) + '</strong>' +
        '<p>' + esc(error.message) + '</p>' +
        '<p class="form-error-actions">You can <a href="' + esc(mailto) + '">email the team instead</a> — your details will be filled in for you.</p>' +
      '</div>' +
    '</div>';
    var panel = $(".form-error", slot);
    if (panel) {
      try { panel.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" }); } catch (err) { /* old Safari */ }
    }
  }

  function setSubmitting(form, submitting) {
    var button = $('button[type="submit"]', form);
    if (!button) return;
    if (submitting) {
      button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span class="spinner" aria-hidden="true"></span> Sending request…';
      form.setAttribute("aria-busy", "true");
    } else {
      button.disabled = false;
      if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
      form.removeAttribute("aria-busy");
    }
  }

  function onBookingSent(data) {
    state.submitting = false;
    state.request = data;
    saveHistory();
    state.step = 4;
    switchTab("book", { scroll: true, focus: true });
    announce(stepAnnouncement());
  }

  async function submitBooking(form) {
    if (state.submitting) return;
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

    state.submitting = true;
    setSubmitting(form, true);
    var errorSlot = $("#form-error-slot", form);
    if (errorSlot) errorSlot.innerHTML = "";
    var timer = null;

    try {
      if (!navigator.onLine) {
        throw new BookingError("offline", "You’re offline, so your request hasn’t been sent. Reconnect and try again, or email the team.");
      }
      var controller = new AbortController();
      timer = window.setTimeout(function () { controller.abort(); }, 20000);
      var response = await fetch(CFG.bookingEndpoint, {
        method: "POST",
        body: buildPayload(data),
        headers: { Accept: "application/json" },
        signal: controller.signal
      });

      var result = null;
      try { result = await response.json(); } catch (err) { result = null; }

      if (result && result.status === "mail_sent") {
        onBookingSent(data);
        return;
      }
      if (result && result.status === "validation_failed") {
        throw new BookingError("validation", "Some details weren’t accepted. Check the highlighted fields and try again.", mapCf7Errors(result));
      }
      if (result && result.status === "spam") {
        throw new BookingError("spam", "The booking service flagged this request. Please email the team directly so your request isn’t missed.");
      }
      if (result && result.status === "mail_failed") {
        throw new BookingError("mail", "The booking email couldn’t be sent. Please email the team directly so your request isn’t missed.");
      }
      if (!response.ok) {
        throw new BookingError("http", "The booking service returned an error (" + response.status + "). Please email the team directly.");
      }
      if (result && result.message) {
        throw new BookingError("unknown", stripTags(result.message));
      }
      throw new BookingError("unknown", "The booking service didn’t confirm the request. Please try again or email the team.");
    } catch (err) {
      if (err && err.name === "AbortError") {
        err = new BookingError("timeout", "The booking service took too long to respond. Please try again or email the team.");
      }
      var error = err instanceof BookingError ? err : new BookingError("network", "We couldn’t reach the booking service. Check your connection and try again, or email the team.");
      state.submitting = false;
      if (form.isConnected) {
        setSubmitting(form, false);
        if (error.fieldErrors) applyFieldErrors(error.fieldErrors);
        showFormError(form, error, data);
        announce(error.code === "validation" ? "Please check the highlighted fields." : "The request wasn’t sent. " + error.message);
      }
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }

  /* -----------------------------------------------------------------------
     Events
     ----------------------------------------------------------------------- */
  function onBookClick(event) {
    var target = event.target instanceof Element ? event.target : null;
    var button = target ? target.closest("[data-action]") : null;
    if (!button || !els.bookFlow || !els.bookFlow.contains(button)) return;
    var action = button.dataset.action;

    if (action === "choose-class") {
      chooseClass(button.dataset.class);
    } else if (action === "go-step") {
      goToStep(button.dataset.step);
    } else if (action === "book-session") {
      bookSession(button.dataset.day, button.dataset.time, button.dataset.studio);
    } else if (action === "book-again") {
      resetBooking();
    } else if (action === "view-timetable") {
      switchTab("timetable", { scroll: true, focus: true });
    }
  }

  function onBookInput(event) {
    var input = event.target;
    if (!input || !input.matches) return;
    if (state.step === 3 && input.name && ["firstName", "lastName", "email", "notes"].indexOf(input.name) !== -1) {
      state.request = Object.assign({}, state.request || {}, { [input.name]: input.value });
      if (input.closest(".field.has-error")) clearFieldError(input);
      var errorSlot = $("#form-error-slot", els.bookFlow);
      if (errorSlot) errorSlot.innerHTML = "";
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

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    var local = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (window.location.protocol !== "https:" && !local) return;
    var register = function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
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
      els.bookFlow.addEventListener("error", function (event) {
        var img = event.target;
        if (img && img.tagName === "IMG" && img.getAttribute("src") !== PLACEHOLDER_IMAGE) {
          img.src = PLACEHOLDER_IMAGE;
        }
      }, true);
    }
    if (els.ttDays) {
      els.ttDays.addEventListener("click", onDayTabClick);
      els.ttDays.addEventListener("keydown", onDayTabsKeydown);
    }
    if (els.ttContent) els.ttContent.addEventListener("click", onTimetableClick);
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
