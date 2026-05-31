// SLAM! PE Games — Grade Filter
document.addEventListener('DOMContentLoaded', function () {
  var chips = document.querySelectorAll('.filter-chip');
  var cards = document.querySelectorAll('.game-card');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('active'); });
      this.classList.add('active');

      var filter = this.getAttribute('data-filter');

      cards.forEach(function (card) {
        var grades = card.getAttribute('data-grades') || '';
        var match =
          filter === 'all' ||
          grades.split(',').indexOf(filter) > -1;

        card.classList.toggle('hidden', !match);
      });
    });
  });
});
