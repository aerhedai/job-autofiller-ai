const KEYWORDS: Record<string, string[]> = {
  name: ["name", "full name", "surname", "first name", "lastname"],
  email: ["email", "e-mail"],
  phone: ["phone", "telephone", "mobile"],
  address: ["address"],
  country: ["country", "nationality"],
  rightToWork: ["right to work", "work permit", "visa"],
  degree: ["degree", "subject", "qualification"],
  motivation: ["motivat", "why are you", "why do you want", "cover letter", "personal statement", "why applying"],
  interests: ["interest", "interests"],
  summary: ["summary", "profile", "about me", "cv summary"]
};

function textNormalize(s: string | null | undefined) {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function matchFieldToKey(el: Element): string | null {
  const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  const attrs = [
    input.getAttribute("name"),
    input.getAttribute("id"),
    (input as HTMLElement).getAttribute("placeholder"),
    (input as HTMLElement).getAttribute("aria-label")
  ].map(textNormalize);

  // find accessible label text
  let labelText = "";
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) labelText = textNormalize(label.textContent || "");
  }
  // try parent text
  if (!labelText) {
    const parent = input.parentElement;
    labelText = parent ? textNormalize(parent.textContent || "") : "";
  }

  const all = [...attrs, labelText].join(" ");

  for (const [key, kws] of Object.entries(KEYWORDS)) {
    for (const kw of kws) {
      if (all.includes(kw)) return key;
    }
  }
  return null;
}