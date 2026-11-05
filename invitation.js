"use strict";

const calendarDialog = document.getElementById("calendar-dialog");
const cards = new Map(
  Array.from(document.querySelectorAll(".performance")).map(card => [card.id, card])
);
const inviteUrl = document.querySelector('link[rel="canonical"]').href;
const childcareUrl = "https://yafc.churchcenter.com/people/forms/1358593";
const scheduleEvents = Array.from(cards.values()).map(card => ({
  id: card.id,
  end: card.dataset.end,
  location: card.querySelector(".venue").textContent
}));
let remainingPerformances = [];
let selectedPerformanceId;
let scheduleSignature;

function refreshSchedule() {
  remainingPerformances = getRemainingPerformances(scheduleEvents, Date.now());
  const signature = remainingPerformances.map(event => event.id).join(",");
  if (signature === scheduleSignature) return;
  scheduleSignature = signature;
  const activeIds = new Set(remainingPerformances.map(event => event.id));
  const focusedCard = document.activeElement.closest(".performance");
  const expiredDialog = calendarDialog.open && !activeIds.has(selectedPerformanceId);
  if (expiredDialog) calendarDialog.close();
  cards.forEach((card, id) => { card.hidden = !activeIds.has(id); });
  const finished = remainingPerformances.length === 0;
  const words = ["No", "One", "Two", "Three"];
  const count = remainingPerformances.length;
  const locations = new Set(remainingPerformances.map(event => event.location)).size;
  document.querySelector(".locations").textContent = finished
    ? "Thank you for joining us"
    : `${words[count]} performance${count === 1 ? "" : "s"}${count < scheduleEvents.length ? " remaining" : ""} \u00b7 ${words[locations]} location${locations === 1 ? "" : "s"}`;
  document.querySelector(".performances").style.setProperty("--performance-columns", Math.max(1, count));
  document.getElementById("performances-title").textContent = finished
    ? "Thank you for being part of the story."
    : "Find your performance";
  document.getElementById("finished-message").hidden = !finished;
  document.querySelectorAll(
    ".performances > .eyebrow, .section-intro, .timezone, .duration-note, .childcare-panel, .share-section, .action-bar, .header-links, .no-script-panel"
  ).forEach(element => { element.hidden = finished; });
  document.querySelector(".welcome .eyebrow").textContent = finished ? "Merry Christmas" : "You're invited";
  if (expiredDialog || (focusedCard && !activeIds.has(focusedCard.id))) {
    document.getElementById("performances").focus({ preventScroll: true });
  }
}

const hero = document.querySelector(".hero");
const heroTitle = document.getElementById("hero-title");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let parallaxFrame = 0;

function updateParallax() {
  parallaxFrame = 0;
  const bounds = hero.getBoundingClientRect();
  const progress = Math.max(0, Math.min(1, -bounds.top / bounds.height));
  heroTitle.style.setProperty("--parallax-offset", `${progress * 14}px`);
}

function scheduleParallax() {
  if (!parallaxFrame) parallaxFrame = requestAnimationFrame(updateParallax);
}

function configureParallax() {
  window.removeEventListener("scroll", scheduleParallax);
  window.removeEventListener("resize", scheduleParallax);
  cancelAnimationFrame(parallaxFrame);
  parallaxFrame = 0;
  heroTitle.style.removeProperty("--parallax-offset");
  if (!reducedMotion.matches) {
    window.addEventListener("scroll", scheduleParallax, { passive: true });
    window.addEventListener("resize", scheduleParallax);
    scheduleParallax();
  }
}

reducedMotion.addEventListener("change", configureParallax);
configureParallax();

function choosePerformance(id) {
  const card = cards.get(id);
  if (!card) throw new Error(`Unknown performance: ${id}`);
  const venue = card.querySelector(".venue").textContent;
  const time = card.querySelector("time").textContent.trim().replace(/\s+/g, " ");
  const address = card.querySelector(".address").textContent;
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: "The Promised One",
    dates: `${card.dataset.start}/${card.dataset.end}`,
    ctz: "America/New_York",
    location: address,
    details: `Songs, dramatic readings, and interactive storytelling for the whole family. Light refreshments afterward. Childcare: ${childcareUrl}\nInvitation: ${inviteUrl}`
  });
  document.getElementById("google-calendar").href = `https://calendar.google.com/calendar/render?${query}`;
  document.getElementById("ics-calendar").href = card.dataset.calendar;
  document.getElementById("selected-performance").textContent = `${venue} - ${time}`;
  document.getElementById("selected-address").textContent = address;
}

