import type { Profile } from "../shared/types";

const profileSelect = document.getElementById("profileSelect") as HTMLSelectElement;
const fillBtn = document.getElementById("fillBtn") as HTMLButtonElement;
const useAI = document.getElementById("useAI") as HTMLInputElement;
const status = document.getElementById("status") as HTMLDivElement;
const openSettings = document.getElementById("openSettings") as HTMLButtonElement;

// Load profiles from chrome.storage.sync
async function loadProfiles(): Promise<Profile[]> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["profiles"], (items: Record<string, any>) => {
      const profiles = (items.profiles ?? []) as Profile[];
      resolve(profiles);
    });
  });
}

// Initialize popup dropdown
async function init() {
  const profiles = await loadProfiles();
  if (!profiles.length) {
    profileSelect.innerHTML = `<option value="">(no profiles) - open settings</option>`;
  } else {
    profileSelect.innerHTML = profiles
      .map((p) => `<option value="${p.id}">${p.displayName}</option>`)
      .join("");
  }
}
init();

// Click handler for autofill
fillBtn.addEventListener("click", async () => {
  status.textContent = "Sending fill request…";

  const profId = profileSelect.value;
  const profiles = await loadProfiles();
  const profile = profiles.find((p) => p.id === profId);

  if (!profile) {
    status.textContent = "Select a profile first.";
    return;
  }

  // If AI is enabled, generate long-form answers
  if (useAI.checked) {
    try {
      status.textContent = "Generating long answers with AI…";

      const prompt = `Write a 150-word motivation statement for a ${profile.degree ?? "graduate"} role. Background: ${profile.displayName}, ${profile.degree ?? ""}`;

      const aiResp = await new Promise<{ ok: boolean; text?: string }>((resolve) => {
        chrome.runtime.sendMessage(
            { type: "generateLongAnswer", payload: { prompt, profile } },
            undefined, // options (none)
            (resp) => resolve(resp as { ok: boolean; text?: string })
        );
        });


      if (aiResp?.ok && aiResp.text) {
        profile.longAnswers = profile.longAnswers ?? {};
        profile.longAnswers["motivation"] = aiResp.text;
      } else {
        console.warn("AI generation failed", aiResp);
      }
    } catch (err) {
      console.error(err);
      status.textContent = "AI generation failed.";
    }
  }

  // Send profile to content script to fill the form
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    status.textContent = "No active tab.";
    return;
  }

  chrome.tabs.sendMessage(
  tab.id,
  { type: "fillForm", payload: { profile: flattenProfileToMap(profile), useAI: useAI.checked } },
  undefined, // options
  (resp: { ok?: boolean; filled?: string[]; error?: string }) => {
    if (resp?.ok) {
      status.textContent = `Filled: ${resp.filled?.length ?? 0} fields.`;
    } else {
      status.textContent = `Fill failed: ${resp?.error ?? "unknown"}`;
    }
  }
);


// Open extension settings page
openSettings.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// Convert Profile object into a simple key-value map for content script
function flattenProfileToMap(p: Profile): Record<string, string> {
  const map: Record<string, string> = {};
  if (p.displayName) map["name"] = p.displayName;
  if (p.email) map["email"] = p.email;
  if (p.phone) map["phone"] = p.phone;
  if (p.country) map["country"] = p.country;
  if (p.address) map["address"] = p.address;
  if (p.rightToWork) map["rightToWork"] = p.rightToWork;
  if (p.degree) map["degree"] = p.degree;
  if (p.longAnswers) {
    for (const [k, v] of Object.entries(p.longAnswers)) {
      map[k] = v;
    }
  }
  return map;
}})