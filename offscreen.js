let worker;
let workerLanguage;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "RECOGNIZE") {
    recognize(message).then(sendResponse).catch((error) => {
      console.error("Grab Text OCR failed:", error);
      sendResponse({ ok: false, error: error.message });
    });
    return true;
  }
  if (message.type === "COPY_TEXT") {
    copyText(message.text).then(
      () => sendResponse({ ok: true }),
      (error) => {
        console.error("Grab Text clipboard write failed:", error);
        sendResponse({ ok: false, error: error.message });
      }
    );
    return true;
  }
});

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch (clipboardError) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    Object.assign(textarea.style, {
      position: "fixed",
      opacity: "0"
    });
    document.body.appendChild(textarea);
    textarea.select();

    try {
      if (!document.execCommand("copy")) {
        throw new Error("The browser did not accept the clipboard copy command.");
      }
    } catch (fallbackError) {
      throw new Error(
        `Clipboard API failed: ${clipboardError.message}; fallback failed: ${fallbackError.message}`
      );
    } finally {
      textarea.remove();
    }
  }
}

async function recognize({ image, selection, language }) {
  if (!language || (language !== "eng" && !await chrome.permissions.contains({
    origins: ["https://raw.githubusercontent.com/*"]
  }))) {
    throw new Error("Allow the language-data host in Grab Text options before using this language.");
  }

  const canvas = await cropAndPrepare(image, selection);
  if (worker && workerLanguage !== language) {
    await worker.terminate();
    worker = undefined;
  }
  if (!worker) {
    const langPath = language === "eng"
      ? chrome.runtime.getURL("lang-data")
      : `https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main`;
    worker = await Tesseract.createWorker(language, Tesseract.OEM.LSTM_ONLY, {
      workerPath: chrome.runtime.getURL("vendor/tesseract/worker.min.js"),
      corePath: chrome.runtime.getURL("vendor/tesseract/core"),
      langPath,
      gzip: false,
      cacheMethod: "write",
      workerBlobURL: false
    });
    workerLanguage = language;
  }
  const { data } = await worker.recognize(canvas);
  return { ok: true, text: data.text.trim() };
}

function cropAndPrepare(dataUrl, selection) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("Could not decode the captured screen."));
    image.onload = () => {
      const scaleX = image.naturalWidth / selection.viewportWidth || selection.devicePixelRatio;
      const scaleY = image.naturalHeight / selection.viewportHeight || selection.devicePixelRatio;
      const left = Math.max(0, Math.round((selection.pageLeft - selection.scrollX) * scaleX));
      const top = Math.max(0, Math.round((selection.pageTop - selection.scrollY) * scaleY));
      const width = Math.min(image.naturalWidth - left, Math.round(selection.width * scaleX));
      const height = Math.min(image.naturalHeight - top, Math.round(selection.height * scaleY));
      if (width <= 0 || height <= 0) {
        reject(new Error("The selected area is outside the captured viewport."));
        return;
      }

      const factor = 2;
      const canvas = document.createElement("canvas");
      canvas.width = width * factor;
      canvas.height = height * factor;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        reject(new Error("Could not prepare the selected image for OCR."));
        return;
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, left, top, width, height, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const gray = Math.round(
          pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114
        );
        pixels.data[i] = gray;
        pixels.data[i + 1] = gray;
        pixels.data[i + 2] = gray;
      }
      context.putImageData(pixels, 0, 0);
      resolve(canvas);
    };
    image.src = dataUrl;
  });
}
