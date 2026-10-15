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

Chrome's own pages (`chrome://...`), the Chrome Web Store, and some other
protected pages do not allow content scripts, so the extension cannot rename
those tabs.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Select this `nametag` folder.
5. Optionally pin **Nametag** from Chrome's Extensions menu.

Click the extension icon on any normal website, type a title, and press **Save**.
Use **Reset to site title** to remove it.

## Check the code

Run the dependency-free behavior test with:

```sh
node tests/content.test.js
```
