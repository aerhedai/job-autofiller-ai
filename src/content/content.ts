import { fillText, fillSelect } from "../utils/filler";

type FillRequest = {
  profile: Record<string,string>;
};

function isVisible(el: Element): boolean {
    if (!(el instanceof HTMLElement)) return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

chrome.runtime.onMessage.addListener(
  (msg: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (msg?.type === "fillForm") {
      const visibleInputs = Array.from(document.querySelectorAll('input, textarea, select')).filter(isVisible);
      if (visibleInputs.length < 3) {
          sendResponse({ ok: true, filled: [] });
          return;
      }

      handleFill(msg.payload, visibleInputs)
        .then(result => sendResponse({ ok: true, filled: result }))
        .catch(err => sendResponse({ ok: false, error: String(err) }));
      return true;
    }
  }
);

async function directFill(profile: Record<string, string>, inputs: Element[], filledFields: Set<string>): Promise<string[]> {
    const filled: string[] = [];
    inputs.forEach(el => {
      const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const attrsToSearch = [input.name, input.id, input.getAttribute('aria-label'), input.autocomplete]
        .filter(Boolean)
        .map(s => s!.toLowerCase());
  
      for (const key of Object.keys(profile)) {
        if (filledFields.has(key)) continue;
        if (attrsToSearch.some(attr => attr.includes(key.toLowerCase()))) {
          const value = profile[key];
          if (input instanceof HTMLSelectElement) {
            fillSelect(input, value);
          } else {
            fillText(input as HTMLInputElement | HTMLTextAreaElement, value);
          }
          filled.push(key);
          filledFields.add(key);
          break;
        }
      }
    });
    return filled.map(f => `${f} (direct)`);
}


async function handleFill(payload: FillRequest, visibleInputs: Element[]) {
  const filledFields = new Set<string>();
  const directFilled = await directFill(payload.profile, visibleInputs, filledFields);

  let aiFilled: string[] = [];
  const profileFieldCount = Object.keys(payload.profile).length;

  if (filledFields.size < profileFieldCount / 2 && profileFieldCount > 2) {
    let commonAncestor = visibleInputs[0]?.parentElement;
    if (commonAncestor) {
        visibleInputs.forEach(input => {
            while (commonAncestor && !commonAncestor.contains(input)) {
                commonAncestor = commonAncestor.parentElement;
            }
        });
    }
    const formHtml = commonAncestor?.outerHTML || document.body.outerHTML;

    const aiResponse = await chrome.runtime.sendMessage({
      type: "matchFieldsWithAI",
      payload: { html: formHtml.substring(0, 100000), profile: payload.profile }
    });

    if (!aiResponse?.ok || !aiResponse.mappings) {
      console.warn(`AI field matching failed: ${aiResponse?.error ?? "No mappings"}`);
    } else {
      // **THIS IS THE FIX:** The script now handles the simple { selector: value } format.
      const mappings: Record<string, string> = aiResponse.mappings;
      for (const [selector, value] of Object.entries(mappings)) {
        if (!value) continue; // Don't try to fill null or empty values from the AI

        const el = document.querySelector(selector) as HTMLElement;
        if (!el) continue;

        if (el instanceof HTMLSelectElement) {
          await fillSelect(el, value);
          aiFilled.push(`${selector} (AI Select)`);
        } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          await fillText(el, value);
aiFilled.push(`${selector} (AI)`);
        }
      }
    }
  }

  return [...directFilled, ...aiFilled];
}