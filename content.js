// AWS Account Tooltip - content script
// Scans AWS Console pages for configured account IDs, highlights them and
// adds a tooltip showing the account name.

(function () {
  "use strict";

  // normalizedId (12 digits, no separators) -> { name, color }
  let accountMap = Object.create(null);

  // Matches a 12-digit AWS account id, optionally grouped with "-" or spaces
  // (e.g. 123456789012 or 1234-5678-9012). Word boundaries prevent matching
  // inside longer digit sequences such as ARNs or request IDs.
  const ACCOUNT_RE = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;

  const HIGHLIGHT_CLASS = "aws-acct-tip";

  function normalizeId(s) {
    return s.replace(/\D/g, "");
  }

  // Pick black or white text for readability against the highlight color.
  function textColorFor(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return "#000";
    const v = m[1];
    const r = parseInt(v.slice(0, 2), 16);
    const g = parseInt(v.slice(2, 4), 16);
    const b = parseInt(v.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? "#000" : "#fff";
  }

  function buildMap(accounts) {
    accountMap = Object.create(null);
    (accounts || []).forEach((a) => {
      const id = normalizeId(a.id || "");
      if (id.length === 12) {
        accountMap[id] = { name: a.name || id, color: a.color || "#ffe58f" };
      }
    });
  }

  function hasAccounts() {
    for (const k in accountMap) return true;
    return false;
  }

  function processTextNode(node) {
    const text = node.nodeValue;
    if (!text || text.length < 12) return;

    ACCOUNT_RE.lastIndex = 0;
    let match;
    let lastIndex = 0;
    let frag = null;

    while ((match = ACCOUNT_RE.exec(text)) !== null) {
      const raw = match[0];
      const info = accountMap[normalizeId(raw)];
      if (!info) continue;

      if (!frag) frag = document.createDocumentFragment();
      if (match.index > lastIndex) {
        frag.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index))
        );
      }

      const span = document.createElement("span");
      span.className = HIGHLIGHT_CLASS;
      span.textContent = raw;
      span.style.backgroundColor = info.color;
      span.style.color = textColorFor(info.color);
      span.setAttribute("data-aws-acct-name", info.name);
      frag.appendChild(span);

      lastIndex = match.index + raw.length;
    }

    if (frag) {
      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      node.parentNode.replaceChild(frag, node);
    }
  }

  function acceptNode(node) {
    const p = node.parentNode;
    if (!p) return NodeFilter.FILTER_REJECT;
    const tag = p.nodeName;
    if (
      tag === "SCRIPT" ||
      tag === "STYLE" ||
      tag === "TEXTAREA" ||
      tag === "NOSCRIPT"
    ) {
      return NodeFilter.FILTER_REJECT;
    }
    // Don't re-process our own highlights.
    if (p.classList && p.classList.contains(HIGHLIGHT_CLASS)) {
      return NodeFilter.FILTER_REJECT;
    }
    if (!/\d{4}/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }

  function scan(root) {
    if (!root || !hasAccounts()) return;
    if (root.nodeType === Node.TEXT_NODE) {
      processTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      { acceptNode }
    );
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(processTextNode);
  }

  function unwrap(span) {
    const parent = span.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(span.textContent), span);
    parent.normalize();
  }

  function clearHighlights() {
    document.querySelectorAll("." + HIGHLIGHT_CLASS).forEach(unwrap);
  }

  // React to changes in the SPA's DOM.
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node);
        else if (node.nodeType === Node.TEXT_NODE) processTextNode(node);
      });
    }
  });

  function start() {
    scan(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  chrome.storage.sync.get(["accounts"], (res) => {
    buildMap(res.accounts);
    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start);
  });

  // Live-update when the options page saves new settings.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.accounts) {
      buildMap(changes.accounts.newValue);
      clearHighlights();
      scan(document.body);
    }
  });
})();
