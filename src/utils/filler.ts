function triggerInputEvents(el: HTMLElement) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export async function fillText(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  // set value and trigger events; simulate typing for frameworks if needed
  try {
    el.focus();
    // Optionally: simulate typing character-by-character for tricky frameworks
    el.value = value;
    triggerInputEvents(el);
    el.blur();
  } catch (err) {
    console.warn("fillText failed", err);
  }
}

export async function fillSelect(el: HTMLSelectElement, desired: string) {
  const option = Array.from(el.options).find(
    o => o.value.toLowerCase() === desired.toLowerCase() || o.text.toLowerCase() === desired.toLowerCase()
  );
  if (option) {
    el.value = option.value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    // fallback: choose first or leave unchanged
  }
}