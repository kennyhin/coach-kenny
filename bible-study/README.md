# Bible Study section (coachkenny.org/bible-study)

Plain static HTML. No build step.

```
bible-study/
  index.html            Bible Study hub: "Books" cards and "Study summaries" cards
  assets/bs.css         Dark site style (hub, book pages, key points)
  assets/chapter.css    Parchment style for chapter pages
  assets/chapter.js     Sidebar jump links + "section in view" highlight
  _chapter-template.html  Starter for a new chapter page (not published)
  genesis/
    index.html          Book page: one card per chapter (+ redirects old #chap-1 / #g1-.. links)
    1/index.html        Genesis 1
    2/index.html        Genesis 2
  key-points/index.html First page, last page (Genesis / Jesus / Revelation)
```

## Add a chapter (example: Genesis 3)
1. Copy `_chapter-template.html` to `genesis/3/index.html` (or copy `genesis/2/index.html` and replace its content).
2. Replace the placeholders: title, `Chapter N`, the sidebar jump list, and the `<section>` content. Give each section an id like `g3-01`.
3. In the sidebar of every Genesis chapter page, add one link to the chapter row:
   `<a class="chaptab" href="/bible-study/genesis/3/">Genesis 3</a>` (the current page gets `aria-current="page"`).
4. Fix the prev/next links at the bottom: chapter 2's "next" points to 3, chapter 3's "previous" points to 2.
5. Add a card for the chapter in `genesis/index.html` under "Chapters".

## Add a book (example: John)
1. Create `john/index.html` by copying `genesis/index.html` and changing the title and cards (you can delete the redirect script at the top, since Genesis is the only book that needs it).
2. Add chapters as `john/1/index.html` and so on, using the steps above with `john` in the links.
3. Add a card for the book in `bible-study/index.html` under "Books", and add it to the top nav if you want.

## Notes
- Scripture quotes are KJV (public domain in the US).
- Keep private teacher notes out of this repo. They live in the separate private notes site.
