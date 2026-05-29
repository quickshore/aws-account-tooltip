# AWS Account Tooltip

A Chrome extension that makes life a bit easier when working with multiple AWS
accounts — it highlights configured AWS account IDs on the AWS Console and shows
the account name in a hover tooltip.

When an account ID like `123456789012` (or grouped as `1234-5678-9012`) appears
anywhere on a `console.aws.amazon.com` page, it is highlighted with your chosen
color and shows the account name when you hover over it.

## Install (unpacked)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder.
4. The extension is now active on AWS Console pages.

## Configure accounts

1. Click the extension's toolbar icon, **or** open `chrome://extensions`,
   find "AWS Account Tooltip" → **Details** → **Extension options**.
2. Add a row per account with:
   - **Account ID** — the 12-digit AWS account number.
   - **Account name** — the label shown in the tooltip.
   - **Color** — the highlight background color.
3. Click **Save**. Open AWS Console tabs update automatically.

Settings are stored with `chrome.storage.sync`, so they follow your Chrome
profile across machines.

## How it works

- `content.js` scans the page (and watches for SPA navigation changes via a
  `MutationObserver`) for 12-digit account IDs that match your configured map,
  wraps each match in a styled `<span>`, and attaches a CSS tooltip.
- Matching uses word boundaries so IDs embedded in longer numbers (e.g. ARNs or
  request IDs) are not falsely highlighted.
- Tooltip text color (black/white) is chosen automatically based on the
  highlight color's brightness for readability.

## Files

| File            | Purpose                                            |
| --------------- | -------------------------------------------------- |
| `manifest.json` | Manifest V3 definition                             |
| `content.js`    | Scans/highlights account IDs on AWS Console pages  |
| `content.css`   | Highlight + tooltip styling                        |
| `options.html`  | Options UI                                         |
| `options.js`    | Loads/saves the account map                        |
| `background.js` | Opens options when the toolbar icon is clicked     |
