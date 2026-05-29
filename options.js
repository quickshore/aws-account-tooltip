"use strict";

const rowsEl = document.getElementById("rows");
const emptyEl = document.getElementById("empty");
const statusEl = document.getElementById("status");

// Predefined highlight palette. The content script picks readable (black/white)
// text automatically, so any of these works against light or dark UI.
const PALETTE = [
  "#ffadad", // red
  "#ffd6a5", // orange
  "#ffe58f", // amber
  "#fdffb6", // yellow
  "#caffbf", // green
  "#9bf6ff", // cyan
  "#a0c4ff", // blue
  "#bdb2ff", // indigo
  "#ffc6ff", // violet
  "#ffadcb", // pink
  "#d0bfae", // taupe
  "#c0c0c0", // gray
];

const DEFAULT_COLOR = PALETTE[2];

// A swatch palette that stores the chosen hex in a hidden `.f-color` input
// (so collect() reads it the same way as before).
function makeColorPicker(selected) {
  const wrap = document.createElement("div");
  wrap.className = "palette";

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.className = "f-color";
  // An empty value means "no highlight" (tooltip only). Only default to a
  // palette color when nothing was previously stored.
  hidden.value = selected == null ? DEFAULT_COLOR : selected;
  wrap.appendChild(hidden);

  function deselectAll() {
    wrap
      .querySelectorAll(".swatch.selected")
      .forEach((s) => s.classList.remove("selected"));
  }

  // "No color" swatch: no highlight, but the account ID still gets a tooltip.
  const none = document.createElement("button");
  none.type = "button";
  none.className = "swatch none";
  none.title = "No color (tooltip only)";
  if (hidden.value === "") none.classList.add("selected");
  none.addEventListener("click", () => {
    hidden.value = "";
    deselectAll();
    none.classList.add("selected");
  });
  wrap.appendChild(none);

  PALETTE.forEach((hex) => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "swatch";
    sw.style.backgroundColor = hex;
    sw.title = hex;
    if (hex.toLowerCase() === hidden.value.toLowerCase()) {
      sw.classList.add("selected");
    }
    sw.addEventListener("click", () => {
      hidden.value = hex;
      deselectAll();
      sw.classList.add("selected");
    });
    wrap.appendChild(sw);
  });

  // Custom RGB swatch: opens the native color picker for anything not in the
  // palette. Shows a rainbow until a custom color is chosen.
  const isNone = hidden.value === "";
  const inPalette = PALETTE.some(
    (h) => h.toLowerCase() === hidden.value.toLowerCase()
  );
  const isCustom = !isNone && !inPalette;

  const custom = document.createElement("button");
  custom.type = "button";
  custom.className = "swatch custom";
  custom.title = "Custom color";

  const picker = document.createElement("input");
  picker.type = "color";
  picker.className = "custom-picker";
  picker.value = isCustom ? hidden.value : "#ff0000";

  if (isCustom) {
    custom.classList.add("selected", "has-color");
    custom.style.backgroundColor = hidden.value;
  }

  custom.addEventListener("click", () => picker.click());
  picker.addEventListener("click", (e) => e.stopPropagation());
  picker.addEventListener("input", () => {
    hidden.value = picker.value;
    custom.style.backgroundColor = picker.value;
    custom.classList.add("has-color");
    deselectAll();
    custom.classList.add("selected");
  });

  custom.appendChild(picker);
  wrap.appendChild(custom);

  return wrap;
}

function makeRow(account = {}) {
  const tr = document.createElement("tr");

  const idTd = document.createElement("td");
  const idInput = document.createElement("input");
  idInput.type = "text";
  idInput.className = "f-id";
  idInput.placeholder = "123456789012";
  idInput.value = account.id || "";
  idInput.maxLength = 14;
  idTd.appendChild(idInput);

  const nameTd = document.createElement("td");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "f-name";
  nameInput.placeholder = "Production";
  nameInput.value = account.name || "";
  nameTd.appendChild(nameInput);

  const colorTd = document.createElement("td");
  colorTd.appendChild(makeColorPicker(account.color));

  const actionsTd = document.createElement("td");
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn-remove";
  removeBtn.textContent = "×";
  removeBtn.title = "Remove";
  removeBtn.addEventListener("click", () => {
    tr.remove();
    updateEmpty();
  });
  actionsTd.appendChild(removeBtn);

  tr.append(idTd, nameTd, colorTd, actionsTd);
  return tr;
}

