import type { Profile } from "../shared/types";

const profileSelect = document.getElementById("profileSelect") as HTMLSelectElement;
const fillBtn = document.getElementById("fillBtn") as HTMLButtonElement;
const useAI = document.getElementById("useAI") as HTMLInputElement;
const status = document.getElementById("status") as HTMLDivElement;
const openSettings = document.getElementById("openSettings") as HTMLButtonElement;

async function loadProfiles(): Promise<Profile[]> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["profiles"], (items: Record<string, any>) => {
      resolve((items.profiles ?? []) as Profile[]);
    });
  });
}

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

fillBtn.addEventListener("click", async () => {
  status.textContent = "Analyzing page...";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    status.textContent = "No active tab.";
    return;
  }

  const profId = profileSelect.value;
  const profiles = await loadProfiles();
  const profile = profiles.find((p) => p.id === profId);
  if (!profile) {
    status.textContent = "Select a profile first.";
    return;
  }
  
  // AI long answer generation
  if (useAI.checked) {
    // This logic can be expanded to generate answers for specific long-form questions
    // based on the new detailed profile.
  }

  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
    const frameIds = frames.map(frame => frame.frameId);

    let totalFilled = 0;

    for (const frameId of frameIds) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [frameId] },
        files: ["content/content.js"],
      });

      const response: { ok?: boolean; filled?: string[]; error?: string } = 
        await chrome.tabs.sendMessage(tab.id, 
          { type: "fillForm", payload: { profile: flattenProfileToMap(profile) } }, 
          { frameId: frameId }
        );

      if (response?.ok && response.filled) {
        totalFilled += response.filled.length;
      }
    }

    if (totalFilled > 0) {
        status.textContent = `Successfully filled ${totalFilled} fields.`;
    } else {
        status.textContent = "Could not find any matching fields on this page.";
    }

  } catch (e: any) {
    status.textContent = `Error: ${e.message}`;
    console.error(e);
  }
});

openSettings.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// **THIS IS THE FIX:** The function now includes all the new profile fields.
function flattenProfileToMap(p: Profile): Record<string, string> {
  const map: Record<string, string> = {};
  // Basic Info
  if (p.displayName) map["displayName"] = p.displayName;
  if (p.firstName) map["firstName"] = p.firstName;
  if (p.lastName) map["lastName"] = p.lastName;
  if (p.email) map["email"] = p.email;
  if (p.phone) map["phone"] = p.phone;
  if (p.country) map["country"] = p.country;
  if (p.address) map["address"] = p.address;
  // Professional Info
  if (p.rightToWork) map["rightToWork"] = p.rightToWork;
  if (p.rightToWorkMethod) map["rightToWorkMethod"] = p.rightToWorkMethod;
  if (p.nationality) map["nationality"] = p.nationality;
  if (p.degree) map["degree"] = p.degree;
  if (p.university) map["university"] = p.university;
  // Common Application Questions
  if (p.securityClearance) map["securityClearance"] = p.securityClearance;
  if (p.criminalConvictions) map["criminalConvictions"] = p.criminalConvictions;
  if (p.livedAbroad) map["livedAbroad"] = p.livedAbroad;
  if (p.disability) map["disability"] = p.disability;
  // AI Generated Answers
  if (p.longAnswers) {
    for (const [k, v] of Object.entries(p.longAnswers)) {
      map[k] = v;
    }
  }
  return map;
}