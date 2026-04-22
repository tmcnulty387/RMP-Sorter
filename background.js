const extensionApi = globalThis.browser ?? globalThis.chrome;

extensionApi.action.onClicked.addListener(async (tab) => {
  if (tab.id === undefined || !isRateMyProfessorsUrl(tab.url)) {
    return;
  }

  await extensionApi.scripting.executeScript({
    target: {
      tabId: tab.id,
    },
    files: ["sort.js"],
  });
});

function isRateMyProfessorsUrl(url) {
  if (url === undefined) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    const isWebPage = parsedUrl.protocol === "http:" ||
      parsedUrl.protocol === "https:";
    const isRateMyProfessorsHost =
      parsedUrl.hostname === "ratemyprofessors.com" ||
      parsedUrl.hostname.endsWith(".ratemyprofessors.com");

    return (
      isWebPage &&
      isRateMyProfessorsHost
    );
  } catch {
    return false;
  }
}
