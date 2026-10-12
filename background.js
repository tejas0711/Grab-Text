const OFFSCREEN_PATH = "offscreen.html";

chrome.action.onClicked.addListener((tab) => startSelection(tab));

chrome.commands.onCommand.addListener((command) => {
  if (command !== "grab-text") return;
  chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
    if (tab) return startSelection(tab);
  }).catch(console.error);
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OCR_SELECTION" && sender.tab?.id !== undefined) {
    recognizeSelection(sender.tab, message).then(sendResponse).catch((error) => {
      console.error("Grab Text OCR failed:", error);
      sendResponse({ ok: false, error: error.message });
    });
    return true;
  }

});

async function startSelection(tab) {
  if (!tab?.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
    await chrome.tabs.sendMessage(tab.id, { type: "START_SELECTION" });
  } catch (error) {
    console.error("Grab Text could not start on this tab:", error);
  }
}

async function recognizeSelection(tab, selection) {
  await ensureOffscreen();
  try {
    const { language = "eng" } = await chrome.storage.local.get("language");
    const response = await chrome.runtime.sendMessage({
      type: "RECOGNIZE",
      image: await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }),
      selection: selection.selection,
      language
    });
    if (!response?.ok) throw new Error(response?.error || "OCR did not return text.");
    if (!response.text?.trim()) throw new Error("No text was recognized. Try selecting a larger or clearer area.");

    let copied;
    try {
      const result = await chrome.runtime.sendMessage({
        type: "COPY_TEXT",
        text: response.text
      });
      copied = result?.ok === true;
      if (!copied) {
        throw new Error(result?.error || "The clipboard write was not successful.");
      }
    } catch (error) {
      console.error("Grab Text could not write to the clipboard:", error);
      throw new Error(`Could not copy recognized text: ${error.message}`);
    }

    await showToast(tab.id, copied, response.text);
    return { ok: true, copied };
  } catch (error) {
    await showToast(tab.id, false, error.message);
    throw error;
  }
}

async function showToast(tabId, copied, preview) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      copied,
      preview
    });
  } catch (error) {
    console.warn("Grab Text could not show the result toast:", error);
  }
}

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ["CLIPBOARD", "WORKERS"],
    justification: "Run local OCR and copy recognized text to the clipboard."
  });
}
