import { matchFieldToKey } from "../utils/fieldMatcher";
import { fillText, fillSelect } from "../utils/filler";

type FillRequest = {
  profile: Record<string,string>;
  useAI?: boolean;
};

/**
 * When a message of type 'fillForm' arrives, map fields and fill them.
 */
chrome.runtime.onMessage.addListener(
  (msg: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (msg?.type === "fillForm") {
      handleFill(msg.payload)
        .then(result => sendResponse({ ok: true, filled: result }))
        .catch(err => sendResponse({ ok: false, error: String(err) }));
      return true; // keep channel open for async response
    }
  }
);


async function handleFill(payload: FillRequest) {
  const inputs = Array.from(document.querySelectorAll("input, textarea, select")) as Element[];
  const filled: string[] = [];

  for (const el of inputs) {
    const key = matchFieldToKey(el);
    if (!key) continue;
    const desired = payload.profile[key];
    if (!desired) continue;

    if (el instanceof HTMLSelectElement) {
      await fillSelect(el, desired);
      filled.push(key);
    } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      await fillText(el, desired);
      filled.push(key);
    }
  }
  // If useAI and there are long-form fields requiring AI (like 'motivation'),
  // the popup/background can request generation and then call content again with generated text.
  return filled;
}
