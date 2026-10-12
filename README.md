# Grab Text

Grab Text is a Manifest V3 Chrome extension that lets you select a visible
screen region, recognizes its text locally with Tesseract.js, and copies the
result to the clipboard.

## Load the extension

1. Open `chrome://extensions` in Chrome and turn on **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Use the toolbar icon or press **Ctrl+Shift+E** to select text on a webpage.
   Press **Esc** to cancel.

The OCR runtime is already bundled. To rebuild those files after changing the
Tesseract.js dependencies, run `npm install` and then `npm run vendor`.

The English traineddata is bundled in `lang-data/eng.traineddata`. Other
available languages can be selected in the extension's options; Chrome asks
for optional access to the official Tesseract language-data host. Their
traineddata is downloaded on first use and cached for later use. Only
traineddata is downloaded; executable code and the OCR engine are included in
the extension. Third-party notices for the bundled Tesseract.js runtime are
in `vendor/tesseract`.
