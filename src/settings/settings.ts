import type { Profile } from "../shared/types";

document.addEventListener("DOMContentLoaded", () => {
  const showLogBtn = document.getElementById("showLog") as HTMLButtonElement;
  const clearLogBtn = document.getElementById("clearLog") as HTMLButtonElement;
  const aiLogOutput = document.getElementById("aiLogOutput") as HTMLPreElement;
  const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
  const saveApiKeyBtn = document.getElementById("saveApiKey") as HTMLButtonElement;
  const apiKeyStatus = document.getElementById("apiKeyStatus") as HTMLSpanElement;
  
  const profileList = document.getElementById("profileList") as HTMLUListElement;
  const addProfileBtn = document.getElementById("addProfile") as HTMLButtonElement;
  const form = document.getElementById("profileForm") as HTMLFormElement;

  // --- Get handles for all new profile input fields ---
  const displayNameInput = document.getElementById("displayName") as HTMLInputElement;
  const firstNameInput = document.getElementById("firstName") as HTMLInputElement;
  const lastNameInput = document.getElementById("lastName") as HTMLInputElement;
  const emailInput = document.getElementById("email") as HTMLInputElement;
  const phoneInput = document.getElementById("phone") as HTMLInputElement;
  const countryInput = document.getElementById("country") as HTMLInputElement;
  const addressInput = document.getElementById("address") as HTMLInputElement;
  const nationalityInput = document.getElementById("nationality") as HTMLInputElement;
  const rightToWorkInput = document.getElementById("rightToWork") as HTMLInputElement;
  const rightToWorkMethodInput = document.getElementById("rightToWorkMethod") as HTMLInputElement;
  const universityInput = document.getElementById("university") as HTMLInputElement;
  const degreeInput = document.getElementById("degree") as HTMLInputElement;
  const securityClearanceInput = document.getElementById("securityClearance") as HTMLInputElement;
  const criminalConvictionsInput = document.getElementById("criminalConvictions") as HTMLInputElement;
  const livedAbroadInput = document.getElementById("livedAbroad") as HTMLInputElement;
  const disabilityInput = document.getElementById("disability") as HTMLInputElement;

  let profiles: Profile[] = [];

  // --- API Key Logic ---
  function loadApiKey() {
    chrome.storage.sync.get(["apiKey"], (items) => {
      if (items.apiKey) {
        apiKeyInput.value = items.apiKey;
      }
    });
  }

  saveApiKeyBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ apiKey }, () => {
        apiKeyStatus.textContent = "API Key saved!";
        setTimeout(() => { apiKeyStatus.textContent = ""; }, 3000);
      });
    }
  });

  showLogBtn.addEventListener("click", () => {
    chrome.storage.local.get("aiLog", ({ aiLog = [] }) => {
      if (aiLog.length === 0) {
        aiLogOutput.textContent = "Log is empty.";
      } else {
        aiLogOutput.textContent = JSON.stringify(aiLog, null, 2);
      }
    });
  });

  clearLogBtn.addEventListener("click", () => {
    chrome.storage.local.remove("aiLog", () => {
      aiLogOutput.textContent = "Log cleared.";
    });
  });

  // --- Profile Logic ---
  async function loadProfiles() {
    return new Promise<Profile[]>(resolve => {
      chrome.storage.sync.get(["profiles"], (items: Record<string, any>) => {
        profiles = items.profiles ?? [];
        renderProfiles();
        resolve(profiles);
      });
    });
  }

  function saveProfiles() {
    chrome.storage.sync.set({ profiles }, () => console.log("Profiles saved", profiles));
  }

  function renderProfiles() {
    profileList.innerHTML = "";
    profiles.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.displayName;
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => populateForm(p));
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        profiles = profiles.filter(pr => pr.id !== p.id);
        saveProfiles();
        renderProfiles();
      });
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      profileList.appendChild(li);
    });
  }

  // **UPDATED** to populate all new fields when editing
  function populateForm(p: Profile) {
    form.dataset.editingId = p.id;
    displayNameInput.value = p.displayName ?? "";
    firstNameInput.value = p.firstName ?? "";
    lastNameInput.value = p.lastName ?? "";
    emailInput.value = p.email ?? "";
    phoneInput.value = p.phone ?? "";
    countryInput.value = p.country ?? "";
    addressInput.value = p.address ?? "";
    nationalityInput.value = p.nationality ?? "";
    rightToWorkInput.value = p.rightToWork ?? "";
    rightToWorkMethodInput.value = p.rightToWorkMethod ?? "";
    universityInput.value = p.university ?? "";
    degreeInput.value = p.degree ?? "";
    securityClearanceInput.value = p.securityClearance ?? "";
    criminalConvictionsInput.value = p.criminalConvictions ?? "";
    livedAbroadInput.value = p.livedAbroad ?? "";
    disabilityInput.value = p.disability ?? "";
  }

  addProfileBtn.addEventListener("click", () => {
    form.reset();
    delete form.dataset.editingId;
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const id = form.dataset.editingId || crypto.randomUUID();
    const index = profiles.findIndex(p => p.id === id);
    const existingLongAnswers = (index >= 0 ? profiles[index].longAnswers : {}) ?? {};

    // **UPDATED** to save all new fields from the form
    const newProfile: Profile = {
      id,
      displayName: displayNameInput.value,
      firstName: firstNameInput.value,
      lastName: lastNameInput.value,
      email: emailInput.value,
      phone: phoneInput.value,
      country: countryInput.value,
      address: addressInput.value,
      nationality: nationalityInput.value,
      rightToWork: rightToWorkInput.value,
      rightToWorkMethod: rightToWorkMethodInput.value,
      university: universityInput.value,
      degree: degreeInput.value,
      securityClearance: securityClearanceInput.value,
      criminalConvictions: criminalConvictionsInput.value,
      livedAbroad: livedAbroadInput.value,
      disability: disabilityInput.value,
      longAnswers: existingLongAnswers,
    };

    if (index >= 0) {
      profiles[index] = newProfile;
    } else {
      profiles.push(newProfile);
    }

    saveProfiles();
    renderProfiles();
    form.reset();
    delete form.dataset.editingId;
  });

  loadApiKey();
  loadProfiles();
});