(() => {
  "use strict";

  const STORAGE_PREFIX = "tab-title-labeler::";
  const CHECK_URL_EVERY_MS = 500;

  let pageKey = keyForUrl(window.location.href);
  let customTitle = null;
  let latestSiteTitle = document.title;
  let loadGeneration = 0;

  function canonicalUrl(rawUrl) {
    const url = new URL(rawUrl);

    // A fragment usually points to a section within the same page. Ignoring it
    // keeps a label in place while following in-page links.
    url.hash = "";
    return url.href;
  }

  function keyForUrl(rawUrl) {
    return `${STORAGE_PREFIX}${canonicalUrl(rawUrl)}`;
  }

  function setDocumentTitle(title) {
    if (!document.head || document.title === title) {
      return;
    }

    document.title = title;
  }

  function applyCustomTitle() {
    if (customTitle !== null) {
      setDocumentTitle(customTitle);
    }
  }

  function captureSiteTitleAndReapply() {
    const observedTitle = document.title;

    if (customTitle === null) {
      latestSiteTitle = observedTitle;
      return;
    }

    // A mutation that leaves our title in place was caused by us (or is
    // indistinguishable from it). Any other value is the site's new title.
    if (observedTitle !== customTitle) {
      latestSiteTitle = observedTitle;
      applyCustomTitle();
    }
  }

  async function loadCustomTitle(expectedKey = pageKey) {
    const generation = ++loadGeneration;
    const saved = await chrome.storage.local.get(expectedKey);

    if (generation !== loadGeneration || expectedKey !== pageKey) {
      return;
    }

    customTitle = typeof saved[expectedKey] === "string"
      ? saved[expectedKey]
      : null;
    applyCustomTitle();
  }

  async function saveCustomTitle(title) {
    const cleanedTitle = title.trim();

    if (!cleanedTitle) {
      throw new Error("Enter a title before saving.");
    }

    customTitle = cleanedTitle;
    await chrome.storage.local.set({ [pageKey]: cleanedTitle });
    applyCustomTitle();
    return currentState();
  }

  async function resetCustomTitle() {
    const keyToRemove = pageKey;
    customTitle = null;
    ++loadGeneration;
    await chrome.storage.local.remove(keyToRemove);
    setDocumentTitle(latestSiteTitle);
    return currentState();
  }

  function currentState() {
    return {
      customTitle,
      siteTitle: latestSiteTitle,
      pageUrl: canonicalUrl(window.location.href)
    };
  }

  async function handleLocationChange() {
    const nextKey = keyForUrl(window.location.href);

    if (nextKey === pageKey) {
      return;
    }

    // Remove the old page's label before looking up one for the new page.
    if (customTitle !== null) {
      customTitle = null;
      setDocumentTitle(latestSiteTitle);
    }

    pageKey = nextKey;
    latestSiteTitle = document.title;
    await loadCustomTitle(nextKey);
  }

  const titleObserver = new MutationObserver(() => {
    // As soon as <head> exists, narrow observation to it. Watching the entire
    // document would be unnecessarily noisy on pages with frequently changing
    // body content.
    if (document.head && titleObserverRoot !== document.head) {
      observeTitleChanges();
    }

    captureSiteTitleAndReapply();
  });
  let titleObserverRoot = null;

  function observeTitleChanges() {
    titleObserver.disconnect();
    titleObserverRoot = document.head || document;
    titleObserver.observe(titleObserverRoot, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  observeTitleChanges();

  document.addEventListener("DOMContentLoaded", () => {
    captureSiteTitleAndReapply();
    applyCustomTitle();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.source !== "tab-title-labeler") {
      return false;
    }

    const respond = async () => {
      if (message.action === "get-state") {
        return currentState();
      }

      if (message.action === "set-title") {
        return saveCustomTitle(message.title ?? "");
      }

      if (message.action === "reset-title") {
        return resetCustomTitle();
      }

      throw new Error("Unknown action.");
    };

    respond()
      .then((state) => sendResponse({ ok: true, state }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));

    return true;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !Object.hasOwn(changes, pageKey)) {
      return;
    }

    const nextValue = changes[pageKey].newValue;
    customTitle = typeof nextValue === "string" ? nextValue : null;

    if (customTitle === null) {
      setDocumentTitle(latestSiteTitle);
    } else {
      applyCustomTitle();
    }
  });

  loadCustomTitle();
  window.setInterval(handleLocationChange, CHECK_URL_EVERY_MS);
})();
