/* M Share TTS Helper — British English defaults (Chrome-safe) */
(() => {
  "use strict";
  const KEY_URI = "mshare.tts.voiceURI";
  const KEY_RATE = "mshare.tts.rate";

  function supported() {
    return typeof window !== "undefined" &&
           "speechSynthesis" in window &&
           "SpeechSynthesisUtterance" in window;
  }

  const TTS = {
    _voices: [],
    _ready: null,

    getVoices() {
      const v = window.speechSynthesis?.getVoices?.() || [];
      if (v.length) this._voices = v;
      return this._voices;
    },

    waitForVoices(timeout = 5000) {
      if (!supported()) return Promise.resolve([]);
      if (this.getVoices().length) return Promise.resolve(this._voices);
      if (!this._ready) {
        this._ready = new Promise((resolve) => {
          let done = false;
          const finish = (list) => { if (done) return; done = true; this._voices = list || []; resolve(this._voices); };
          const timer = setTimeout(() => finish(this.getVoices()), timeout);

          const handler = () => {
            const list = this.getVoices();
            if (list.length) { clearTimeout(timer); finish(list); window.speechSynthesis.onvoiceschanged = null; }
          };
          // Chrome requires touching getVoices at least once and listening for the event
          window.speechSynthesis.onvoiceschanged = handler;
          this.getVoices();
        });
      }
      return this._ready;
    },

    _stored() { try { return localStorage.getItem(KEY_URI) || null; } catch { return null; } },
    _store(uri) { try { localStorage.setItem(KEY_URI, uri || ""); } catch {} },

    /* Preference order: Daniel → Google UK Female → Google UK Male → any en-GB → any English */
    pickBest(list) {
      if (!list || !list.length) return null;
      const prefNames = ["Daniel", "Google UK English Female", "Google UK English Male", "Sonia", "Hazel", "Libby", "Susan"]
        .map(s => s.toLowerCase());

      const byNameGb = list.find(v =>
        (v.lang || "").toLowerCase().startsWith("en-gb") &&
        prefNames.some(p => (v.name || "").toLowerCase().includes(p)));
      if (byNameGb) return byNameGb;

      const enGb = list.find(v => (v.lang || "").toLowerCase().startsWith("en-gb"));
      if (enGb) return enGb;

      const en = list.find(v => (v.lang || "").toLowerCase().startsWith("en-"));
      if (en) return en;

      return list[0];
    },

    resolve(desired) {
      const list = this.getVoices();
      if (!list.length) return null;
      if (desired) {
        const found = list.find(v => v.voiceURI === desired || v.name === desired);
        if (found) return found;
      }
      const stored = this._stored();
      if (stored) {
        const hit = list.find(v => v.voiceURI === stored);
        if (hit) return hit;
      }
      return this.pickBest(list);
    },

    /* Ensure Chrome isn't stuck in paused state; unlock quickly after a gesture */
    _resumeSafe() {
      try { window.speechSynthesis.cancel(); } catch {}
      try { window.speechSynthesis.resume(); } catch {}
    },

    speak(text, opts = {}) {
      if (!supported() || !text) return Promise.resolve(false);
      const rate = Math.max(0.5, Math.min(1.25, Number(opts.rate || localStorage.getItem(KEY_RATE) || 1) || 1));
      this._resumeSafe();

      const utt = new SpeechSynthesisUtterance(text);
      const voice = this.resolve(opts.voiceURI || opts.voiceName || null);
      if (voice) utt.voice = voice;
      utt.lang = (utt.voice && utt.voice.lang) || "en-GB";
      utt.rate = rate;
      utt.pitch = typeof opts.pitch === "number" ? opts.pitch : 1.0;
      utt.volume = typeof opts.volume === "number" ? opts.volume : 1.0;

      return new Promise((resolve) => {
        utt.onend = () => resolve(true);
        utt.onerror = () => resolve(false);
        try { window.speechSynthesis.speak(utt); } catch { resolve(false); }
      });
    },

    /* Near-silent prime to satisfy some autoplay/gesture policies */
    prime() {
      if (!supported()) return;
      try {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0; u.lang = "en-GB"; u.rate = 1;
        window.speechSynthesis.speak(u);
      } catch {}
    },

    /* Populate a <select> with voices, default to British, persist choice */
    connectUI(selectEl, testBtn) {
      if (!supported() || !selectEl) return;
      const render = () => {
        const list = this.getVoices();
        if (!list.length) return;
        const stored = this._stored();
        const preferred = this.pickBest(list);

        // sort en-GB first, then other en, then rest
        const sorted = list.slice().sort((a, b) => {
          const la = (a.lang || "").toLowerCase(), lb = (b.lang || "").toLowerCase();
          const ra = la.startsWith("en-gb") ? 0 : la.startsWith("en-") ? 1 : 2;
          const rb = lb.startsWith("en-gb") ? 0 : lb.startsWith("en-") ? 1 : 2;
          if (ra !== rb) return ra - rb;
          return (a.name || "").localeCompare(b.name || "");
        });

        selectEl.innerHTML = "";
        sorted.forEach(v => {
          const o = document.createElement("option");
          o.value = v.voiceURI;
          o.textContent = `${v.name} — ${v.lang}`;
          const isDefault = stored ? v.voiceURI === stored
                                   : (preferred && v.voiceURI === preferred.voiceURI);
          if (isDefault) o.selected = true;
          selectEl.appendChild(o);
        });

        selectEl.addEventListener("change", () => this._store(selectEl.value), { once: true });
      };

      this.waitForVoices(6000).then(render);

      if (testBtn) {
        testBtn.addEventListener("click", () => {
          const uri = selectEl?.value;
          if (uri) this._store(uri);
          this.speak("This is your selected British English voice for M Share.", { voiceURI: uri });
        });
      }
    },

    /* Choose a British default once voices arrive */
    waitAndDefaultToBritish() {
      return this.waitForVoices(6000).then(() => {
        const v = this.resolve("Daniel") || this.pickBest(this._voices);
        if (v) this._store(v.voiceURI);
      });
    }
  };

  window.MS_TTS = TTS;
})();
