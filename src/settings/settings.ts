import type { Profile } from "../shared/types";

document.addEventListener("DOMContentLoaded", () => {
  const profileList = document.getElementById("profileList") as HTMLUListElement;
  const addProfileBtn = document.getElementById("addProfile") as HTMLButtonElement;
  const form = document.getElementById("profileForm") as HTMLFormElement;

  const displayNameInput = document.getElementById("displayName") as HTMLInputElement;
  const emailInput = document.getElementById("email") as HTMLInputElement;
  const phoneInput = document.getElementById("phone") as HTMLInputElement;
  const countryInput = document.getElementById("country") as HTMLInputElement;
  const addressInput = document.getElementById("address") as HTMLInputElement;
  const rightToWorkInput = document.getElementById("rightToWork") as HTMLInputElement;
  const degreeInput = document.getElementById("degree") as HTMLInputElement;

  let profiles: Profile[] = [];

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

  function populateForm(p: Profile) {
    displayNameInput.value = p.displayName ?? "";
    emailInput.value = p.email ?? "";
    phoneInput.value = p.phone ?? "";
    countryInput.value = p.country ?? "";
    addressInput.value = p.address ?? "";
    rightToWorkInput.value = p.rightToWork ?? "";
    degreeInput.value = p.degree ?? "";
    form.dataset.editingId = p.id;
  }

  addProfileBtn.addEventListener("click", () => {
    form.reset();
    delete form.dataset.editingId;
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const id = form.dataset.editingId || crypto.randomUUID();
    const newProfile: Profile = {
      id,
      displayName: displayNameInput.value,
      email: emailInput.value,
      phone: phoneInput.value,
      country: countryInput.value,
      address: addressInput.value,
      rightToWork: rightToWorkInput.value,
      degree: degreeInput.value,
      longAnswers: {}
    };

    const index = profiles.findIndex(p => p.id === id);
    if (index >= 0) profiles[index] = newProfile;
    else profiles.push(newProfile);

    saveProfiles();
    renderProfiles();
    form.reset();
    delete form.dataset.editingId;
  });

  loadProfiles();
});
