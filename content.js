(() => {
  if (globalThis.__grabTextInstalled) return;
  globalThis.__grabTextInstalled = true;

  let overlay;
  let startPoint;
  let selectionBox;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "START_SELECTION") {
      beginSelection();
      sendResponse({ ok: true });
    } else if (message.type === "SHOW_TOAST") {
      showToast(message.copied, message.preview);
    }
  });

  function beginSelection() {
    if (overlay) return;
    overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      background: "rgba(0, 0, 0, 0.28)",
      cursor: "crosshair",
      touchAction: "none"
    });
    overlay.addEventListener("pointerdown", onPointerDown);
    overlay.addEventListener("pointermove", onPointerMove);
    overlay.addEventListener("pointerup", onPointerUp);
    overlay.addEventListener("wheel", (event) => event.preventDefault(), { passive: false });
    overlay.addEventListener("keydown", onKeyDown);
    overlay.tabIndex = -1;
    document.documentElement.appendChild(overlay);
    overlay.focus();
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    startPoint = { x: event.clientX, y: event.clientY };
    selectionBox = document.createElement("div");
    Object.assign(selectionBox.style, {
      position: "fixed",
      border: "2px solid #fff",
      outline: "1px solid #2563eb",
      background: "rgba(37, 99, 235, 0.16)",
      pointerEvents: "none"
    });
    overlay.appendChild(selectionBox);
    overlay.setPointerCapture(event.pointerId);
    updateSelection(event);
  }

  function onPointerMove(event) {
    if (startPoint) updateSelection(event);
  }

  function updateSelection(event) {
    const left = Math.min(startPoint.x, event.clientX);
    const top = Math.min(startPoint.y, event.clientY);
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${Math.abs(event.clientX - startPoint.x)}px`;
    selectionBox.style.height = `${Math.abs(event.clientY - startPoint.y)}px`;
  }

  function onPointerUp(event) {
    if (!startPoint) return;
    const selection = {
      pageLeft: Math.min(startPoint.x, event.clientX) + window.scrollX,
      pageTop: Math.min(startPoint.y, event.clientY) + window.scrollY,
      width: Math.abs(event.clientX - startPoint.x),
      height: Math.abs(event.clientY - startPoint.y),
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      devicePixelRatio: window.devicePixelRatio,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    };
    removeOverlay();
    if (selection.width < 4 || selection.height < 4) return;
    chrome.runtime.sendMessage({ type: "OCR_SELECTION", selection }).catch((error) => {
      showToast(false, error.message);
    });
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      removeOverlay();
    }
  }

  function removeOverlay() {
    overlay?.remove();
    overlay = undefined;
    startPoint = undefined;
    selectionBox = undefined;
  }

  function showToast(copied, preview) {
    document.getElementById("__grab-text-toast")?.remove();
    const toast = document.createElement("div");
    toast.id = "__grab-text-toast";
    const shortPreview = String(preview || "").replace(/\s+/g, " ").trim().slice(0, 90);
    toast.textContent = `${copied ? "Copied" : "Could not copy"}${shortPreview ? `: ${shortPreview}` : ""}`;
    Object.assign(toast.style, {
      position: "fixed",
      right: "20px",
      bottom: "20px",
      zIndex: "2147483647",
      maxWidth: "min(420px, calc(100vw - 40px))",
      padding: "10px 14px",
      borderRadius: "8px",
      color: "#fff",
      background: copied ? "#166534" : "#991b1b",
      boxShadow: "0 3px 14px rgba(0,0,0,.3)",
      font: "13px/1.4 system-ui, sans-serif"
    });
    document.documentElement.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
})();
