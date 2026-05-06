/**
 * Travel Buddy — vanilla JS, localStorage key: travelBuddyTrips
 */

const STORAGE_KEY = "travelBuddyTrips";

const LEGACY_DEMO_TRIP_IDS = new Set([
  "sample-tokyo",
  "sample-swiss",
  "sample-paris",
]);

const CATEGORY_LABELS = {
  vacation: "Vacation",
  business: "Business",
  adventure: "Adventure",
  family: "Family",
  solo: "Solo",
};

const COVER_IMAGES = [
  { label: "Paris Eiffel Tower", url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80" },
  { label: "Mountain Lake", url: "https://images.unsplash.com/photo-1464822759483-ebe686396376?w=1200&q=80" },
  { label: "Tokyo Japan", url: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80" },
  { label: "Tropical Beach", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80" },
  { label: "Paris Architecture", url: "https://images.unsplash.com/photo-1431274172761-fca4d574c321?w=1200&q=80" },
  { label: "Tropical Resort", url: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&q=80" },
  { label: "Santorini Greece", url: "https://images.unsplash.com/photo-1613395877344-13d4c79d428d?w=1200&q=80" },
  { label: "Luxury Pool", url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80" },
  { label: "Safari", url: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80" },
  { label: "Italy Coast", url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80" },
  { label: "Northern Lights", url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=80" },
  { label: "Maldives Beach", url: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200&q=80" },
  { label: "Bali Temple", url: "https://images.unsplash.com/photo-1537996194471-e657375e3ca4?w=1200&q=80" },
  { label: "New York City", url: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=80" },
  { label: "Beach Hammock", url: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&q=80" },
  { label: "Mountain Landscape", url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80" },
];

function thumb(url) {
  return url.replace("w=1200", "w=400");
}

function generateId() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tripStatus(trip) {
  const t = todayYmd();
  if (trip.startDate > t) return "upcoming";
  if (trip.endDate < t) return "past";
  return "ongoing";
}

function eachDateInRange(startYmd, endYmd) {
  const out = [];
  const cur = new Date(`${startYmd}T12:00:00`);
  const end = new Date(`${endYmd}T12:00:00`);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const day = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function generateEmptyDays(startDate, endDate) {
  return eachDateInRange(startDate, endDate).map((date) => ({
    date,
    activities: [],
  }));
}

function mergeDaysForNewRange(oldDays, newStart, newEnd) {
  const dates = eachDateInRange(newStart, newEnd);
  const byDate = {};
  (oldDays || []).forEach((d) => {
    byDate[d.date] = Array.isArray(d.activities)
      ? d.activities.map((a) => ({ ...a }))
      : [];
  });
  return dates.map((date) => ({
    date,
    activities: byDate[date] ? byDate[date].map((a) => ({ ...a })) : [],
  }));
}

function coverIndexFromUrl(url) {
  const i = COVER_IMAGES.findIndex((c) => c.url === url);
  return i >= 0 ? i : 0;
}

function ensureTripShape(trip) {
  let changed = false;
  if (!trip || typeof trip !== "object") return false;
  if (!trip.category || !CATEGORY_LABELS[trip.category]) {
    trip.category = "vacation";
    changed = true;
  }
  if (!trip.createdAt) {
    trip.createdAt = new Date().toISOString();
    changed = true;
  }
  if (!Array.isArray(trip.days)) {
    trip.days = [];
    changed = true;
  }
  trip.days.forEach((day) => {
    if (!Array.isArray(day.activities)) {
      day.activities = [];
      changed = true;
    }
    day.activities.forEach((a) => {
      if (a.completed === undefined) {
        a.completed = false;
        changed = true;
      }
      if (!a.id) {
        a.id = generateId();
        changed = true;
      }
    });
  });
  return changed;
}

function countActivities(trip) {
  let total = 0;
  let done = 0;
  (trip.days || []).forEach((day) => {
    (day.activities || []).forEach((a) => {
      total += 1;
      if (a.completed) done += 1;
    });
  });
  return { total, done };
}

function tripProgressPercent(trip) {
  const { total, done } = countActivities(trip);
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

function dayFullyComplete(day) {
  const acts = day.activities || [];
  if (acts.length === 0) return false;
  return acts.every((a) => a.completed);
}

function formatRange(startYmd, endYmd) {
  const s = new Date(`${startYmd}T12:00:00`);
  const e = new Date(`${endYmd}T12:00:00`);
  const opts = { month: "short", day: "numeric", year: "numeric" };
  const a = s.toLocaleDateString("en-US", opts);
  const b = e.toLocaleDateString("en-US", opts);
  const days =
    Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return { label: `${a} – ${b}`, days };
}

function tripDurationDays(trip) {
  return formatRange(trip.startDate, trip.endDate).days;
}

function formatDayHeader(ymdStr) {
  const d = new Date(`${ymdStr}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let trips = [];
let currentTripId = null;
let searchQuery = "";
let activeFilter = "all";
let activeCategoryFilter = "all";
let sortBy = "created";
let selectedCoverIndex = 0;

const els = {
  viewDashboard: document.getElementById("view-dashboard"),
  viewDetail: document.getElementById("view-detail"),
  tripGrid: document.getElementById("trip-grid"),
  emptyState: document.getElementById("empty-state"),
  dashboardControls: document.getElementById("dashboard-controls"),
  searchInput: document.getElementById("search-trips"),
  sortTrips: document.getElementById("sort-trips"),
  filterTabs: document.querySelectorAll(".filter-tabs[aria-label='Filter by trip status'] .filter-tab"),
  categoryTabs: document.querySelectorAll("#category-tabs .cat-tab"),
  btnNewTrip: document.getElementById("btn-new-trip"),
  btnBack: document.getElementById("btn-back"),
  brandLink: document.getElementById("brand-link"),
  headerTripTitle: document.getElementById("header-trip-title"),
  btnEmptyCreate: document.getElementById("btn-empty-create"),
  modalBackdrop: document.getElementById("modal-backdrop"),
  modal: document.getElementById("modal-new-trip"),
  modalClose: document.getElementById("modal-close"),
  formNewTrip: document.getElementById("form-new-trip"),
  btnCancelTrip: document.getElementById("btn-cancel-trip"),
  btnSubmitTrip: document.getElementById("btn-submit-trip"),
  modalTitle: document.getElementById("modal-title"),
  fEditId: document.getElementById("f-edit-id"),
  coverGrid: document.getElementById("cover-grid"),
  formError: document.getElementById("form-error"),
  fTitle: document.getElementById("f-title"),
  fDestination: document.getElementById("f-destination"),
  fStart: document.getElementById("f-start"),
  fEnd: document.getElementById("f-end"),
  fCategory: document.getElementById("f-category"),
  fDesc: document.getElementById("f-desc"),
  detailHeroImg: document.getElementById("detail-hero-img"),
  detailHeroBadge: document.getElementById("detail-hero-badge"),
  detailHeroTitle: document.getElementById("detail-hero-title"),
  detailHeroMeta: document.getElementById("detail-hero-meta"),
  detailProgressPct: document.getElementById("detail-progress-pct"),
  detailProgressFill: document.getElementById("detail-progress-fill"),
  detailTimeline: document.getElementById("detail-timeline"),
  btnDeleteTrip: document.getElementById("btn-delete-trip"),
  btnEditTrip: document.getElementById("btn-edit-trip"),
  btnDuplicateTrip: document.getElementById("btn-duplicate-trip"),
  modalActivity: document.getElementById("modal-activity"),
  modalActivityClose: document.getElementById("modal-activity-close"),
  formActivity: document.getElementById("form-activity"),
  formActivityError: document.getElementById("form-activity-error"),
  btnActivityCancel: document.getElementById("btn-activity-cancel"),
  aTripId: document.getElementById("a-trip-id"),
  aDayDate: document.getElementById("a-day-date"),
  aActivityId: document.getElementById("a-activity-id"),
  aTitle: document.getElementById("a-title"),
  aTime: document.getElementById("a-time"),
  aLocation: document.getElementById("a-location"),
  activityModalTitle: document.getElementById("activity-modal-title"),
};

function syncBackdrop() {
  const tripOpen = !els.modal.classList.contains("hidden");
  const actOpen = !els.modalActivity.classList.contains("hidden");
  const open = tripOpen || actOpen;
  els.modalBackdrop.classList.toggle("hidden", !open);
  els.modalBackdrop.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.style.overflow = open ? "hidden" : "";
}

function loadTrips() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      trips = [];
      return;
    }
    const parsed = JSON.parse(raw);
    trips = Array.isArray(parsed) ? parsed : [];
    const withoutDemo = trips.filter((t) => t && !LEGACY_DEMO_TRIP_IDS.has(t.id));
    if (withoutDemo.length !== trips.length) {
      trips = withoutDemo;
    }
    let normChanged = false;
    trips.forEach((t) => {
      if (ensureTripShape(t)) normChanged = true;
    });
    const parsedLen = Array.isArray(parsed) ? parsed.length : 0;
    if (normChanged || withoutDemo.length !== parsedLen) {
      saveTrips();
    }
  } catch {
    trips = [];
  }
}

function saveTrips() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

function getTripById(id) {
  return trips.find((t) => t.id === id) || null;
}

function filteredTripsBase() {
  const q = searchQuery.trim().toLowerCase();
  return trips.filter((trip) => {
    const matchSearch =
      !q ||
      trip.title.toLowerCase().includes(q) ||
      trip.destination.toLowerCase().includes(q);
    if (!matchSearch) return false;
    const st = tripStatus(trip);
    if (activeFilter !== "all" && st !== activeFilter) return false;
    if (activeCategoryFilter !== "all" && trip.category !== activeCategoryFilter) return false;
    return true;
  });
}

function sortTripsList(arr) {
  const out = [...arr];
  switch (sortBy) {
    case "start":
      out.sort((a, b) => a.startDate.localeCompare(b.startDate));
      break;
    case "alpha":
      out.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
      break;
    case "duration":
      out.sort((a, b) => tripDurationDays(b) - tripDurationDays(a));
      break;
    case "created":
    default:
      out.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      break;
  }
  return out;
}

function pinSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>`;
}

function calendarSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5"/></svg>`;
}

function clockSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>`;
}

function pencilCardSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>`;
}

function gripSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg>`;
}

function trashSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>`;
}

function renderTripGrid() {
  if (els.dashboardControls) {
    if (trips.length === 0) {
      els.dashboardControls.classList.add("hidden");
      els.searchInput.value = "";
      searchQuery = "";
    } else {
      els.dashboardControls.classList.remove("hidden");
    }
  }

  const list = sortTripsList(filteredTripsBase());
  els.tripGrid.innerHTML = "";

  if (list.length === 0) {
    els.emptyState.classList.remove("hidden");
    els.tripGrid.classList.add("hidden");
    const title = els.emptyState.querySelector(".empty-title");
    const text = els.emptyState.querySelector(".empty-text");
    if (trips.length === 0) {
      els.emptyState.classList.add("empty-state--welcome-only");
      title.textContent = "";
      text.textContent = "";
      els.btnEmptyCreate.textContent = "Add a trip";
    } else {
      els.emptyState.classList.remove("empty-state--welcome-only");
      title.textContent = "No trips in this view";
      text.textContent = "Adjust your search, filters, or sort.";
      els.btnEmptyCreate.textContent = "Add a trip";
    }
    return;
  }

  els.emptyState.classList.remove("empty-state--welcome-only");
  els.emptyState.classList.add("hidden");
  els.tripGrid.classList.remove("hidden");

  list.forEach((trip) => {
    const st = tripStatus(trip);
    const pct = tripProgressPercent(trip);
    const range = formatRange(trip.startDate, trip.endDate);
    const cat = trip.category || "vacation";
    const catLabel = CATEGORY_LABELS[cat] || cat;

    const shell = document.createElement("div");
    shell.className = "trip-card-shell";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "trip-card";
    openBtn.setAttribute("data-trip-id", trip.id);
    openBtn.setAttribute("aria-label", `Open ${trip.title}`);
    openBtn.innerHTML = `
      <div class="trip-card-media">
        <img src="${escapeHtml(thumb(trip.image))}" alt="" loading="lazy" width="400" height="250" />
        <span class="status-badge ${st}">${st}</span>
      </div>
      <div class="trip-card-body">
        <span class="trip-cat-chip">${escapeHtml(catLabel)}</span>
        <h3 class="trip-card-title">${escapeHtml(trip.title)}</h3>
        <div class="meta-row">${pinSvg()}<span>${escapeHtml(trip.destination)}</span></div>
        <div class="meta-row">${calendarSvg()}<span>${escapeHtml(range.label)} · ${range.days} days</span></div>
        <div class="card-progress">
          <div class="card-progress-head"><span>Progress</span><span>${pct}%</span></div>
          <div class="card-progress-bar"><div class="card-progress-fill" style="width:${pct}%"></div></div>
        </div>
      </div>
    `;
    openBtn.addEventListener("click", () => openTripDetail(trip.id));

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "trip-card-edit-btn";
    editBtn.setAttribute("aria-label", `Edit ${trip.title}`);
    editBtn.innerHTML = pencilCardSvg();
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditTripModal(trip.id);
    });

    shell.append(openBtn, editBtn);
    els.tripGrid.appendChild(shell);
  });
}

function setHeaderMode(detail) {
  if (detail) {
    const trip = getTripById(currentTripId);
    els.brandLink.classList.add("hidden");
    els.btnBack.classList.remove("hidden");
    els.headerTripTitle.classList.remove("hidden");
    els.headerTripTitle.textContent = trip ? trip.title : "";
    els.btnNewTrip.classList.add("hidden");
  } else {
    els.brandLink.classList.remove("hidden");
    els.btnBack.classList.add("hidden");
    els.headerTripTitle.classList.add("hidden");
    els.headerTripTitle.textContent = "";
    els.btnNewTrip.classList.remove("hidden");
  }
}

function showDashboard() {
  currentTripId = null;
  els.viewDashboard.classList.remove("hidden");
  els.viewDetail.classList.add("hidden");
  setHeaderMode(false);
  renderTripGrid();
}

function openTripDetail(id) {
  const trip = getTripById(id);
  if (!trip) return;
  currentTripId = id;
  els.viewDashboard.classList.add("hidden");
  els.viewDetail.classList.remove("hidden");
  setHeaderMode(true);
  renderTripDetail();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

let dragActivity = null;

function reorderActivityRelative(tripId, dayDate, draggedId, targetId) {
  const trip = getTripById(tripId);
  if (!trip) return;
  const day = (trip.days || []).find((d) => d.date === dayDate);
  if (!day || !Array.isArray(day.activities)) return;
  const acts = day.activities;
  const fromI = acts.findIndex((a) => a.id === draggedId);
  if (fromI < 0) return;
  const [item] = acts.splice(fromI, 1);
  if (targetId === "__end__") {
    acts.push(item);
  } else {
    const toI = acts.findIndex((a) => a.id === targetId);
    if (toI < 0) acts.push(item);
    else acts.splice(toI, 0, item);
  }
  saveTrips();
  renderTripDetail();
  renderTripGrid();
}

function bindActivityDragRow(row, tripId, dayDate) {
  const handle = row.querySelector(".activity-drag");
  if (!handle) return;

  handle.addEventListener("dragstart", (e) => {
    dragActivity = { tripId, dayDate, activityId: row.dataset.activityId };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", row.dataset.activityId);
    row.classList.add("activity-item--dragging");
  });

  handle.addEventListener("dragend", () => {
    row.classList.remove("activity-item--dragging");
    document.querySelectorAll(".activity-item--drag-over").forEach((el) => {
      el.classList.remove("activity-item--drag-over");
    });
    dragActivity = null;
  });

  row.addEventListener("dragover", (e) => {
    if (!dragActivity || dragActivity.tripId !== tripId || dragActivity.dayDate !== dayDate) return;
    if (dragActivity.activityId === row.dataset.activityId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    row.classList.add("activity-item--drag-over");
  });

  row.addEventListener("dragleave", () => {
    row.classList.remove("activity-item--drag-over");
  });

  row.addEventListener("drop", (e) => {
    e.preventDefault();
    row.classList.remove("activity-item--drag-over");
    if (!dragActivity) return;
    if (dragActivity.activityId === row.dataset.activityId) return;
    reorderActivityRelative(tripId, dayDate, dragActivity.activityId, row.dataset.activityId);
  });
}

function bindActivityListTail(tail, tripId, dayDate) {
  tail.addEventListener("dragover", (e) => {
    if (!dragActivity || dragActivity.tripId !== tripId || dragActivity.dayDate !== dayDate) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    tail.classList.add("activity-list-tail--active");
  });
  tail.addEventListener("dragleave", () => tail.classList.remove("activity-list-tail--active"));
  tail.addEventListener("drop", (e) => {
    e.preventDefault();
    tail.classList.remove("activity-list-tail--active");
    if (!dragActivity) return;
    reorderActivityRelative(tripId, dayDate, dragActivity.activityId, "__end__");
  });
}

function renderTripDetail() {
  const trip = getTripById(currentTripId);
  if (!trip) {
    showDashboard();
    return;
  }

  els.detailHeroImg.src = trip.image;
  els.detailHeroImg.alt = trip.title;
  const st = tripStatus(trip);
  els.detailHeroBadge.textContent = st;
  els.detailHeroBadge.className = `status-badge detail-hero-badge ${st}`;
  els.detailHeroTitle.textContent = trip.title;
  const range = formatRange(trip.startDate, trip.endDate);
  const catLabel = CATEGORY_LABELS[trip.category] || trip.category;
  els.detailHeroMeta.textContent = `${range.label} | ${range.days} days · ${catLabel}`;

  const pct = tripProgressPercent(trip);
  els.detailProgressPct.textContent = `${pct}%`;
  els.detailProgressFill.style.width = `${pct}%`;

  els.headerTripTitle.textContent = trip.title;

  const days = trip.days || [];
  els.detailTimeline.innerHTML = "";

  days.forEach((day, idx) => {
    const dayEl = document.createElement("div");
    dayEl.className = "timeline-day";
    dayEl.dataset.dayDate = day.date;

    const markerClass = dayFullyComplete(day) ? "day-marker completed" : "day-marker";
    const acts = day.activities || [];

    const listWrap = document.createElement("div");
    listWrap.className = "activity-list";
    listWrap.dataset.tripId = trip.id;
    listWrap.dataset.dayDate = day.date;

    if (acts.length === 0) {
      const empty = document.createElement("p");
      empty.className = "day-empty";
      empty.textContent = "No activities planned for this day.";
      listWrap.appendChild(empty);
    } else {
      acts.forEach((a) => {
        const row = document.createElement("div");
        row.className = `activity-item${a.completed ? " completed" : ""}`;
        row.dataset.activityId = a.id;

        const drag = document.createElement("span");
        drag.className = "activity-drag";
        drag.setAttribute("draggable", "true");
        drag.setAttribute("aria-label", "Drag to reorder");
        drag.innerHTML = gripSvg();

        const label = document.createElement("label");
        label.className = "activity-check";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.tripId = trip.id;
        cb.dataset.dayDate = day.date;
        cb.dataset.activityId = a.id;
        cb.checked = !!a.completed;
        cb.setAttribute("aria-label", `Mark complete: ${a.title}`);
        const vis = document.createElement("span");
        vis.className = "cb-visual";
        vis.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>';
        label.append(cb, vis);

        const body = document.createElement("div");
        body.className = "activity-body";
        body.setAttribute("role", "button");
        body.tabIndex = 0;
        body.dataset.tripId = trip.id;
        body.dataset.dayDate = day.date;
        body.dataset.activityId = a.id;
        body.innerHTML = `
          <p class="activity-title">${escapeHtml(a.title)}</p>
          <div class="activity-meta">
            <span>${clockSvg()}${escapeHtml(a.time || "")}</span>
            <span>${pinSvg()}${escapeHtml(a.location || "")}</span>
          </div>
        `;

        const del = document.createElement("button");
        del.type = "button";
        del.className = "activity-delete";
        del.setAttribute("aria-label", `Delete ${a.title}`);
        del.dataset.tripId = trip.id;
        del.dataset.dayDate = day.date;
        del.dataset.activityId = a.id;
        del.innerHTML = trashSvg();

        row.append(drag, label, body, del);
        listWrap.appendChild(row);

        cb.addEventListener("change", onActivityToggle);

        body.addEventListener("click", () => {
          openEditActivityModal(trip.id, day.date, a.id);
        });
        body.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            openEditActivityModal(trip.id, day.date, a.id);
          }
        });

        del.addEventListener("click", (ev) => {
          ev.stopPropagation();
          deleteActivity(trip.id, day.date, a.id);
        });

        bindActivityDragRow(row, trip.id, day.date);
      });

      const tail = document.createElement("div");
      tail.className = "activity-list-tail";
      tail.setAttribute("aria-hidden", "true");
      listWrap.appendChild(tail);
      bindActivityListTail(tail, trip.id, day.date);
    }

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "day-add-btn";
    addBtn.textContent = "+ Add activity";
    addBtn.addEventListener("click", () => openAddActivityModal(trip.id, day.date));

    dayEl.innerHTML = `
      <div class="${markerClass}">${idx + 1}</div>
      <h4 class="day-header">${escapeHtml(formatDayHeader(day.date))}</h4>
    `;
    dayEl.appendChild(listWrap);
    dayEl.appendChild(addBtn);
    els.detailTimeline.appendChild(dayEl);
  });
}

function onActivityToggle(e) {
  const input = e.target;
  const tripId = input.getAttribute("data-trip-id");
  const dayDate = input.getAttribute("data-day-date");
  const activityId = input.getAttribute("data-activity-id");
  const trip = getTripById(tripId);
  if (!trip) return;

  const day = (trip.days || []).find((d) => d.date === dayDate);
  if (!day) return;
  const act = (day.activities || []).find((a) => a.id === activityId);
  if (!act) return;

  act.completed = input.checked;
  saveTrips();

  const row = input.closest(".activity-item");
  if (row) {
    row.classList.toggle("completed", input.checked);
  }

  const pct = tripProgressPercent(trip);
  els.detailProgressPct.textContent = `${pct}%`;
  els.detailProgressFill.style.width = `${pct}%`;

  renderTripGrid();

  const dayBlock = input.closest(".timeline-day");
  if (dayBlock) {
    const marker = dayBlock.querySelector(".day-marker");
    const d = (trip.days || []).find((x) => x.date === dayDate);
    if (marker && d) {
      marker.classList.toggle("completed", dayFullyComplete(d));
    }
  }
}

function renderCoverGrid() {
  els.coverGrid.innerHTML = "";
  COVER_IMAGES.forEach((img, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `cover-option${i === selectedCoverIndex ? " selected" : ""}`;
    b.setAttribute("aria-label", img.label);
    b.setAttribute("aria-pressed", i === selectedCoverIndex ? "true" : "false");
    const im = document.createElement("img");
    im.src = thumb(img.url);
    im.alt = "";
    b.appendChild(im);
    b.addEventListener("click", () => {
      selectedCoverIndex = i;
      els.coverGrid.querySelectorAll(".cover-option").forEach((el, j) => {
        el.classList.toggle("selected", j === i);
        el.setAttribute("aria-pressed", j === i ? "true" : "false");
      });
    });
    els.coverGrid.appendChild(b);
  });
}

function openCreateTripModal() {
  els.fEditId.value = "";
  els.formNewTrip.reset();
  els.formError.classList.add("hidden");
  els.formError.textContent = "";
  els.modalTitle.textContent = "Plan a New Trip";
  els.btnSubmitTrip.textContent = "Create Trip";
  selectedCoverIndex = 0;
  els.modal.classList.remove("hidden");
  renderCoverGrid();
  syncBackdrop();
  els.fTitle.focus();
}

function openEditTripModal(tripId) {
  const trip = getTripById(tripId);
  if (!trip) return;
  ensureTripShape(trip);
  els.fEditId.value = trip.id;
  els.fTitle.value = trip.title;
  els.fDestination.value = trip.destination;
  els.fStart.value = trip.startDate;
  els.fEnd.value = trip.endDate;
  els.fCategory.value = trip.category || "vacation";
  els.fDesc.value = trip.description || "";
  selectedCoverIndex = coverIndexFromUrl(trip.image);
  els.formError.classList.add("hidden");
  els.formError.textContent = "";
  els.modalTitle.textContent = "Edit Trip";
  els.btnSubmitTrip.textContent = "Save changes";
  els.modal.classList.remove("hidden");
  renderCoverGrid();
  syncBackdrop();
  els.fTitle.focus();
}

function closeTripModal() {
  els.modal.classList.add("hidden");
  els.formNewTrip.reset();
  els.fEditId.value = "";
  syncBackdrop();
}

function handleTripFormSubmit(e) {
  e.preventDefault();
  els.formError.classList.add("hidden");
  const title = els.fTitle.value.trim();
  const destination = els.fDestination.value.trim();
  const start = els.fStart.value;
  const end = els.fEnd.value;
  const description = els.fDesc.value.trim();
  const category = els.fCategory.value;

  if (!title || !destination || !start || !end) {
    els.formError.textContent = "Please fill in all required fields.";
    els.formError.classList.remove("hidden");
    return;
  }
  if (end < start) {
    els.formError.textContent = "End date must be on or after the start date.";
    els.formError.classList.remove("hidden");
    return;
  }

  const image = COVER_IMAGES[selectedCoverIndex].url;
  const editId = els.fEditId.value.trim();

  if (editId) {
    const trip = getTripById(editId);
    if (!trip) return;
    trip.title = title;
    trip.destination = destination;
    trip.description = description;
    trip.image = image;
    trip.category = category;
    if (trip.startDate !== start || trip.endDate !== end) {
      trip.days = mergeDaysForNewRange(trip.days, start, end);
      trip.startDate = start;
      trip.endDate = end;
    }
    saveTrips();
    closeTripModal();
    if (currentTripId === editId) renderTripDetail();
    renderTripGrid();
    return;
  }

  const newTrip = {
    id: generateId(),
    title,
    destination,
    startDate: start,
    endDate: end,
    description,
    image,
    category,
    createdAt: new Date().toISOString(),
    days: generateEmptyDays(start, end),
  };

  trips.unshift(newTrip);
  saveTrips();
  closeTripModal();
  renderTripGrid();
}

function duplicateTripById(tripId) {
  const t = getTripById(tripId);
  if (!t) return;
  const copy = JSON.parse(JSON.stringify(t));
  copy.id = generateId();
  copy.title = `Copy of ${t.title}`;
  copy.createdAt = new Date().toISOString();
  (copy.days || []).forEach((d) => {
    (d.activities || []).forEach((a) => {
      a.id = generateId();
    });
  });
  trips.unshift(copy);
  saveTrips();
  renderTripGrid();
}

function deleteCurrentTrip() {
  const trip = getTripById(currentTripId);
  if (!trip) return;
  const ok = window.confirm(`Delete “${trip.title}”? This cannot be undone.`);
  if (!ok) return;
  trips = trips.filter((t) => t.id !== currentTripId);
  saveTrips();
  showDashboard();
}

function openAddActivityModal(tripId, dayDate) {
  els.formActivity.reset();
  els.formActivityError.classList.add("hidden");
  els.aTripId.value = tripId;
  els.aDayDate.value = dayDate;
  els.aActivityId.value = "";
  els.activityModalTitle.textContent = "Add activity";
  els.modalActivity.classList.remove("hidden");
  syncBackdrop();
  els.aTitle.focus();
}

function openEditActivityModal(tripId, dayDate, activityId) {
  const trip = getTripById(tripId);
  const day = trip && (trip.days || []).find((d) => d.date === dayDate);
  const act = day && (day.activities || []).find((a) => a.id === activityId);
  if (!act) return;
  els.formActivityError.classList.add("hidden");
  els.aTripId.value = tripId;
  els.aDayDate.value = dayDate;
  els.aActivityId.value = activityId;
  els.aTitle.value = act.title;
  els.aTime.value = act.time || "";
  els.aLocation.value = act.location || "";
  els.activityModalTitle.textContent = "Edit activity";
  els.modalActivity.classList.remove("hidden");
  syncBackdrop();
  els.aTitle.focus();
}

function closeActivityModal() {
  els.modalActivity.classList.add("hidden");
  els.formActivity.reset();
  syncBackdrop();
}

function handleActivityFormSubmit(e) {
  e.preventDefault();
  els.formActivityError.classList.add("hidden");
  const tripId = els.aTripId.value;
  const dayDate = els.aDayDate.value;
  const activityId = els.aActivityId.value.trim();
  const title = els.aTitle.value.trim();
  const time = els.aTime.value.trim();
  const location = els.aLocation.value.trim();

  if (!title || !time || !location) {
    els.formActivityError.textContent = "Please fill in all fields.";
    els.formActivityError.classList.remove("hidden");
    return;
  }

  const trip = getTripById(tripId);
  if (!trip) return;
  const day = (trip.days || []).find((d) => d.date === dayDate);
  if (!day) return;

  if (activityId) {
    const act = (day.activities || []).find((a) => a.id === activityId);
    if (act) {
      act.title = title;
      act.time = time;
      act.location = location;
    }
  } else {
    if (!Array.isArray(day.activities)) day.activities = [];
    day.activities.push({
      id: generateId(),
      title,
      time,
      location,
      completed: false,
    });
  }

  saveTrips();
  closeActivityModal();
  renderTripDetail();
  renderTripGrid();
}

function deleteActivity(tripId, dayDate, activityId) {
  const trip = getTripById(tripId);
  if (!trip) return;
  const day = (trip.days || []).find((d) => d.date === dayDate);
  if (!day || !Array.isArray(day.activities)) return;
  const act = day.activities.find((a) => a.id === activityId);
  if (!act) return;
  const ok = window.confirm(`Remove “${act.title}” from this day?`);
  if (!ok) return;
  day.activities = day.activities.filter((a) => a.id !== activityId);
  saveTrips();
  renderTripDetail();
  renderTripGrid();
}

function bindEvents() {
  els.searchInput.addEventListener("input", () => {
    searchQuery = els.searchInput.value;
    renderTripGrid();
  });

  if (els.sortTrips) {
    els.sortTrips.value = sortBy;
    els.sortTrips.addEventListener("change", () => {
      sortBy = els.sortTrips.value;
      renderTripGrid();
    });
  }

  els.filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeFilter = tab.getAttribute("data-filter") || "all";
      els.filterTabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      renderTripGrid();
    });
  });

  els.categoryTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeCategoryFilter = tab.getAttribute("data-category") || "all";
      els.categoryTabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      renderTripGrid();
    });
  });

  els.btnNewTrip.addEventListener("click", openCreateTripModal);
  els.btnEmptyCreate.addEventListener("click", openCreateTripModal);
  els.modalClose.addEventListener("click", closeTripModal);
  els.btnCancelTrip.addEventListener("click", closeTripModal);
  els.modalBackdrop.addEventListener("click", () => {
    closeTripModal();
    closeActivityModal();
  });
  els.modal.addEventListener("click", (e) => {
    if (e.target === els.modal) closeTripModal();
  });
  els.formNewTrip.addEventListener("submit", handleTripFormSubmit);

  els.modalActivityClose.addEventListener("click", closeActivityModal);
  els.btnActivityCancel.addEventListener("click", closeActivityModal);
  els.modalActivity.addEventListener("click", (e) => {
    if (e.target === els.modalActivity) closeActivityModal();
  });
  els.formActivity.addEventListener("submit", handleActivityFormSubmit);

  els.btnEditTrip.addEventListener("click", () => {
    if (currentTripId) openEditTripModal(currentTripId);
  });
  els.btnDuplicateTrip.addEventListener("click", () => {
    if (currentTripId) duplicateTripById(currentTripId);
  });

  els.btnBack.addEventListener("click", (ev) => {
    ev.preventDefault();
    showDashboard();
  });

  els.brandLink.addEventListener("click", (ev) => {
    if (!els.viewDetail.classList.contains("hidden")) {
      ev.preventDefault();
      showDashboard();
    }
  });

  els.btnDeleteTrip.addEventListener("click", deleteCurrentTrip);

  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    if (!els.modalActivity.classList.contains("hidden")) {
      closeActivityModal();
      return;
    }
    if (!els.modal.classList.contains("hidden")) {
      closeTripModal();
    }
  });
}

function init() {
  loadTrips();
  bindEvents();
  renderTripGrid();
}

init();
