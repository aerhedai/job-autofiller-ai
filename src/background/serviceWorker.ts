import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Helper Functions ---
async function getApiKey() {
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  if (!apiKey) throw new Error("API key not set. Add it in extension settings.");
  return apiKey;
}

async function logAiInteraction(type: string, prompt: string, response: string) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    prompt,
    response: JSON.parse(response || '{}'),
  };
  
  const { aiLog = [] } = await chrome.storage.local.get("aiLog");
  aiLog.unshift(logEntry);
  
  if (aiLog.length > 50) {
    aiLog.pop();
  }
  
  await chrome.storage.local.set({ aiLog });
}

// **FIXED** to correctly pass the 'type' parameter for logging
async function runAiModel(prompt: string, responseMimeType: "text/plain" | "application/json", type: string) {
  const apiKey = await getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    // **FIXED** Model name to the correct, available version.
    model: "gemini-1.5-flash-latest",
    generationConfig: { responseMimeType }
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const responseText = response.text(); // **FIXED** Defined responseText before using it.

  await logAiInteraction(type, prompt, responseText);
  return responseText;
}


// --- Main AI Logic ---
async function generateLongAnswer(payload: { prompt: string }) {
  const textResponse = await runAiModel(payload.prompt, "text/plain", "generateLongAnswer");
  return textResponse.trim();
}

async function matchFieldsWithAI(payload: { html: string; profile: Record<string, string> }) {
  const prompt = `
    You are an intelligent job application assistant with superior reasoning skills. Your goal is to analyze an HTML form and a user's profile to fill out the application with the highest accuracy.
    First, here is the user's complete profile data, which is your knowledge base:
    \`\`\`json
    ${JSON.stringify(payload.profile, null, 2)}
    \`\`\`
    Next, here is the HTML for the application form. Analyze the entire snippet to understand the relationships between the questions and the overall context before making any decisions.
    \`\`\`html
    ${payload.html}
    \`\`\`
    Your task is to respond ONLY with a valid JSON object that maps the CSS selector of each form field to the most appropriate value from the user's profile.
    **CRITICAL INSTRUCTIONS:**
    1.  **Use Full Context:** Do not evaluate fields in isolation. Use surrounding labels, headings (like "Contact Information" or "Work Eligibility"), and instructional text to understand the precise meaning of each question, especially for vague ones like "Details" or "Background".
    2.  **Make Intelligent Judgments:** If a field asks for "Nationality", use the "nationality" value. If a question is "Do you have the legal right to work here?", use the "rightToWork" value from the profile.
    3.  **Combine Information:** If a field requires a "Full Name", you must combine the "firstName" and "lastName" values from the profile.
    Example Response:
    {
      "input[name='first_name']": "John",
      "#country_dropdown": "United Kingdom"
    }
  `;

  const jsonResponse = await runAiModel(prompt, "application/json", "matchFieldsWithAI");
  return JSON.parse(jsonResponse);
}

async function findBestDropdownMatch(payload: { desiredValue: string; options: string[]; context: string }) {
  const prompt = `
    A user wants to select an option for "${payload.context}". Their desired value is "${payload.desiredValue}".
    From this list: ${JSON.stringify(payload.options)}
    Respond with ONLY the single best-matching option text from the list.
  `;
  // **FIXED** to pass the correct type for logging and expect a text response.
  const textResponse = await runAiModel(prompt, "text/plain", "findBestDropdownMatch");
  return textResponse;
}


// --- Message Listener ---
chrome.runtime.onMessage.addListener(
  (msg: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (msg?.type === "generateLongAnswer") {
        generateLongAnswer(msg.payload)
          .then((text) => sendResponse({ ok: true, text }))
          .catch((err) => sendResponse({ ok: false, error: String(err) }));
        return true;
      }
  
      if (msg?.type === "selectDropdownOption") {
        findBestDropdownMatch(msg.payload)
          .then((bestOption) => sendResponse({ ok: true, bestOption }))
          .catch((err) => sendResponse({ ok: false, error: String(err) }));
        return true;
      }

      if (msg?.type === "matchFieldsWithAI") {
        matchFieldsWithAI(msg.payload)
          .then((mappings) => sendResponse({ ok: true, mappings }))
          .catch((err) => sendResponse({ ok: false, error: String(err) }));
        return true;
      }
  }
);