function openCalendar(event, selectedId) {
  if (event) event.preventDefault();
  refreshSchedule();
  if (!remainingPerformances.some(performance => performance.id === selectedId)) {
    document.getElementById("performances").focus();
    return;
  }
  selectedPerformanceId = selectedId;
  choosePerformance(selectedId);
  if (!calendarDialog.open) calendarDialog.showModal();
  document.getElementById("calendar-title").focus();
}

document.querySelectorAll(".save-performance").forEach(link => {
  link.addEventListener("click", event => openCalendar(event, link.dataset.event));
});
document.querySelectorAll("dialog").forEach(dialog => {
  dialog.querySelector(".close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
    }
  });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
});

const appleDevice = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
if (appleDevice) {
  const icsLink = document.getElementById("ics-calendar");
  const googleLink = document.getElementById("google-calendar");
  icsLink.textContent = "Add to Apple Calendar";
  icsLink.classList.add("primary");
  googleLink.classList.remove("primary");
  googleLink.before(icsLink);
  document.getElementById("calendar-note").textContent =
    "Start with Apple Calendar, or use Google Calendar in your browser. All times are Eastern, in 2026.";
  document.getElementById("ics-calendar-help").textContent =
    "Open the calendar file, then review and save the event in Calendar. If it downloads instead, open the .ics file from Downloads. Using Outlook? You can open the same file there.";
  document.querySelectorAll(".device-directions").forEach(link => {
    const destination = new URL(link.href).searchParams.get("destination");
    link.href = `https://maps.apple.com/?${new URLSearchParams({ daddr: destination, dirflg: "d" })}`;
  });
}

function handleHash() {
  if (location.hash === "#calendar" || location.hash === "#directions") {
    if (calendarDialog.open) calendarDialog.close();
    document.getElementById("performances").scrollIntoView();
  }
}
window.addEventListener("hashchange", handleHash);
handleHash();

const shareButton = document.getElementById("share-button");
const shareFallback = document.getElementById("share-fallback");
const shareStatus = document.getElementById("share-status");

function showShareFallback(message) {
  shareFallback.hidden = false;
  shareStatus.textContent = message;
  document.getElementById("invite-link").focus();
}

shareButton.hidden = false;
async function shareInvitation(event) {
  event.preventDefault();
  refreshSchedule();
  if (remainingPerformances.length === 0) {
    document.getElementById("performances").focus();
    return;
  }
  if (!navigator.share) {
    showShareFallback("Copy the invitation link below and paste it into a text message.");
    document.getElementById("share-fallback").scrollIntoView({ block: "center" });
    return;
  }
  try {
    await navigator.share({
      title: "You're invited to The Promised One",
      text: `Join us for The Promised One! ${remainingPerformances.map(performance => {
        const card = cards.get(performance.id);
        const time = card.querySelector("time").textContent.trim().replace(/\s+/g, " ");
        return `${time} in ${performance.location}`;
      }).join("; ")}.`,
      url: inviteUrl
    });
    shareStatus.textContent = "Invitation shared.";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return;
    console.error("Could not open the share sheet:", error);
    showShareFallback("Sharing couldn't open on this device. Copy the invitation link below instead.");
  }
}

shareButton.addEventListener("click", shareInvitation);
document.getElementById("share-bar-button").addEventListener("click", shareInvitation);

document.getElementById("copy-button").addEventListener("click", async () => {
  const input = document.getElementById("invite-link");
  if (!navigator.clipboard?.writeText) {
    input.focus();
    input.select();
    shareStatus.textContent = "Automatic copying is unavailable. The link is selected; copy it and paste it into your message.";
    return;
  }
  try {
    await navigator.clipboard.writeText(inviteUrl);
    shareStatus.textContent = "Link copied! Paste it into a text message.";
  } catch (error) {
    console.error("Could not copy the invitation link:", error);
    input.focus();
    input.select();
    shareStatus.textContent = "The browser couldn't copy the link. Copy the selected link manually.";
  }
});

refreshSchedule();
setInterval(refreshSchedule, 1000);
window.addEventListener("pageshow", refreshSchedule);
window.addEventListener("focus", refreshSchedule);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshSchedule();
});
