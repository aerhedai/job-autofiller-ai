chrome.runtime.onMessage.addListener(
  (msg: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (msg?.type === "generateLongAnswer") {
      generateLongAnswer(msg.payload)
        .then((text) => sendResponse({ ok: true, text }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true; // required to keep channel open for async response
    }
  }
);


async function generateLongAnswer(payload: {prompt: string, profile: any}) {
  // Fetch API key from storage (user must set it via UI).
  const { apiKey } = await new Promise<{ apiKey?: string }>((res) =>
    chrome.storage.sync.get(["apiKey"], (items) => res(items as any))
  );

  if (!apiKey) throw new Error("API key not set. Add it in extension settings.");

  // Example OpenAI call (replace with your provider)
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // change as desired
      messages: [{ role: "system", content: "You are a helpful assistant that writes concise application motivation statements." },
                 { role: "user", content: payload.prompt }]
    })
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI API failed: ${t}`);
  }
  const json = await resp.json();
  // adapt to provider's response shape:
  const text = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text ?? "";
  return text.trim();
}
