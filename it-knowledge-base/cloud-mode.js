// IT Knowledge Base V4 - cloud-first mode
// Google Sheets is the primary record store; IndexedDB is only a local cache.
(function(){
  let refreshing=false;

  function setCloudUI(){
    const title=document.querySelector('#syncModal .dialog-head h2');
    if(title) title.textContent='Google 雲端資料連線';
    const auto=document.querySelector('#syncAuto')?.closest('.field');
    if(auto) auto.style.display='none';
    const pull=document.querySelector('#btnPullCloud');
    const push=document.querySelector('#btnPushCloud');
    if(pull) pull.style.display='none';
    if(push) push.style.display='none';
    const help=document.querySelector('.sync-help');
    if(help) help.innerHTML='V4 採用 <b>Google 試算表為主要資料庫</b>、Google Drive 保存圖片附件。設定完成後，開啟網頁會自動讀取最新雲端紀錄；新增、修改、刪除、收藏與附件變更也會自動寫回雲端。IndexedDB 僅作為離線快取，不需要手動下載資料。';
    const muted=document.querySelector('.toolbar .muted');
    if(muted) muted.textContent='Google 試算表雲端資料 + 本機離線快取';
  }

  async function replaceCacheFromCloud(d){
    const remote=Array.isArray(d.records)?d.records:[];
    const localMap=new Map(records.map(r=>[r.id,r]));
    records=remote.map(r=>({...r,attachments:mergeAttachments(r.attachments||[],localMap.get(r.id)?.attachments||[])}));
    await clear(RS);
    for(const r of records) await put(RS,r);
    if(d.categories?.length){cats=d.categories;await saveCats()}
    if(d.categoryIcons){icons={...ICONS,...d.categoryIcons};await saveIcons()}
    catUI();render();
  }

  async function cloudRefresh(options={}){
    if(!cloudOK()||refreshing)return false;
    refreshing=true;
    try{
      syncStatus('🔵 正在讀取雲端資料…');
      const d=await jsonp({action:'list'},20000);
      if(d.driveEnabled!==true) throw Error('Apps Script 後端仍是舊版，請更新 Code.gs 並重新部署');
      await replaceCacheFromCloud(d);
      syncStatus('🟢 雲端已連線');
      if(options.toast) toast(`已載入 ${records.length} 筆雲端紀錄`);
      return true;
    }catch(e){
      console.error('V4 cloud refresh failed',e);
      syncStatus('🟠 雲端連線失敗・顯示本機快取');
      if(options.alert) alert('雲端連線失敗：'+e.message+'\n\n目前先顯示這台電腦的本機快取。');
      return false;
    }finally{refreshing=false}
  }

  async function enableCloudFirst(){
    if(!cloudOK())return;
    if(!sync.autoSync){sync.autoSync=true;await saveSync()}
    await cloudRefresh();
  }

  // Replace the V3 settings behavior: saving credentials immediately tests and loads cloud data.
  const saveBtn=document.querySelector('#btnSaveSync');
  if(saveBtn) saveBtn.onclick=async()=>{
    sync={url:document.querySelector('#syncUrl').value.trim(),key:document.querySelector('#syncKey').value.trim(),autoSync:true};
    await saveSync();
    syncStatus();
    if(!cloudOK())return alert('請輸入 Apps Script Web App 網址與同步金鑰。');
    const ok=await cloudRefresh({toast:true,alert:true});
    if(ok){modal('syncModal',false);toast('雲端設定完成，之後開啟網頁會自動載入')}
  };

  // Replace the V3 sync-dialog opener with a connection-status check.
  const syncBtn=document.querySelector('#btnSync');
  if(syncBtn) syncBtn.onclick=()=>{
    document.querySelector('#syncUrl').value=sync.url||'';
    document.querySelector('#syncKey').value=sync.key||'';
    const autoBox=document.querySelector('#syncAuto');if(autoBox)autoBox.checked=true;
    modal('syncModal');
    const state=document.querySelector('#syncDriveState');
    if(!cloudOK()){if(state)state.textContent='⚪ 尚未設定雲端連線';return}
    if(state)state.textContent='🔵 正在測試 Google 雲端連線…';
    jsonp({action:'ping'},15000).then(d=>{
      if(state)state.textContent=d.driveEnabled?'✅ Google 試算表 + Drive 連線正常':'⚠️ Apps Script 後端版本過舊';
    }).catch(e=>{if(state)state.textContent='⚠️ 連線失敗：'+e.message});
  };

  // Manual push/pull is intentionally removed from normal V4 operation.
  setCloudUI();

  // Initial automatic cloud read after V3 finishes loading its local cache.
  setTimeout(enableCloudFirst,150);

  // Refresh when returning to the tab, avoiding stale records between computers.
  let lastFocusRefresh=0;
  window.addEventListener('focus',()=>{
    if(!cloudOK())return;
    const now=Date.now();
    if(now-lastFocusRefresh<15000)return;
    lastFocusRefresh=now;
    cloudRefresh();
  });

  // Periodic refresh while the page remains open.
  setInterval(()=>{if(document.visibilityState==='visible'&&cloudOK())cloudRefresh()},60000);

  window.itkbCloudRefresh=cloudRefresh;
})();