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
  hidden.value = selected || DEFAULT_COLOR;
  wrap.appendChild(hidden);

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
      wrap
        .querySelectorAll(".swatch.selected")
        .forEach((s) => s.classList.remove("selected"));
      sw.classList.add("selected");
    });
    wrap.appendChild(sw);
  });

  // Custom RGB swatch: opens the native color picker for anything not in the
  // palette. Shows a rainbow until a custom color is chosen.
  const inPalette = PALETTE.some(
    (h) => h.toLowerCase() === hidden.value.toLowerCase()
  );

  const custom = document.createElement("button");
  custom.type = "button";
  custom.className = "swatch custom";
  custom.title = "Custom color";

  const picker = document.createElement("input");
  picker.type = "color";
  picker.className = "custom-picker";
  picker.value = inPalette ? "#ff0000" : hidden.value;

  if (!inPalette) {
    custom.classList.add("selected", "has-color");
    custom.style.backgroundColor = hidden.value;
  }

  custom.addEventListener("click", () => picker.click());
  picker.addEventListener("click", (e) => e.stopPropagation());
  picker.addEventListener("input", () => {
    hidden.value = picker.value;
    custom.style.backgroundColor = picker.value;
    custom.classList.add("has-color");
    wrap
      .querySelectorAll(".swatch.selected")
      .forEach((s) => s.classList.remove("selected"));
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

function load() {
  chrome.storage.sync.get(["accounts"], (res) => {
    const accounts = res.accounts || [];
    rowsEl.innerHTML = "";
    if (accounts.length === 0) {
      addRow();
    } else {
      accounts.forEach(addRow);
    }
    updateEmpty();
  });
}

document.getElementById("add").addEventListener("click", () => addRow());
document.getElementById("save").addEventListener("click", save);

load();
