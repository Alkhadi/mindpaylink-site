(function(){
  "use strict";
  var D=document, W=window;
  var PANEL_ID="mshare-voicebot";
  var LAUNCH_ID="mshare-voice-launcher";
  var HIDDEN_KEY="mshare_voice_hidden_v1";

  function lsRead(key, def){ try{ var v=localStorage.getItem(key); return v==null?def:JSON.parse(v); }catch(e){ return def; } }
  function lsWrite(key,val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }

  function ensureLauncher(){
    var b = D.getElementById(LAUNCH_ID);
    if (b) return b;
    b = D.createElement("button");
    b.id = LAUNCH_ID;
    b.type = "button";
    b.setAttribute("aria-label","Open Voice Assistant");
    b.innerHTML = "Voice";
    b.style.display = "none";             // default hidden until needed
    b.addEventListener("click", function(){
      showPanel(true);
    });
    D.body.appendChild(b);
    return b;
  }

  function getPanel(){ return D.getElementById(PANEL_ID); }

  function showPanel(focusAfter){
    var p = getPanel();
    var l = ensureLauncher();
    if (p){ p.style.display=""; lsWrite(HIDDEN_KEY, false); if (focusAfter){ try{ p.querySelector(".mshare-voicebot__handle").focus(); }catch(e){} } }
    if (l){ l.style.display="none"; }
  }

  function hidePanel(){
    var p = getPanel();
    var l = ensureLauncher();
    if (p){ p.style.display="none"; }
    if (l){ l.style.display="inline-flex"; }
    lsWrite(HIDDEN_KEY, true);
  }

  function addHideButton(panel){
    if (!panel) return;
    if (panel.querySelector("[data-voice-action=\"hide\"]")) return;
    var handle = panel.querySelector(".mshare-voicebot__handle");
    if (!handle) return;
    var btn = D.createElement("button");
    btn.type = "button";
    btn.className = "mshare-voicebot__btn mshare-voicebot__btn--ghost";
    btn.setAttribute("data-voice-action","hide");
    btn.title = "Hide panel";
    btn.textContent = "Hide";
    btn.addEventListener("click", function(e){ e.preventDefault(); hidePanel(); });
    handle.appendChild(btn);
  }

  function applyInitialState(){
    var hidden = !!lsRead(HIDDEN_KEY, false);
    var p = getPanel();
    var l = ensureLauncher();
    if (hidden){
      if (p) p.style.display="none";
      if (l) l.style.display="inline-flex";
    }else{
      if (p) p.style.display="";
      if (l) l.style.display="none";
    }
  }

  // Observe for the panel if it is created after load
  function watchForPanel(){
    var p = getPanel();
    if (p){
      addHideButton(p);
      applyInitialState();
      return;
    }
    var mo = new MutationObserver(function(){
      var px = getPanel();
      if (px){
        try{ mo.disconnect(); }catch(e){}
        addHideButton(px);
        applyInitialState();
      }
    });
    mo.observe(D.body, { childList:true, subtree:true });
  }

  function init(){
    ensureLauncher();
    watchForPanel();
    // Keyboard shortcut: Alt+V to toggle (optional but handy)
    W.addEventListener("keydown", function(e){
      if ((e.altKey || e.metaKey) && !e.shiftKey && !e.ctrlKey && (e.key.toLowerCase()==="v")){
        e.preventDefault();
        var hidden = !!lsRead(HIDDEN_KEY, false);
        if (hidden) showPanel(true); else hidePanel();
      }
    });
  }

  if (D.readyState==="loading") D.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
