import { fillText, fillSelect } from "../utils/filler";

// Helper function to check if an element is visible to the user
function isVisible(el: Element): boolean {
    if (!(el instanceof HTMLElement)) return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener(
  (msg: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    // **NEW:** Responds to the popup's scan request.
    if (msg.type === "scanForFields") {
      const visibleInputs = Array.from(document.querySelectorAll('input, textarea, select')).filter(isVisible);
      // A simple, fast check: if we find at least 3 visible inputs, we report that the page is fillable.
      sendResponse({ canFill: visibleInputs.length >= 3 });
      return true;
    }

    // Responds to the popup's fill request.
    if (msg.type === "fillForm") {
      handleFill(msg.payload.profile).then(filledResult => {
        sendResponse({ ok: true, filled: filledResult });
      });
      return true;
    }
  }
);

// --- Non-AI Form Filling Logic ---
async function handleFill(profile: Record<string, string>): Promise<{ count: number, details: string[] }> {
  const allInputs = Array.from(document.querySelectorAll('input, textarea, select')).filter(isVisible);
  const filledDetails: string[] = [];

  for (const el of allInputs) {
    const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    
    // Create a text string to search for keywords, including the element's label and attributes.
    const label = document.querySelector(`label[for="${input.id}"]`)?.textContent || '';
    const textToSearch = (label + " " + (input.parentElement?.textContent || "") + " " + input.name + " " + input.id).toLowerCase();

    for (const key in profile) {
      // Simple keyword matching (can be expanded)
      if (textToSearch.includes(key.toLowerCase())) {
        const value = profile[key];
        
        if (input instanceof HTMLSelectElement) {
          await fillSelect(input, value);
        } else if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
          await fillText(input, value);
        }
        
        filledDetails.push(`Filled '${key}'`);
        break; // Move to the next element once a match is found and filled.
      }
    }
  }

  return { count: filledDetails.length, details: filledDetails };
}