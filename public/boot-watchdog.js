/**
 * Boot watchdog, deliberately plain JS outside the app bundle: if the app
 * hasn't rendered after 12 s (the app sets <html data-ready>), show what went
 * wrong plus a way to clear a stale app cache. Works even when loading the
 * bundle itself fails.
 */
(function () {
  var errors = [];
  // Evolu reports errors as plain objects ({ type: … }), which browsers
  // print as just "Object", so serialize whatever was thrown.
  function describe(value) {
    if (value instanceof Error) return value.name + ": " + value.message + (value.stack ? " @ " + value.stack.split("\n")[1] : "");
    try {
      return JSON.stringify(value, function (k, v) {
        return v instanceof Error ? v.name + ": " + v.message : v;
      }).slice(0, 600);
    } catch (_) {
      return String(value);
    }
  }
  addEventListener(
    "error",
    function (e) {
      if (e.error !== undefined) errors.push(describe(e.error));
      else errors.push(e.message || (e.target && (e.target.src || e.target.href)) || "error");
    },
    true,
  );
  addEventListener("unhandledrejection", function (e) {
    errors.push("Promise: " + describe(e.reason));
  });
  var de = (navigator.language || "").toLowerCase().indexOf("de") === 0;
  function txt(d, e) {
    return de ? d : e;
  }
  function info() {
    var s = navigator.storage;
    return [
      "UA: " + navigator.userAgent,
      "standalone: " + matchMedia("(display-mode: standalone)").matches,
      "SharedWorker: " + typeof SharedWorker,
      "Worker: " + typeof Worker,
      "locks: " + !!navigator.locks,
      "OPFS: " + !!(s && s.getDirectory),
      "indexedDB: " + typeof indexedDB,
      "serviceWorker: " + !!(navigator.serviceWorker && navigator.serviceWorker.controller),
      "errors: " + (errors.length ? errors.join(" | ") : "none"),
      "evoluError: " + (window.__repyloEvoluError ? describe(window.__repyloEvoluError) : "none"),
      "bootError: " + (window.__repyloBootError ? describe(window.__repyloBootError) : "none"),
    ].join("\n");
  }
  function button(label, onClick, dark) {
    var b = document.createElement("button");
    b.textContent = label;
    b.style.cssText =
      "padding:12px 16px;border:2.5px solid #21161f;border-radius:14px;font:700 15px system-ui,sans-serif;background:" +
      (dark ? "#21161f;color:#fdfff8" : "#fdfff8;color:#21161f");
    b.onclick = onClick;
    return b;
  }
  function show() {
    var box = document.createElement("div");
    box.style.cssText =
      "position:fixed;inset:auto 12px 12px 12px;z-index:9999;background:#ede47c;border:2.5px solid #21161f;border-radius:18px;box-shadow:4px 4px 0 #21161f;padding:16px;display:flex;flex-direction:column;gap:10px;font:15px system-ui,sans-serif;color:#21161f";
    var title = document.createElement("strong");
    title.textContent = txt("repylo startet gerade nicht.", "repylo isn't starting.");
    var hint = document.createElement("div");
    hint.textContent = txt(
      "Deine Trainingsdaten bleiben erhalten. Schick mir die Infos, damit ich den Fehler finde.",
      "Your workout data is safe. Send these details so the problem can be found.",
    );
    var pre = document.createElement("textarea");
    pre.readOnly = true;
    pre.value = info();
    pre.style.cssText = "height:160px;font:12px ui-monospace,monospace;border:2px solid #21161f;border-radius:10px;padding:8px";
    var row = document.createElement("div");
    row.style.cssText = "display:flex;flex-wrap:wrap;gap:8px";
    row.appendChild(
      button(txt("Infos kopieren", "Copy details"), function () {
        pre.select();
        if (navigator.clipboard) navigator.clipboard.writeText(pre.value);
        else document.execCommand("copy");
      }),
    );
    row.appendChild(
      button(txt("Neu laden", "Reload"), function () {
        location.reload();
      }),
    );
    row.appendChild(
      button(
        txt("Cache leeren & neu laden", "Clear cache & reload"),
        function () {
          var jobs = [];
          if (navigator.serviceWorker)
            jobs.push(
              navigator.serviceWorker.getRegistrations().then(function (rs) {
                return Promise.all(
                  rs.map(function (r) {
                    return r.unregister();
                  }),
                );
              }),
            );
          if (window.caches)
            jobs.push(
              caches.keys().then(function (ks) {
                return Promise.all(
                  ks.map(function (k) {
                    return caches.delete(k);
                  }),
                );
              }),
            );
          Promise.all(jobs)
            .catch(function () {})
            .then(function () {
              location.reload();
            });
        },
        true,
      ),
    );
    box.appendChild(title);
    box.appendChild(hint);
    box.appendChild(pre);
    box.appendChild(row);
    document.body.appendChild(box);
  }
  setTimeout(function () {
    if (!document.documentElement.dataset.ready) show();
  }, 12000);
})();