function addRow(account) {
  rowsEl.appendChild(makeRow(account));
  updateEmpty();
}

function updateEmpty() {
  emptyEl.hidden = rowsEl.children.length > 0;
}

function collect() {
  const accounts = [];
  for (const tr of rowsEl.children) {
    const id = tr.querySelector(".f-id").value.replace(/\D/g, "");
    const name = tr.querySelector(".f-name").value.trim();
    const color = tr.querySelector(".f-color").value;
    if (id.length === 12) {
      accounts.push({ id, name: name || id, color });
    }
  }
  return accounts;
}

function showStatus(text, ok = true) {
  statusEl.textContent = text;
  statusEl.style.color = ok ? "#037f0c" : "#d13212";
  statusEl.classList.add("show");
  setTimeout(() => statusEl.classList.remove("show"), 2000);
}

function save() {
  const accounts = collect();
  chrome.storage.sync.set({ accounts }, () => {
    if (chrome.runtime.lastError) {
      showStatus("Error: " + chrome.runtime.lastError.message, false);
    } else {
      showStatus("Saved ✓ (" + accounts.length + " accounts)");
    }
  });
}

function renderAccounts(accounts) {
  rowsEl.innerHTML = "";
  if (!accounts || accounts.length === 0) {
    addRow();
  } else {
    accounts.forEach(addRow);
  }
  updateEmpty();
}

function load() {
  chrome.storage.sync.get(["accounts"], (res) => renderAccounts(res.accounts));
}

async function exportConfig() {
  const data = {
    app: "aws-account-tooltip",
    version: 1,
    accounts: collect(),
  };
  const json = JSON.stringify(data, null, 2);
  const suggestedName = "aws-account-tooltip-config.json";
  const done = () =>
    showStatus("Exported ✓ (" + data.accounts.length + " accounts)");

  // Let the user choose the destination when the File System Access API is
  // available; otherwise fall back to a plain download.
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          { description: "JSON", accept: { "application/json": [".json"] } },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      done();
    } catch (e) {
      if (e.name !== "AbortError") {
        showStatus("Export failed: " + e.message, false);
      }
    }
    return;
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  a.click();
  URL.revokeObjectURL(url);
  done();
}

function importConfig(file) {
  const reader = new FileReader();
  reader.onerror = () => showStatus("Import failed: cannot read file", false);
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (e) {
      showStatus("Import failed: invalid JSON", false);
      return;
    }
    const list = Array.isArray(parsed) ? parsed : parsed && parsed.accounts;
    if (!Array.isArray(list)) {
      showStatus("Import failed: no accounts found", false);
      return;
    }
    const accounts = list
      .map((a) => ({
        id: String((a && a.id) || "").replace(/\D/g, ""),
        name: String((a && a.name) || "").trim(),
        // missing color -> default; explicit "" -> no highlight (tooltip only)
        color: a && a.color != null ? a.color : DEFAULT_COLOR,
      }))
      .filter((a) => a.id.length === 12)
      .map((a) => ({ ...a, name: a.name || a.id }));

    renderAccounts(accounts);
    chrome.storage.sync.set({ accounts }, () => {
      if (chrome.runtime.lastError) {
        showStatus("Error: " + chrome.runtime.lastError.message, false);
      } else {
        showStatus("Imported ✓ (" + accounts.length + " accounts)");
      }
    });
  };
  reader.readAsText(file);
}

const importFile = document.getElementById("importFile");

document.getElementById("add").addEventListener("click", () => addRow());
document.getElementById("save").addEventListener("click", save);
document.getElementById("export").addEventListener("click", exportConfig);
document.getElementById("import").addEventListener("click", () =>
  importFile.click()
);
importFile.addEventListener("change", () => {
  if (importFile.files && importFile.files[0]) {
    importConfig(importFile.files[0]);
  }
  importFile.value = ""; // allow re-importing the same file
});

load();
