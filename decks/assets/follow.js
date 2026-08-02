(function () {
  'use strict';

  var actions = document.querySelector('.topbar-actions');
  if (!actions || !('HTMLDialogElement' in window)) return;

  var params = new URLSearchParams(location.search);
  var slug = params.get('d') || 'slam-reservations';
  var followUrl = 'https://coachkenny.org/decks/deck.html?d=' + encodeURIComponent(slug) + '#1';

  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'assets/follow.css';
  document.head.appendChild(css);

  var button = document.createElement('button');
  button.className = 'tbtn follow-btn';
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.innerHTML = '<span aria-hidden="true">▦</span> Follow along';
  actions.insertBefore(button, actions.firstChild);

  var dialog = document.createElement('dialog');
  dialog.className = 'follow-dialog';
  dialog.setAttribute('aria-labelledby', 'follow-title');
  dialog.innerHTML = '' +
    '<button class="follow-close" type="button" aria-label="Close follow-along code">&times;</button>' +
    '<p class="follow-k mono">Open this deck on your phone</p>' +
    '<h2 id="follow-title">Follow along</h2>' +
    '<img src="img/follow/' + encodeURIComponent(slug) + '.png" alt="QR code for this deck">' +
    '<a class="follow-url mono" href="' + followUrl + '">' + followUrl + '</a>';
  document.body.appendChild(dialog);

  var close = dialog.querySelector('.follow-close');

  button.addEventListener('click', function () {
    dialog.showModal();
    close.focus();
  });

  close.addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) dialog.close();
  });
})();
