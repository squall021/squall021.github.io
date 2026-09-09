// 圖示編輯器 V1.2：常用通訊軟體品牌圖示
(() => {
  const brandIcons = [
    {id:"line",name:"LINE",category:"通訊軟體",keywords:"LINE line 通訊 聊天 即時通訊",defaultBg:"#06C755",defaultIconColor:"#FFFFFF",defaultShape:"rounded",viewBox:"0 0 24 24",svg:`<path d="M12 3C6.5 3 2 6.7 2 11.3c0 4.1 3.5 7.5 8.3 8.2.3.1.8.3.9.7.1.4.1 1 .1 1.4 0 .3.2.5.5.3.5-.2 2.8-1.7 4-2.9 5.1-.5.5-.2.4.1.4.1 0 .9-.2 1-.2 4.5-.7 7.9-4 7.9-8.2C22 6.7 17.5 3 12 3Z" fill="currentColor"/><text x="12" y="13.4" text-anchor="middle" font-size="5.3" font-weight="800" font-family="Arial,sans-serif" fill="#06C755">LINE</text>`},
    {id:"wechat",name:"WeChat",category:"通訊軟體",keywords:"WECHAT wechat 微信 通訊 聊天 即時通訊",defaultBg:"#07C160",defaultIconColor:"#FFFFFF",defaultShape:"rounded",viewBox:"0 0 24 24",svg:`<path d="M9.4 5C5.3 5 2 7.6 2 10.8c0 1.8 1 3.4 2.7 4.5l-.7 2.1 2.5-1.2c.9.3 1.8.5 2.9.5.3 0 .7 0 1-.1-.4-.7-.6-1.5-.6-2.3 0-3.2 3-5.8 6.8-5.8h.4C16 6.4 12.9 5 9.4 5Z" fill="currentColor"/><circle cx="6.8" cy="9.5" r=".9" fill="#07C160"/><circle cx="11.3" cy="9.5" r=".9" fill="#07C160"/><path d="M16.7 9.5c-3.2 0-5.8 2.1-5.8 4.8s2.6 4.8 5.8 4.8c.8 0 1.6-.1 2.3-.4l2 1-.6-1.7c1-.9 1.6-2.2 1.6-3.7 0-2.7-2.4-4.8-5.3-4.8Z" fill="currentColor"/><circle cx="14.6" cy="13.7" r=".75" fill="#07C160"/><circle cx="18.3" cy="13.7" r=".75" fill="#07C160"/>`},
    {id:"telegram",name:"Telegram",category:"通訊軟體",keywords:"TELEGRAM telegram 紙飛機 通訊 聊天 即時通訊",defaultBg:"#229ED9",defaultIconColor:"#FFFFFF",defaultShape:"circle",viewBox:"0 0 24 24",svg:`<path d="M20.7 4.4 17.8 19c-.2 1-.8 1.2-1.6.8l-4.4-3.2-2.1 2c-.2.2-.4.4-.8.4l.3-4.5 8.2-7.4c.4-.3-.1-.5-.5-.2L6.8 13.3l-4.4-1.4c-1-.3-1-1 .2-1.5L19.8 3.8c.8-.3 1.5.2.9.6Z" fill="currentColor"/>`},
    {id:"whatsapp",name:"WhatsApp",category:"通訊軟體",keywords:"WHATSAPP whatsapp 通訊 電話 聊天 即時通訊",defaultBg:"#25D366",defaultIconColor:"#FFFFFF",defaultShape:"circle",viewBox:"0 0 24 24",svg:`<path d="M12 3a9 9 0 0 0-7.7 13.7L3 21l4.5-1.2A9 9 0 1 0 12 3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.4 7.7c.2-.4.5-.4.8-.4h.4c.2 0 .4.1.5.5l.8 2c.1.3.1.5-.1.7l-.6.8c-.2.2-.1.4 0 .6.7 1.2 1.6 2.1 2.8 2.8.2.1.4.2.6 0l.8-1c.2-.2.4-.3.7-.2l2 .9c.3.1.5.3.5.5 0 .5-.2 1.5-.8 2.1-.6.6-1.5 1-2.6.8-1.1-.2-2.5-.7-4.3-2.3-2.2-2-3.6-4.3-3.7-5.9-.1-.8.1-1.4.4-1.9Z" fill="currentColor"/>`},
    {id:"messenger",name:"Messenger",category:"通訊軟體",keywords:"MESSENGER messenger Facebook FB 通訊 聊天 即時通訊",defaultBg:"#168AFF",defaultIconColor:"#FFFFFF",defaultShape:"circle",viewBox:"0 0 24 24",svg:`<path d="M12 3C6.9 3 3 6.7 3 11.5c0 2.7 1.2 5 3.3 6.5V21l3-1.6c.9.3 1.8.5 2.7.5 5.1 0 9-3.7 9-8.5S17.1 3 12 3Z" fill="currentColor"/><path d="m7.3 14.2 3.2-3.4 2.5 1.9 3.8-4.1-3.2 5.5-2.5-1.9-3.8 2Z" fill="#168AFF"/>`},
    {id:"discord",name:"Discord",category:"通訊軟體",keywords:"DISCORD discord 語音 通訊 聊天 社群",defaultBg:"#5865F2",defaultIconColor:"#FFFFFF",defaultShape:"rounded",viewBox:"0 0 24 24",svg:`<path d="M19.3 5.4A16 16 0 0 0 15.4 4l-.5 1a14 14 0 0 0-5.8 0l-.5-1a16 16 0 0 0-3.9 1.4C2.2 9.1 1.5 12.8 1.8 16.4A16 16 0 0 0 6.6 19l1.2-1.6c-.7-.3-1.4-.7-2-1.2l.5-.4c3.9 1.8 8.2 1.8 11.9 0l.5.4c-.6.5-1.3.9-2 1.2l1.2 1.6a16 16 0 0 0 4.8-2.6c.4-4.2-.7-7.8-3.4-11Z" fill="currentColor"/><circle cx="8.8" cy="12.2" r="1.3" fill="#5865F2"/><circle cx="15.2" cy="12.2" r="1.3" fill="#5865F2"/>`}
  ];

  if (typeof icons === "undefined" || typeof categories === "undefined") return;
  brandIcons.forEach(icon => { if (!icons.some(x => x.id === icon.id)) icons.push(icon); });
  if (!categories.includes("通訊軟體")) categories.splice(1, 0, "通訊軟體");

  function applyBrandDefaults(item){
    if (!item || item.dataset.type !== "builtin") return;
    const icon = icons.find(x => x.id === item.dataset.id);
    if (!icon || !icon.defaultBg) return;
    state.bgColor = icon.defaultBg;
    state.iconColor = icon.defaultIconColor || "#FFFFFF";
    state.shape = icon.defaultShape || "rounded";
    document.querySelector("#bgColor").value = state.bgColor;
    document.querySelector("#bgHex").value = state.bgColor;
    document.querySelector("#iconColor").value = state.iconColor;
    document.querySelector("#iconHex").value = state.iconColor;
    document.querySelectorAll(".shape-btn").forEach(x => x.classList.toggle("active", x.dataset.shape === state.shape));
  }

  const grid = document.querySelector("#iconGrid");
  grid.addEventListener("click", e => applyBrandDefaults(e.target.closest(".icon-item")), true);
  grid.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") applyBrandDefaults(e.target.closest(".icon-item"));
  }, true);

  document.title = "圖示編輯器 V1.2";
  renderTabs();
  renderIconGrid();
})();