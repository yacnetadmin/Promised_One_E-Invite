"use strict";

const calendarDialog = document.getElementById("calendar-dialog");
const directionsDialog = document.getElementById("directions-dialog");
const calendarLinks = document.getElementById("calendar-links");
const cards = new Map(
  Array.from(document.querySelectorAll(".performance")).map(card => [card.id, card])
);
const inviteUrl = document.querySelector('link[rel="canonical"]').href;
const childcareUrl = "https://yafc.churchcenter.com/people/forms/1358593";

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
  calendarLinks.hidden = false;
}

function openCalendar(event, selectedId) {
  if (event) event.preventDefault();
  document.querySelectorAll('input[name="performance"]').forEach(radio => {
    radio.checked = radio.value === selectedId;
  });
  calendarLinks.hidden = !selectedId;
  if (selectedId) choosePerformance(selectedId);
  if (!calendarDialog.open) calendarDialog.showModal();
  document.getElementById("calendar-title").focus();
}

function openDirections(event) {
  if (event) event.preventDefault();
  if (!directionsDialog.open) directionsDialog.showModal();
  document.getElementById("directions-title").focus();
}

document.getElementById("calendar-button").addEventListener("click", event => openCalendar(event));
document.querySelectorAll(".save-performance").forEach(link => {
  link.addEventListener("click", event => openCalendar(event, link.dataset.event));
});
document.getElementById("calendar-choices").addEventListener("change", event => {
  if (event.target instanceof HTMLInputElement) choosePerformance(event.target.value);
});
document.getElementById("directions-button").addEventListener("click", openDirections);
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
  document.querySelectorAll(".device-directions").forEach(link => {
    link.href = document.querySelector(`.apple-map[data-location="${link.dataset.location}"]`).href;
  });
}

function handleHash() {
  if (location.hash === "#calendar") {
    if (directionsDialog.open) directionsDialog.close();
    openCalendar();
  } else if (location.hash === "#directions") {
    if (calendarDialog.open) calendarDialog.close();
    openDirections();
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
shareButton.addEventListener("click", async () => {
  if (!navigator.share) {
    showShareFallback("Copy the invitation link below and paste it into a text message.");
    return;
  }
  try {
    await navigator.share({
      title: "You're invited to The Promised One",
      text: "Join us for The Promised One! December 5 at 2 PM or 7 PM in York, or December 12 at 3 PM in Spring Grove.",
      url: inviteUrl
    });
    shareStatus.textContent = "Invitation shared.";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return;
    console.error("Could not open the share sheet:", error);
    showShareFallback("Sharing couldn't open on this device. Copy the invitation link below instead.");
  }
});

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
