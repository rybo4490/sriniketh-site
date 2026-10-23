(function () {
  if (!window.claude || typeof window.claude.use !== 'function') return;
  var SEL = '[data-edit]';
  document.addEventListener('DOMContentLoaded', async function () {
    var artifact = await window.claude.use('artifact'); if (!artifact) return;
    var user = await window.claude.use('user'); if (user && user.canEdit && user.canEdit() === false) return;
    var bar = document.createElement('div'); bar.className = 'editbar';
    bar.innerHTML = '<button type="button" class="edit-btn" data-act="edit">Edit text</button><button type="button" class="edit-btn primary" data-act="save" hidden>Save</button><button type="button" class="edit-btn" data-act="cancel" hidden>Cancel</button><span class="edit-msg"></span>';
    document.body.appendChild(bar);
    var btn = function (a) { return bar.querySelector('[data-act="' + a + '"]'); }, msg = bar.querySelector('.edit-msg');
    var original = {};
    function setMode(on) {
      document.body.classList.toggle('editing', on);
      document.querySelectorAll(SEL).forEach(function (n) { n.contentEditable = on ? 'true' : 'false'; if (on) original[n.dataset.edit] = n.innerHTML; });
      btn('edit').hidden = on; btn('save').hidden = !on; btn('cancel').hidden = !on; msg.textContent = on ? 'Tap any highlighted text to change it.' : '';
    }
    document.addEventListener('click', function (ev) { if (document.body.classList.contains('editing')) { var a = ev.target.closest('a'); if (a && a.closest('[data-edit]')) ev.preventDefault(); } }, true);
    btn('edit').addEventListener('click', function () { setMode(true); });
    btn('cancel').addEventListener('click', function () { document.querySelectorAll(SEL).forEach(function (n) { n.innerHTML = original[n.dataset.edit]; }); setMode(false); });
    btn('save').addEventListener('click', async function () {
      var changed = {}; document.querySelectorAll(SEL).forEach(function (n) { if (n.innerHTML !== original[n.dataset.edit]) changed[n.dataset.edit] = n.innerHTML; });
      if (!Object.keys(changed).length) { setMode(false); return; }
      msg.textContent = 'Saving\u2026'; btn('save').disabled = true;
      try {
        var path = location.pathname.split('/').pop() || 'index.html'; if (!/\.html$/.test(path)) path = 'index.html';
        var src = await (await fetch(path, { cache: 'no-store' })).text();
        var doc = new DOMParser().parseFromString(src, 'text/html');
        Object.keys(changed).forEach(function (k) { var t = doc.querySelector('[data-edit="' + k + '"]'); if (t) t.innerHTML = changed[k]; });
        var html = '<!doctype html>' + doc.documentElement.outerHTML;
        if (path === 'index.html') await artifact.publish(html); else await artifact.publish((function () { var f = {}; f[path] = html; return f; })());
        msg.textContent = 'Saved.'; setMode(false); btn('save').disabled = false;
      } catch (e) {
        btn('save').disabled = false;
        msg.textContent = e && e.code === 'not_writer' ? 'You can read this page but not change it.' : e && e.code === 'conflict' ? 'Someone else saved first. Reloading.' : e && e.code === 'capability_disabled' ? 'Saving is not available on this page here.' : 'Could not save (' + (e && e.code || 'error') + ').';
      }
    });
  });
})();
