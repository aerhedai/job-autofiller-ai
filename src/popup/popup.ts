import type { Profile } from "../shared/types";

// --- Element Getters ---
const profileSelect = document.getElementById("profileSelect") as HTMLSelectElement;
const fillBtn = document.getElementById("fillBtn") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLDivElement;
const openSettings = document.getElementById("openSettings") as HTMLButtonElement;
const indicator = document.getElementById("indicator") as HTMLDivElement;
const indicatorLight = document.getElementById("indicator-light") as HTMLSpanElement;
const indicatorText = document.getElementById("indicator-text") as HTMLSpanElement;

// --- Helper Functions ---
async function loadProfiles(): Promise<Profile[]> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["profiles"], (items: Record<string, any>) => {
      const profiles = (items.profiles ?? []) as Profile[];
      // **FIX 1:** Populate the dropdown right after loading profiles.
      profileSelect.innerHTML = profiles.length
        ? profiles.map((p) => `<option value="${p.id}">${p.displayName}</option>`).join("")
        : `<option value="">(no profiles)</option>`;
      resolve(profiles);
    });
  });
}

// **FIX 2**: The function now loads profiles first, then scans the page.
async function init() {
  // 1. Load user profiles into the dropdown FIRST.
  await loadProfiles();

  // 2. Now, get the active tab.
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    indicatorText.textContent = "No active tab";
    indicatorLight.style.backgroundColor = 'red';
    return;
  }

  // 3. Inject the content script to ensure it's ready.
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["content/content.js"],
    });
  } catch (e) {
    // This can happen on protected pages like chrome://extensions
    console.warn("Could not inject content script:", e);
    indicatorText.textContent = 'Page protected';
    indicatorLight.style.backgroundColor = 'red';
    fillBtn.disabled = true;
    indicator.classList.remove('indicator-hidden');
    return;
  }


  // 4. Ask the content script to scan the page for fillable forms.
  const response = await chrome.tabs.sendMessage(tab.id, { type: "scanForFields" });

  // 5. Update the UI based on the scan result.
  if (response?.canFill) {
    indicatorLight.style.backgroundColor = 'green';
    indicatorText.textContent = 'Autofill available';
    fillBtn.disabled = false;
  } else {
    indicatorLight.style.backgroundColor = 'red';
    indicatorText.textContent = 'No form found';
    fillBtn.disabled = true;
  }
  indicator.classList.remove('indicator-hidden');
}

// --- Event Listeners ---
fillBtn.addEventListener("click", async () => {
  status.textContent = "Filling form...";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const profId = profileSelect.value;
  // Re-load profiles here to ensure we have the latest data
  const profiles = await loadProfiles(); 
  const profile = profiles.find((p) => p.id === profId);
  if (!profile) {
    status.textContent = "Please select a profile.";
    return;
  }

  // Send the 'fillForm' message to the content script.
  const responses = await chrome.tabs.sendMessage(tab.id, { 
    type: "fillForm", 
    payload: { profile: flattenProfileToMap(profile) } 
  });
  
  // Aggregate results from all frames
  const totalFilled = responses.reduce((acc: number, res: any) => acc + (res?.filled?.count || 0), 0);

  if (totalFilled > 0) {
    status.textContent = `Successfully filled ${totalFilled} fields.`;
  } else {
    status.textContent = 'Could not fill any fields.';
  }
});

openSettings.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

function flattenProfileToMap(p: Profile): Record<string, string> {
  const map: Record<string, string> = {};
  if (p.displayName) map["displayName"] = p.displayName;
  if (p.firstName) map["firstName"] = p.firstName;
  if (p.lastName) map["lastName"] = p.lastName;
  if (p.email) map["email"] = p.email;
  if (p.phone) map["phone"] = p.phone;
  if (p.country) map["country"] = p.country;
  if (p.address) map["address"] = p.address;
  if (p.rightToWork) map["rightToWork"] = p.rightToWork;
  if (p.rightToWorkMethod) map["rightToWorkMethod"] = p.rightToWorkMethod;
  if (p.nationality) map["nationality"] = p.nationality;
  if (p.degree) map["degree"] = p.degree;
  if (p.university) map["university"] = p.university;
  if (p.securityClearance) map["securityClearance"] = p.securityClearance;
  if (p.criminalConvictions) map["criminalConvictions"] = p.criminalConvictions;
  if (p.livedAbroad) map["livedAbroad"] = p.livedAbroad;
  if (p.disability) map["disability"] = p.disability;
  if (p.longAnswers) {
    for (const [k, v] of Object.entries(p.longAnswers)) {
      map[k] = v;
    }
  }
  return map;
}

// Run the initialization logic when the script loads
init();