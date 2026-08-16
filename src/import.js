import { initI18n, applyI18nToDOM, t, tHtml } from "./i18n.js";
import { setStorage } from "./storage.js";
import { WHITELIST_STORAGE_KEY } from "./whitelist.js";
import { HISTORY_STORAGE_KEY } from "./history.js";

const $ = (id) => document.getElementById(id);

let currentData = null;

function showError(msg) {
  const box = $("error-box");
  box.textContent = msg;
  box.classList.remove("hidden");
}

function hideError() {
  $("error-box").classList.add("hidden");
}

function setStep(activeId, doneId) {
  ["step-file", "step-confirm", "step-done"].forEach((id) => {
    const el = document.getElementById(id);
    el.classList.toggle("active", id === activeId);
    el.classList.toggle("done", id === doneId);
  });
}

function setPending(data, name) {
  currentData = data;
  setStep("step-confirm", "step-file");
  $("file-name").textContent = name;
  $("file-box").classList.remove("hidden");
  $("confirm-message").innerHTML = tHtml("modalTextImport", {
    whitelistCount: data.whitelist.length,
    historyCount: data.history.length,
  });
  $("confirm-box").classList.remove("hidden");
  $("dropzone").classList.add("hidden");
}

function resetUI() {
  currentData = null;
  setStep("step-file", null);
  hideError();
  $("file-box").classList.add("hidden");
  $("confirm-box").classList.add("hidden");
  $("done-box").classList.add("hidden");
  $("dropzone").classList.remove("hidden");
  $("file-input").value = "";
}

async function onFile(file) {
  if (!file) return;
  hideError();
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || data.version !== 1 || !Array.isArray(data.whitelist) || !Array.isArray(data.history)) {
      showError(t("importErrorFormat"));
      return;
    }
    setPending(data, file.name);
  } catch (e) {
    showError(t("importErrorGeneric", { message: e.message }));
  }
}

async function doImport() {
  if (!currentData) return;
  await Promise.all([
    setStorage(WHITELIST_STORAGE_KEY, currentData.whitelist),
    setStorage(HISTORY_STORAGE_KEY, currentData.history),
  ]);
  setStep("step-done", "step-confirm");
  $("confirm-box").classList.add("hidden");
  $("file-box").classList.add("hidden");
  $("done-box").classList.remove("hidden");
}

function bind() {
  const input = $("file-input");
  $("btn-pick").addEventListener("click", (e) => {
    e.stopPropagation();
    input.click();
  });
  input.addEventListener("change", () => onFile(input.files?.[0]));
  $("btn-import").addEventListener("click", doImport);
  $("btn-cancel").addEventListener("click", resetUI);
  $("btn-close").addEventListener("click", () => {
    if (chrome?.tabs?.getCurrent) {
      chrome.tabs.getCurrent((tab) => {
        if (tab?.id != null) chrome.tabs.remove(tab.id);
        else window.close();
      });
    } else {
      window.close();
    }
  });

  const dropzone = $("dropzone");
  dropzone.addEventListener("click", () => input.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });
  let depth = 0;
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());
  dropzone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    depth++;
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    depth--;
    if (depth <= 0) {
      depth = 0;
      dropzone.classList.remove("dragover");
    }
  });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    depth = 0;
    dropzone.classList.remove("dragover");
    onFile(e.dataTransfer?.files?.[0]);
  });
}

async function main() {
  await initI18n();
  applyI18nToDOM();
  document.title = t("importFileTitle");
  bind();
}

main();
