const languagePicker = document.getElementById("language");
const status = document.getElementById("status");

chrome.storage.local.get({ language: "eng" }).then(({ language }) => {
  languagePicker.value = language;
});

languagePicker.addEventListener("change", async () => {
  const language = languagePicker.value;
  try {
    if (language !== "eng") {
      const granted = await chrome.permissions.request({
        origins: ["https://raw.githubusercontent.com/*"]
      });
      if (!granted) {
        languagePicker.value = "eng";
        status.textContent = "Permission is needed to download language data. English remains selected.";
        return;
      }
    }
    await chrome.storage.local.set({ language });
    status.textContent = `${languagePicker.selectedOptions[0].text} selected.`;
  } catch (error) {
    status.textContent = `Could not save the language: ${error.message}`;
  }
});
