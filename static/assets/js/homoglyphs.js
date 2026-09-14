const HOMOGLYPHS = {
  a: "\u0430",
  c: "\u0441",
  e: "\u0435",
  i: "\u0456",
  o: "\u043e",
  p: "\u0440",
  s: "\u0455",
  x: "\u0445",
  y: "\u0443",
  A: "\u0410",
  B: "\u0412",
  C: "\u0421",
  E: "\u0415",
  H: "\u041d",
  I: "\u0406",
  K: "\u041a",
  M: "\u041c",
  O: "\u041e",
  P: "\u0420",
  S: "\u0405",
  T: "\u0422",
  X: "\u0425",
  Y: "\u0423",
};

function homoglyph(text) {
  if (!text) return text;
  return String(text).replace(/[A-Za-z]/g, ch => HOMOGLYPHS[ch] ?? ch);
}

function homoglyphDom(root) {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (
        !parent ||
        parent.tagName === "SCRIPT" ||
        parent.tagName === "STYLE" ||
        parent.closest("[data-no-homoglyph]")
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) node.textContent = homoglyph(node.textContent);

  root.querySelectorAll("[placeholder]").forEach(el => {
    const placeholder = el.getAttribute("placeholder");
    if (placeholder) el.setAttribute("placeholder", homoglyph(placeholder));
  });
}

window.homoglyph = homoglyph;
window.homoglyphDom = homoglyphDom;
