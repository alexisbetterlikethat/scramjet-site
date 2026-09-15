const SKIP = /embed|rerank|whisper|tts|moderation|safety|lyria|clip-preview|vocals|wav2vec|kokoro|speech/i;

export function openRouterKey() {
  return String(process.env.AIKEY || "").trim();
}

function isChatModel(model) {
  const id = `${model.id || ""} ${model.name || ""}`;
  if (SKIP.test(id)) return false;
  const arch = model.architecture || {};
  const output = arch.output_modalities || [];
  const modality = String(arch.modality || "");
  if (/embedding|rerank/i.test(modality)) return false;
  if (output.length && !output.includes("text")) return false;
  if (modality && !/->\s*text/i.test(modality) && output.length === 0) return false;
  return true;
}

function isZeroPrice(model) {
  const id = String(model.id || "");
  if (id.endsWith(":free") || id === "openrouter/free") return true;
  const p = model.pricing || {};
  return String(p.prompt) === "0" && String(p.completion) === "0";
}

function supportsImages(model) {
  const arch = model.architecture || {};
  const input = arch.input_modalities || [];
  if (input.includes("image")) return true;
  return /\+?\s*image/i.test(String(arch.modality || "")) && /->\s*text/i.test(String(arch.modality || ""));
}

const BEST_IDS = new Set([
  "openrouter/free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nex-agi/nex-n2.5-pro:free",
  "thinkingmachines/inkling:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
]);

function displayName(model) {
  if (model.id === "openrouter/free") return "Auto";
  const name = String(model.name || model.id || "Model")
    .replace(/\s*\(free\)\s*/gi, " ")
    .replace(/\bfree\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return name || String(model.id || "Model");
}

export function publicModel(model) {
  return {
    id: model.id,
    name: displayName(model),
    images: supportsImages(model),
    best: BEST_IDS.has(model.id) || model.id === "openrouter/free",
  };
}

let cache = { at: 0, models: [] };

export async function listChatModels() {
  if (Date.now() - cache.at < 30 * 60 * 1000 && cache.models.length) return cache.models;
  const headers = {};
  const key = openRouterKey();
  if (key) headers.Authorization = `Bearer ${key}`;
  const res = await fetch("https://openrouter.ai/api/v1/models", { headers });
  if (!res.ok) throw new Error("Could not load models");
  const body = await res.json();
  const models = (body.data || [])
    .filter(isZeroPrice)
    .filter(isChatModel)
    .map(publicModel)
    .sort((a, b) => {
      if (a.id === "openrouter/free") return -1;
      if (b.id === "openrouter/free") return 1;
      if (a.best !== b.best) return a.best ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  cache = { at: Date.now(), models };
  return models;
}

export const SYSTEM_PROMPT = `You are a careful tutor and general-knowledge assistant for students.

Help with homework by explaining the idea in plain language, showing the steps, and checking the answer. For everyday questions, answer clearly first, then add a short extra only if it helps.

If the user sends an image, read it carefully (text, diagrams, worksheets, screenshots) and answer the question about it. Combine the image with their text.

Write math in LaTeX so it can be rendered with KaTeX. Always wrap math: \\( and \\) for inline, \\[ and \\] for bigger equations. Example: \\(5050^{4} = 650{,}377{,}506{,}250{,}000\\). Put thousand separators in braces as {,}. Never leave raw \\( without closing \\), and never dump a long unformatted digit string.

Keep a calm, respectful tone. Do not use vulgar, sexual, or abusive language, and do not repeat it if the user uses it. If they swear or ask for sexual content, refuse that part and offer to continue on the actual school or general question.

Do not help with crimes, weapons, or harming people. If you are unsure, say so and walk through what you do know.`;

const VULGAR = /\b(fuck|shit|bitch|asshole|cunt|nigger|nigga|faggot|retard|whore|slut|porn|dick|pussy|cock|blowjob|handjob)\b/i;

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(part => part?.type === "text")
    .map(part => part.text || "")
    .join("\n");
}

function sanitizeContent(content, allowImages) {
  if (typeof content === "string") return content.slice(0, 8000);
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const part of content) {
    if (part?.type === "text" && typeof part.text === "string") {
      parts.push({ type: "text", text: part.text.slice(0, 8000) });
    } else if (allowImages && part?.type === "image_url") {
      const url = String(part.image_url?.url || "");
      if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(url) && url.length < 2_800_000) {
        parts.push({ type: "image_url", image_url: { url } });
      }
    }
  }
  if (!parts.length) return "";
  if (parts.length === 1 && parts[0].type === "text") return parts[0].text;
  return parts;
}

export function sanitizeMessages(raw, allowImages) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const msg of list.slice(-12)) {
    if (msg?.role !== "user" && msg?.role !== "assistant") continue;
    const content = sanitizeContent(msg.content, allowImages && msg.role === "user");
    if (!content) continue;
    out.push({ role: msg.role, content });
  }
  return out;
}

export function isVulgar(messages) {
  const latest = [...messages].reverse().find(msg => msg.role === "user");
  return latest ? VULGAR.test(textOf(latest.content)) : false;
}
