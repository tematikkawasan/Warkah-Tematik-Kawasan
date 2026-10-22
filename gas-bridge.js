/* =========================================================
   GAS BRIDGE — pengganti google.script.run di GitHub Pages
   Semua panggilan google.script.run.xxx(...) di index.html
   otomatis dikirim ke Web App GAS lewat fetch (doPost).
   ========================================================= */

// 🔧 GANTI dengan URL Web App GAS kamu (Deploy → Web app → URL /exec)
window.GAS_URL = 'https://script.google.com/macros/s/AKfycbwGgn8kMH6F5Rsm-XSBbZBJiyHf_DFk-HXZvDUzSg2eqJfm20qOI614ZXNIbCKPolTPnw/exec';

(function () {
  var TOKEN_KEY = 'GAS_TOKEN';

  function call(fn, args, onOk, onFail) {
    var token = null;
    try { token = sessionStorage.getItem(TOKEN_KEY); } catch (e) {}

    fetch(window.GAS_URL, {
      method: 'POST',
      // text/plain → tidak memicu CORS preflight (GAS tidak mendukung OPTIONS)
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn: fn, args: args, token: token })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) {
          if (fn === 'authenticateUser' && res.token) {
            try { sessionStorage.setItem(TOKEN_KEY, res.token); } catch (e) {}
          }
          if (onOk) onOk(res.data);
        } else {
          if (res.code === 'SESSION_EXPIRED' && typeof window.forceLogout === 'function') {
            alert('Sesi habis, silakan login ulang.');
            window.forceLogout();
            return;
          }
          var err = new Error(res.error || 'Terjadi kesalahan server');
          if (onFail) onFail(err); else console.error(err);
        }
      })
      .catch(function (e) {
        if (onFail) onFail(e); else console.error(e);
      });
  }

  function runner(onOk, onFail) {
    return new Proxy({}, {
      get: function (_, name) {
        if (name === 'withSuccessHandler') return function (f) { return runner(f, onFail); };
        if (name === 'withFailureHandler') return function (f) { return runner(onOk, f); };
        if (name === 'withUserObject') return function () { return runner(onOk, onFail); };
        return function () {
          call(name, Array.prototype.slice.call(arguments), onOk, onFail);
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = { run: runner(null, null) };
})();
