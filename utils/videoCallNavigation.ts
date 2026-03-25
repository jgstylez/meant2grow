const STORAGE_KEY = "videoCallReturnPage";

/** Remember where to return after leaving an in-app video call (e.g. chat:abc). */
export function setVideoCallReturnPage(page: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, page);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Read and clear the return route for the video call flow. Defaults to `"chat"`. */
export function consumeVideoCallReturnPage(): string {
  try {
    const p = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return p && p.trim() ? p : "chat";
  } catch {
    return "chat";
  }
}
