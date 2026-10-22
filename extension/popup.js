"use strict";

// Backend adresi; manifest.json içindeki host_permissions ile aynı olmalı.
const BACKEND_URL = "http://127.0.0.1:7864/summarize_stream_status";
// Çok büyük sayfalarda isteği makul tutmak için gönderim üst sınırı.
// Asıl model giriş sınırı backend'de (MAX_INPUT_CHARS) uygulanır ve bildirilir.
const MAX_SEND_CHARS = 200000;

const button = document.getElementById("summarize");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

async function getPageText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https?:|^file:/.test(tab.url || "")) {
    throw new Error("Bu sekmeye erişilemiyor. Normal bir web sayfasında (http/https) deneyin.");
  }
  let results;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (document.body ? document.body.innerText : ""),
    });
  } catch (err) {
    throw new Error("Sayfa metni okunamadı (tarayıcı bu sayfaya erişime izin vermiyor olabilir).");
  }
  const text = ((results && results[0] && results[0].result) || "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.slice(0, MAX_SEND_CHARS);
}

async function readError(response) {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
  } catch (_) { /* JSON değilse genel mesaj */ }
  return `Sunucu hatası (HTTP ${response.status}).`;
}

function handleEvent(event) {
  switch (event.type) {
    case "status":
      setStatus(event.message);
      break;
    case "delta":
      summaryEl.textContent += event.text; // innerHTML değil: çıktı düz metin
      summaryEl.scrollTop = summaryEl.scrollHeight;
      break;
    case "error":
      setStatus(event.message, true);
      break;
    case "done":
      setStatus(event.message || "Özet tamamlandı.");
      break;
  }
}

async function summarize() {
  button.disabled = true;
  summaryEl.textContent = "";
  try {
    setStatus("Sayfa metni alınıyor…");
    const text = await getPageText();
    if (!text) {
      throw new Error("Bu sayfada özetlenecek görünür metin bulunamadı.");
    }

    setStatus("Sunucuya gönderiliyor…");
    let response;
    try {
      response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
    } catch (_) {
      throw new Error("Backend'e bağlanılamadı. Sunucunun çalıştığından emin olun (python backend/app.py).");
    }
    if (!response.ok) {
      throw new Error(await readError(response));
    }

    // NDJSON akışı: her satır bir JSON olay.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = false;
    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        let event;
        try {
          event = JSON.parse(line);
        } catch (_) {
          throw new Error("Sunucudan geçersiz yanıt alındı.");
        }
        if (event.type === "done" || event.type === "error") finished = true;
        handleEvent(event);
      }
      if (done) break;
    }
    if (!finished) {
      setStatus("Bağlantı beklenmedik şekilde kesildi; özet eksik olabilir.", true);
    }
  } catch (err) {
    setStatus(err.message || "Beklenmeyen bir hata oluştu.", true);
  } finally {
    button.disabled = false;
  }
}

button.addEventListener("click", summarize);
