const MODEL_KEY = "y-model";
const MSG_KEY = "y-messages";

const thread = document.getElementById("y-thread");
const form = document.getElementById("y-form");
const input = document.getElementById("y-input");
const sendBtn = document.getElementById("y-send");
const picker = document.getElementById("y-picker");
const pickerBtn = document.getElementById("y-picker-btn");
const pickerName = document.getElementById("y-picker-name");
const pickerMeta = document.getElementById("y-picker-meta");
const pickerMenu = document.getElementById("y-picker-menu");
const attachWrap = document.getElementById("y-attach-wrap");
const imageInput = document.getElementById("y-image");
const imageName = document.getElementById("y-image-name");
const preview = document.getElementById("y-preview");

let models = [];
let modelId = "";
let messages = [];
let pending = false;
let pendingImage = "";

function loadMessages() {
  try {
    messages = JSON.parse(localStorage.getItem(MSG_KEY) || "[]");
    if (!Array.isArray(messages)) messages = [];
  } catch {
    messages = [];
  }
}

function saveMessages() {
  const slim = messages.map(msg => {
    if (typeof msg.content === "string") return msg;
    const text = (msg.content || [])
      .filter(part => part.type === "text")
      .map(part => part.text)
      .join("\n");
    return { role: msg.role, content: text };
  });
  localStorage.setItem(MSG_KEY, JSON.stringify(slim.slice(-24)));
}

function currentModel() {
  return models.find(model => model.id === modelId) || models[0];
}

function imageLabel(images) {
  return images ? "Text + images" : "Text";
}

function updateSend() {
  sendBtn.disabled = pending || (!input.value.trim() && !pendingImage);
}

function setPendingImage(dataUrl) {
  pendingImage = dataUrl || "";
  if (pendingImage) {
    preview.src = pendingImage;
    preview.hidden = false;
    imageName.textContent = "Ready";
  } else {
    preview.removeAttribute("src");
    preview.hidden = true;
    imageName.textContent = "Image";
    imageInput.value = "";
  }
  updateSend();
}

function ensureVisionModel() {
  if (currentModel()?.images) return;
  const vision = models.find(model => model.best && model.images) || models.find(model => model.images);
  if (!vision) return;
  modelId = vision.id;
  localStorage.setItem(MODEL_KEY, modelId);
  syncModelUi();
}

function emptyState() {
  thread.innerHTML = `
    <div class="y-col">
      <div class="y-empty">
        <h1>Ask anything</h1>
        <p>Homework, a definition, or whatever you are stuck on.</p>
      </div>
    </div>`;
}

function addRow(role, text, image, thinking) {
  const empty = thread.querySelector(".y-empty");
  if (empty) thread.innerHTML = `<div class="y-col"></div>`;
  const col = thread.querySelector(".y-col") || thread;
  const row = document.createElement("div");
  row.className = `y-row ${role === "user" ? "y-user" : "y-assistant"}`;
  const bubble = document.createElement("div");
  bubble.className = "y-bubble";
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    bubble.appendChild(img);
  }
  const body = document.createElement("div");
  if (thinking) {
    body.className = "y-think";
    body.innerHTML = `<span class="y-dots"><i></i><i></i><i></i></span> Thinking`;
  } else {
    body.textContent = text;
  }
  bubble.appendChild(body);
  row.appendChild(bubble);
  col.appendChild(row);
  thread.scrollTop = thread.scrollHeight;
  return { row, bubble, body };
}

function renderThread() {
  if (!messages.length) {
    emptyState();
    return;
  }
  thread.innerHTML = `<div class="y-col"></div>`;
  for (const msg of messages) {
    const text = typeof msg.content === "string"
      ? msg.content
      : (msg.content || []).filter(part => part.type === "text").map(part => part.text).join("\n");
    const image = Array.isArray(msg.content)
      ? msg.content.find(part => part.type === "image_url")?.image_url?.url
      : "";
    addRow(msg.role, text, image);
  }
}

function syncModelUi() {
  const model = currentModel();
  if (!model) return;
  pickerName.textContent = model.name;
  pickerMeta.textContent = imageLabel(model.images);
  attachWrap.hidden = !model.images;
  if (!model.images) setPendingImage("");
  pickerMenu.querySelectorAll(".y-opt").forEach(btn => {
    btn.classList.toggle("y-opt-on", btn.dataset.id === model.id);
  });
}

