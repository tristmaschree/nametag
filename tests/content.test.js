"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const contentScript = fs.readFileSync(
  path.join(__dirname, "..", "content.js"),
  "utf8"
);

const storage = {
  "tab-title-labeler::https://example.com/article?view=full": "Reading list"
};
const storageListeners = [];
let messageListener;
let urlTimer;
let observer;

const document = {
  head: {},
  title: "Original article title",
  addEventListener() {}
};

class FakeMutationObserver {
  constructor(callback) {
    this.callback = callback;
    observer = this;
  }

  disconnect() {}
  observe() {}
  trigger() { this.callback([]); }
}

function notifyStorageChange(key, oldValue, newValue) {
  for (const listener of storageListeners) {
    listener({ [key]: { oldValue, newValue } }, "local");
  }
}

const chrome = {
  runtime: {
    onMessage: {
      addListener(listener) {
        messageListener = listener;
      }
    }
  },
  storage: {
    local: {
      async get(key) {
        return Object.hasOwn(storage, key) ? { [key]: storage[key] } : {};
      },
      async set(values) {
        for (const [key, value] of Object.entries(values)) {
          const oldValue = storage[key];
          storage[key] = value;
          notifyStorageChange(key, oldValue, value);
        }
      },
      async remove(key) {
        const oldValue = storage[key];
        delete storage[key];
        notifyStorageChange(key, oldValue, undefined);
      }
    },
    onChanged: {
      addListener(listener) {
        storageListeners.push(listener);
      }
    }
  }
};

const location = { href: "https://example.com/article?view=full#notes" };
const window = {
  location,
  setInterval(callback) {
    urlTimer = callback;
  }
};

vm.runInNewContext(contentScript, {
  URL,
  chrome,
  document,
  window,
  MutationObserver: FakeMutationObserver,
  Object,
  Error
});

function flushAsyncWork() {
  return new Promise((resolve) => setImmediate(resolve));
}

function sendMessage(action, extra = {}) {
  return new Promise((resolve, reject) => {
    const keptOpen = messageListener(
      { source: "tab-title-labeler", action, ...extra },
      {},
      (response) => response.ok ? resolve(response.state) : reject(response.error)
    );
    assert.equal(keptOpen, true);
  });
}

(async () => {
  await flushAsyncWork();
  assert.equal(document.title, "Reading list", "loads the saved page label");

  document.title = "Updated by the site";
  observer.trigger();
  assert.equal(document.title, "Reading list", "reapplies after a site update");

  const activeState = await sendMessage("get-state");
  assert.equal(activeState.siteTitle, "Updated by the site");
  assert.equal(activeState.customTitle, "Reading list");

  const resetState = await sendMessage("reset-title");
  assert.equal(document.title, "Updated by the site", "reset restores latest site title");
  assert.equal(resetState.customTitle, null);
  assert.equal(
    Object.hasOwn(storage, "tab-title-labeler::https://example.com/article?view=full"),
    false,
    "reset removes persistent storage"
  );

  await sendMessage("set-title", { title: "  Project notes  " });
  assert.equal(document.title, "Project notes", "trims and applies a new label");

  location.href = "https://example.com/another-page";
  await urlTimer();
  assert.equal(document.title, "Updated by the site", "navigation drops the prior page label");

  console.log("content.test.js: all assertions passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
