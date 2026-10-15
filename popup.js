"use strict";

const form = document.querySelector("#title-form");
const input = document.querySelector("#custom-title");
const saveButton = document.querySelector("#save");
const resetButton = document.querySelector("#reset");
const siteTitle = document.querySelector("#site-title");
const status = document.querySelector("#status");

let activeTabId = null;
let hasCustomTitle = false;

function setBusy(isBusy) {
  input.disabled = isBusy;
  saveButton.disabled = isBusy;
  resetButton.disabled = isBusy || !hasCustomTitle;
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
  status.classList.toggle("ok", Boolean(message) && !isError);
}

function renderState(state) {
  hasCustomTitle = state.customTitle !== null;
  input.value = state.customTitle ?? "";
  siteTitle.textContent = state.siteTitle || "(No title)";
  siteTitle.title = state.siteTitle || "No title";
  resetButton.disabled = !hasCustomTitle;
}

async function sendToPage(action, extra = {}) {
  if (activeTabId === null) {
    throw new Error("No active tab found.");
  }

  const response = await chrome.tabs.sendMessage(activeTabId, {
    source: "tab-title-labeler",
    action,
    ...extra
  });

  if (!response?.ok) {
    throw new Error(response?.error || "The page did not respond.");
  }

  return response.state;
}

async function initialize() {
  setBusy(true);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTabId = tab?.id ?? null;
    const state = await sendToPage("get-state");
    renderState(state);
    setBusy(false);
    input.focus();
    input.select();
  } catch (_error) {
    setBusy(true);
    siteTitle.textContent = "Unavailable on this page";
    showStatus("Chrome blocks extensions on this page.", true);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(true);
  showStatus("");

  try {
    const state = await sendToPage("set-title", { title: input.value });
    renderState(state);
    showStatus("Saved");
  } catch (error) {
    showStatus(error.message, true);
  } finally {
    setBusy(false);
  }
});

resetButton.addEventListener("click", async () => {
  setBusy(true);
  showStatus("");

  try {
    const state = await sendToPage("reset-title");
    renderState(state);
    showStatus("Reset");
    input.focus();
  } catch (error) {
    showStatus(error.message, true);
  } finally {
    setBusy(false);
  }
});

initialize();