function addModelButton(model) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "y-opt";
  btn.dataset.id = model.id;
  const name = document.createElement("span");
  name.textContent = model.name;
  const tag = document.createElement("span");
  tag.className = "y-opt-tag";
  tag.innerHTML = model.images
    ? `<i class="fa-regular fa-image"></i> Text + images`
    : `<i class="fa-solid fa-align-left"></i> Text`;
  btn.append(name, tag);
  btn.addEventListener("click", () => {
    modelId = model.id;
    localStorage.setItem(MODEL_KEY, modelId);
    picker.classList.remove("y-open");
    pickerMenu.hidden = true;
    syncModelUi();
  });
  pickerMenu.appendChild(btn);
}

function renderPicker() {
  pickerMenu.replaceChildren();
  const best = models.filter(model => model.best);
  const rest = models.filter(model => !model.best);
  if (best.length) {
    const heading = document.createElement("p");
    heading.className = "y-group";
    heading.textContent = "Best";
    pickerMenu.appendChild(heading);
    best.forEach(addModelButton);
  }
  if (rest.length) {
    const heading = document.createElement("p");
    heading.className = "y-group";
    heading.textContent = "More";
    pickerMenu.appendChild(heading);
    rest.forEach(addModelButton);
  }
  syncModelUi();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function deltaText(json) {
  const content = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(part => part.text || "").join("");
  return "";
}

pickerBtn.addEventListener("click", event => {
  event.stopPropagation();
  const open = pickerMenu.hidden;
  pickerMenu.hidden = !open;
  picker.classList.toggle("y-open", open);
});

pickerMenu.addEventListener("click", event => event.stopPropagation());

document.addEventListener("click", () => {
  pickerMenu.hidden = true;
  picker.classList.remove("y-open");
});

imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0];
  if (!file) return;
  ensureVisionModel();
  setPendingImage(await fileToDataUrl(file));
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
  updateSend();
});

async function takePastedImage(event) {
  const file = [...(event.clipboardData?.items || [])]
    .map(item => (item.type.startsWith("image/") ? item.getAsFile() : null))
    .find(Boolean);
  if (!file) return;
  event.preventDefault();
  ensureVisionModel();
  setPendingImage(await fileToDataUrl(file));
}

input.addEventListener("paste", takePastedImage);
form.addEventListener("paste", takePastedImage);

form.addEventListener("dragover", event => {
  event.preventDefault();
});

form.addEventListener("drop", async event => {
  event.preventDefault();
  const file = [...(event.dataTransfer?.files || [])].find(item => item.type.startsWith("image/"));
  if (!file) return;
  ensureVisionModel();
  setPendingImage(await fileToDataUrl(file));
});

input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (pending) return;
  const text = input.value.trim();
  const model = currentModel();
  const image = model?.images ? pendingImage : "";
  if (!text && !image) return;

  const prompt = text || "Look at this image and explain it.";

  messages.push({
    role: "user",
    content: image
      ? [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: image } },
        ]
      : prompt,
  });
  saveMessages();

  addRow("user", prompt, image);
  input.value = "";
  input.style.height = "auto";
  setPendingImage("");
  sendBtn.disabled = true;

  const reply = addRow("assistant", "", "", true);
  pending = true;

  try {
    const res = await fetch("/api/y/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model.id,
        messages: messages.slice(-12),
      }),
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "The model did not answer.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";
    let started = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const token = deltaText(JSON.parse(payload));
          if (!token) continue;
          if (!started) {
            started = true;
            reply.body.className = "";
            reply.body.textContent = "";
          }
          full += token;
          reply.body.textContent = full;
          reply.body.appendChild(Object.assign(document.createElement("span"), { className: "y-caret" }));
          thread.scrollTop = thread.scrollHeight;
        } catch {}
      }
    }
    reply.body.querySelector(".y-caret")?.remove();
    if (!full) reply.body.textContent = "I could not get a reply.";
    messages.push({ role: "assistant", content: full || "I could not get a reply." });
    saveMessages();
  } catch (error) {
    reply.body.className = "";
    reply.body.textContent = error.message || "Something went wrong.";
  } finally {
    pending = false;
    updateSend();
  }
});

sendBtn.disabled = true;
loadMessages();
renderThread();

loadModels().catch(error => {
  thread.innerHTML = `<div class="y-col"><div class="y-empty"><h1>Ask anything</h1><p>${error.message}</p></div></div>`;
});

async function loadModels() {
  const res = await fetch("/api/y/models");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load models");
  models = data.models || [];
  const saved = localStorage.getItem(MODEL_KEY);
  modelId = saved && models.some(model => model.id === saved) ? saved : models[0]?.id || "";
  renderPicker();
}
