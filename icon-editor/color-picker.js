// 圖示編輯器 V1.3：色彩選擇器 / 螢幕滴管 / 圖片取色
(() => {
  if (typeof state === "undefined" || typeof renderPreview !== "function") return;

  const targetMap = {
    bgColor: { label: "背景顏色", color: "#bgColor", hex: "#bgHex" },
    iconColor: { label: "圖示顏色", color: "#iconColor", hex: "#iconHex" },
    borderColor: { label: "外框顏色", color: "#borderColor", hex: "#borderHex" }
  };

  let pickerTarget = "bgColor";
  let loadedImage = null;

  function showToast(msg) {
    if (typeof toast === "function") toast(msg);
  }

  function normalizeHex(hex) {
    let v = String(hex || "").trim().toUpperCase();
    if (!v.startsWith("#")) v = "#" + v;
    if (/^#[0-9A-F]{6}$/.test(v)) return v;
    if (/^#[0-9A-F]{3}$/.test(v)) return "#" + v.slice(1).split("").map(x => x + x).join("");
    return null;
  }

  function applyColor(key, hex) {
    const value = normalizeHex(hex);
    const cfg = targetMap[key];
    if (!value || !cfg) return false;

    state[key] = value;
    const colorInput = document.querySelector(cfg.color);
    const hexInput = document.querySelector(cfg.hex);
    if (colorInput) colorInput.value = value;
    if (hexInput) hexInput.value = value;
    renderPreview();
    updatePickerPreview(value);
    return true;
  }

  function currentTargetColor() {
    return normalizeHex(state[pickerTarget]) || "#000000";
  }

  function updatePickerPreview(hex) {
    const value = normalizeHex(hex) || currentTargetColor();
    const swatch = document.querySelector("#cpSelectedSwatch");
    const input = document.querySelector("#cpSelectedHex");
    if (swatch) swatch.style.background = value;
    if (input) input.value = value;
  }

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .cp-toolbar-btn{white-space:nowrap}
      .cp-modal-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(17,24,39,.42);display:none;align-items:center;justify-content:center;padding:20px}
      .cp-modal-backdrop.open{display:flex}
      .cp-modal{width:min(760px,96vw);max-height:92vh;overflow:auto;background:#fff;border:1px solid #dfe3e8;border-radius:16px;box-shadow:0 25px 80px rgba(0,0,0,.24)}
      .cp-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #e7ebef}
      .cp-head h3{margin:0;font-size:16px}
      .cp-close{border:0;background:transparent;font-size:22px;line-height:1;padding:4px 7px;color:#6b7280}
      .cp-body{padding:16px}
      .cp-row{display:grid;grid-template-columns:100px 1fr;gap:10px;align-items:center;margin-bottom:12px}
      .cp-row>label{font-size:12px;color:#4b5563;font-weight:600}
      .cp-select,.cp-hex{width:100%;border:1px solid #dfe3e8;border-radius:8px;padding:8px 9px;background:#fff}
      .cp-current{display:grid;grid-template-columns:42px 1fr auto;gap:8px;align-items:center}
      .cp-swatch{height:34px;border:1px solid #dfe3e8;border-radius:8px;background:#2563EB}
      .cp-action{border:1px solid #dfe3e8;background:#fff;border-radius:8px;padding:8px 10px;cursor:pointer}
      .cp-action:hover{background:#f8fafc}
      .cp-action.primary{background:#2563eb;border-color:#2563eb;color:#fff}
      .cp-action.primary:hover{filter:brightness(.97)}
      .cp-actions{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}
      .cp-help{font-size:11px;color:#6b7280;line-height:1.55;margin:4px 0 12px}
      .cp-canvas-wrap{display:none;border:1px solid #dfe3e8;border-radius:12px;background:#f8fafc;padding:10px;overflow:auto;max-height:48vh;text-align:center}
      .cp-canvas-wrap.open{display:block}
      #cpCanvas{max-width:100%;height:auto;cursor:crosshair;box-shadow:0 4px 16px rgba(0,0,0,.08);background:#fff}
      .cp-sample-info{display:none;margin-top:9px;font-size:12px;color:#4b5563;text-align:left}
      .cp-sample-info.open{display:block}
      .cp-sample-chip{display:inline-flex;align-items:center;gap:6px}
      .cp-sample-dot{width:16px;height:16px;border-radius:4px;border:1px solid #cbd5e1}
      .cp-presets{display:grid;grid-template-columns:repeat(10,1fr);gap:7px;margin-top:6px}
      .cp-preset{height:28px;border:1px solid rgba(0,0,0,.12);border-radius:7px;cursor:pointer}
      .cp-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid #e7ebef}
      .cp-eyedropper-inline{margin-left:6px;border:1px solid #dfe3e8;background:#fff;border-radius:7px;width:34px;height:34px;padding:0;display:inline-grid;place-items:center;cursor:pointer}
      .cp-eyedropper-inline:hover{background:#f8fafc}
      .color-field.cp-enhanced{grid-template-columns:40px 1fr 34px}
      @media(max-width:640px){.cp-row{grid-template-columns:1fr}.cp-presets{grid-template-columns:repeat(5,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function buildModal() {
    const modal = document.createElement("div");
    modal.className = "cp-modal-backdrop";
    modal.id = "cpModal";
    modal.innerHTML = `
      <div class="cp-modal" role="dialog" aria-modal="true" aria-labelledby="cpTitle">
        <div class="cp-head">
          <h3 id="cpTitle">🎨 色彩選擇器</h3>
          <button class="cp-close" id="cpClose" type="button" aria-label="關閉">×</button>
        </div>
        <div class="cp-body">
          <div class="cp-row">
            <label for="cpTarget">套用到</label>
            <select id="cpTarget" class="cp-select">
              <option value="bgColor">背景顏色</option>
              <option value="iconColor">圖示顏色</option>
              <option value="borderColor">外框顏色</option>
            </select>
          </div>

          <div class="cp-row">
            <label>目前顏色</label>
            <div class="cp-current">
              <div id="cpSelectedSwatch" class="cp-swatch"></div>
              <input id="cpSelectedHex" class="cp-hex" type="text" value="#2563EB" maxlength="7">
              <button id="cpApplyHex" class="cp-action" type="button">套用</button>
            </div>
          </div>

          <div class="cp-row">
            <label>快速色票</label>
            <div class="cp-presets" id="cpPresets"></div>
          </div>

          <div class="cp-actions">
            <button id="cpEyeDropper" class="cp-action primary" type="button">◉ 螢幕滴管取色</button>
            <button id="cpLoadImage" class="cp-action" type="button">🖼 從圖片取色</button>
            <input id="cpImageInput" type="file" accept="image/*" hidden>
          </div>
          <div class="cp-help" id="cpHelp">Chrome / Edge 可使用螢幕滴管；Firefox 可使用「從圖片取色」，載入圖片後直接點選想要的顏色。</div>

          <div id="cpCanvasWrap" class="cp-canvas-wrap">
            <canvas id="cpCanvas"></canvas>
            <div id="cpSampleInfo" class="cp-sample-info">
              取樣：<span class="cp-sample-chip"><span id="cpSampleDot" class="cp-sample-dot"></span><strong id="cpSampleHex">—</strong></span>
            </div>
          </div>
        </div>
        <div class="cp-footer">
          <button id="cpDone" class="cp-action primary" type="button">完成</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const presetColors = [
      "#FFFFFF", "#000000", "#6B7280", "#EF4444", "#F97316",
      "#F59E0B", "#22C55E", "#06C755", "#229ED9", "#2563EB",
      "#5865F2", "#8B5CF6", "#EC4899", "#25D366", "#07C160",
      "#168AFF", "#0EA5E9", "#14B8A6", "#84CC16", "#A855F7"
    ];
    document.querySelector("#cpPresets").innerHTML = presetColors.map(c =>
      `<button type="button" class="cp-preset" data-color="${c}" title="${c}" style="background:${c}"></button>`
    ).join("");
  }

  function openModal(targetKey) {
    if (targetKey && targetMap[targetKey]) pickerTarget = targetKey;
    const target = document.querySelector("#cpTarget");
    if (target) target.value = pickerTarget;
    updatePickerPreview(currentTargetColor());
    document.querySelector("#cpModal")?.classList.add("open");
  }

  function closeModal() {
    document.querySelector("#cpModal")?.classList.remove("open");
  }

  async function useEyeDropper(targetKey = pickerTarget) {
    pickerTarget = targetKey;
    if (!("EyeDropper" in window)) {
      showToast("此瀏覽器不支援螢幕滴管，請使用「從圖片取色」");
      openModal(targetKey);
      return;
    }
    try {
      const result = await new EyeDropper().open();
      if (result?.sRGBHex) {
        applyColor(targetKey, result.sRGBHex);
        showToast(`${targetMap[targetKey].label}已套用 ${result.sRGBHex.toUpperCase()}`);
      }
    } catch (err) {
      if (err?.name !== "AbortError") showToast("取色失敗，請再試一次");
    }
  }

  function addToolbarButton() {
    const toolbar = document.querySelector(".toolbar");
    if (!toolbar || document.querySelector("#cpToolbarBtn")) return;
    const btn = document.createElement("button");
    btn.className = "btn cp-toolbar-btn";
    btn.id = "cpToolbarBtn";
    btn.type = "button";
    btn.textContent = "🎨 色彩選擇器";
    btn.addEventListener("click", () => openModal("bgColor"));
    const swapBtn = document.querySelector("#swapBtn");
    if (swapBtn) toolbar.insertBefore(btn, swapBtn);
    else toolbar.prepend(btn);
  }

  function addInlineEyeDroppers() {
    Object.entries(targetMap).forEach(([key, cfg]) => {
      const colorInput = document.querySelector(cfg.color);
      const field = colorInput?.closest(".color-field");
      if (!field || field.querySelector(`[data-cp-target="${key}"]`)) return;
      field.classList.add("cp-enhanced");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cp-eyedropper-inline";
      btn.dataset.cpTarget = key;
      btn.title = `${cfg.label}：滴管取色`;
      btn.setAttribute("aria-label", `${cfg.label}滴管取色`);
      btn.textContent = "◉";
      btn.addEventListener("click", () => useEyeDropper(key));
      field.appendChild(btn);
    });
  }

  function bindEvents() {
    document.querySelector("#cpClose")?.addEventListener("click", closeModal);
    document.querySelector("#cpDone")?.addEventListener("click", closeModal);
    document.querySelector("#cpModal")?.addEventListener("click", e => {
      if (e.target.id === "cpModal") closeModal();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && document.querySelector("#cpModal")?.classList.contains("open")) closeModal();
    });

    document.querySelector("#cpTarget")?.addEventListener("change", e => {
      pickerTarget = e.target.value;
      updatePickerPreview(currentTargetColor());
    });

    document.querySelector("#cpApplyHex")?.addEventListener("click", () => {
      const input = document.querySelector("#cpSelectedHex");
      if (!applyColor(pickerTarget, input?.value)) {
        showToast("HEX 顏色格式不正確");
        updatePickerPreview(currentTargetColor());
      }
    });

    document.querySelector("#cpSelectedHex")?.addEventListener("keydown", e => {
      if (e.key === "Enter") document.querySelector("#cpApplyHex")?.click();
    });

    document.querySelectorAll(".cp-preset").forEach(btn => {
      btn.addEventListener("click", () => {
        applyColor(pickerTarget, btn.dataset.color);
        showToast(`${targetMap[pickerTarget].label}已套用 ${btn.dataset.color}`);
      });
    });

    document.querySelector("#cpEyeDropper")?.addEventListener("click", () => useEyeDropper(pickerTarget));
    document.querySelector("#cpLoadImage")?.addEventListener("click", () => document.querySelector("#cpImageInput")?.click());

    document.querySelector("#cpImageInput")?.addEventListener("change", e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        loadedImage = img;
        const canvas = document.querySelector("#cpCanvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const maxSide = 1800;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        document.querySelector("#cpCanvasWrap")?.classList.add("open");
        document.querySelector("#cpSampleInfo")?.classList.remove("open");
        showToast("圖片已載入，請點選要取樣的顏色");
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        showToast("圖片讀取失敗");
      };
      img.src = url;
      e.target.value = "";
    });

    document.querySelector("#cpCanvas")?.addEventListener("click", e => {
      const canvas = e.currentTarget;
      if (!loadedImage || !canvas.width || !canvas.height) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(canvas.width - 1, Math.floor((e.clientX - rect.left) * canvas.width / rect.width)));
      const y = Math.max(0, Math.min(canvas.height - 1, Math.floor((e.clientY - rect.top) * canvas.height / rect.height)));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
      if (a === 0) {
        showToast("選到透明區域，請點其他位置");
        return;
      }
      const hex = "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
      applyColor(pickerTarget, hex);
      const dot = document.querySelector("#cpSampleDot");
      const text = document.querySelector("#cpSampleHex");
      if (dot) dot.style.background = hex;
      if (text) text.textContent = `${hex} · RGB(${r}, ${g}, ${b})`;
      document.querySelector("#cpSampleInfo")?.classList.add("open");
    });
  }

  addStyles();
  buildModal();
  addToolbarButton();
  addInlineEyeDroppers();
  bindEvents();
  document.title = "圖示編輯器 V1.3";
})();