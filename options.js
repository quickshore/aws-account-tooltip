"use strict";

const rowsEl = document.getElementById("rows");
const emptyEl = document.getElementById("empty");
const statusEl = document.getElementById("status");

const DEFAULT_COLOR = "#ffe58f";

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
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.className = "f-color";
  colorInput.value = account.color || DEFAULT_COLOR;
  colorTd.appendChild(colorInput);

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
