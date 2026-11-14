# Nametag

A small Chrome extension that lets you replace a page's tab title with your own
label.

## Behavior

- Labels are stored for the exact page URL, excluding its `#fragment`.
- A label survives refreshes and returns when that page is opened again.
- If the site changes its title while a label is active, the extension remembers
  the newest site title while continuing to display your label.
- **Reset to site title** removes the saved label and restores that newest site
  title.
- Other pages on the same site are unaffected.

Browser pages (`chrome://...`, Safari's start page), extension stores, and some
other protected pages do not allow content scripts, so the extension cannot rename
those tabs.

## Install

The extension itself lives in `extension/` and is shared by both browsers.

### Safari (macOS)

1. Open `safari/Nametag/Nametag.xcodeproj` in Xcode.
2. Select the **Nametag (macOS)** scheme and press **Run**. This installs the
   Nametag app, which carries the Safari extension.
3. In Safari, open **Settings → Extensions** and turn on **Nametag**. If you
   build without a paid developer team, first turn on **Develop → Developer
   Settings → Allow unsigned extensions** (this resets each time Safari quits).
4. Grant Nametag access to websites when Safari asks, or choose **Always Allow
   on Every Website** in its extension settings.

The **Nametag (iOS)** scheme builds the same extension for Safari on iPhone and
iPad; enable it in **Settings → Apps → Safari → Extensions**.

Files added to `extension/` must also be added to the Xcode project's
**Shared (Extension)/Resources** group.

### Chrome

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Select the `extension` folder inside this repository.
5. Optionally pin **Nametag** from Chrome's Extensions menu.

Click the extension icon on any normal website, type a title, and press **Save**.
Use **Reset to site title** to remove it.

## Check the code

Run the dependency-free behavior test with:

```sh
node tests/content.test.js
```
