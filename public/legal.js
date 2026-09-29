// Fills the owner's details (from the admin panel's Release & legal settings)
// into the legal pages. The game opens these pages with them in the address:
//   terms.html?entity=HelaO2&country=Sri%20Lanka&age=13&updated=2026-09-29&contact=support@helao2.com
// Only plain text is written (textContent), and each value is checked first.
(function () {
  var q = new URLSearchParams(location.search);
  var ok = {
    entity: function (v) { return v.length <= 80; },
    country: function (v) { return v.length <= 60; },
    age: function (v) { return /^\d{1,2}$/.test(v); },
    updated: function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v); },
    contact: function (v) { return v.length <= 120 && /^[^\s@<>"]+@[^\s@<>"]+$/.test(v); },
  };
  Object.keys(ok).forEach(function (k) {
    var v = (q.get(k) || '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!v || !ok[k](v)) return;
    document.querySelectorAll('[data-legal="' + k + '"]').forEach(function (el) {
      if (el.tagName === 'A' && k === 'contact') el.href = 'mailto:' + v;
      el.textContent = v;
    });
  });
})();
