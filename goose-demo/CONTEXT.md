# Goose Context — Coach Kenny / SLAM! Nevada

## Who I Am
Kenny Hin (Hanz Nomad on Telegram). Athletic Director & PE teacher at SLAM! Nevada.
Direct, voice-message-heavy. Wants polished results, immediate fixes, numbered steps, batch questions.
Contact: kenny.hin@slamnv.org
School domain: @slamnv.org

## Core Tech Stack
- **Frontend**: GitHub Pages (static HTML/CSS/JS)
- **Backend**: Google Apps Script (GAS)
- **Data**: Google Sheets
- **Auth**: Google Identity Services restricted to @slamnv.org
- **Style**: Dark theme, green accent (#8CC63F), Barlow Condensed + Inter fonts

## Active Projects

### 1. Home Run Tracker (homerun-tracker/)
- Teachers mark athletes as Home Run (all classwork done) or No Home Run
- Coach gets ONE email per team when all players rated
- Teams: Baseball, Soccer, Basketball, T-Ball across grades K-6
- Cron: 2pm teacher reminders, 4:30pm auto-send
- Demo: 4 teams x 2 teachers/grade x 6 grades
- Cannot use Google OAuth from VPS — manual setup only
- Repo: kennyhin/homerun-tracker

### 2. Memory Wiki + Daily Priority Check-in
- Browsable static site at kennyhin.github.io/coach-kenny/memory-wiki/
- 8 subjects cataloged, daily logs, conversation timelines
- Daily 9am Telegram cron asks #1 priority
- These should be paired: cron collects priorities → wiki records outcomes
- Repo: kennyhin/coach-kenny (memory-wiki/ folder)

### 3. Receipt → PDF Tool (receipt.html at repo root)
- Mobile-first, manual-first receipt form filler
- Two form types: Purchase Request, Reimbursement
- Guided step-by-step flow
- Auto-calculates line item totals (price x qty)
- Quick-add presets for common PE items (cones, whistles, basketballs, etc.)
- PDF generation via pdf-lib (CDN: jsdelivr)
- Deployed: https://coachkenny.org/receipt.html and https://kennyhin.github.io/coach-kenny/receipt.html
- Repo: kennyhin/coach-kenny (receipt.html)

### 4. PE Games Library (pe-games/)
- K-5 physical education games library
- 16 game cards with grade filters
- Nevada PE Standards reference section
- Styled to match coachkenny.org
- 4 game detail pages done, 12 remaining
- Repo: kennyhin/coach-kenny (pe-games/ folder)

### 5. Friendly Bet / Slam Bets
- Multiple betting/prize-related repos and projects
- Various implementations across friendly-bet/, friendly-betting/, slam-bets/

### 6. SLAM Space Reservations
- Calendar/space booking system
- Google Sheets + GAS backend
- Repo: slam-space-reservations/

## Critical Lessons Learned

### PDF / Browser
- pdf-lib 1.17.1 async API: must `await PDFDocument.create()` and `await doc.embedFont(...)`
- `doc.save()` returns Promise → must `await`
- Local vendor files fail on GitHub Pages large-file push → use CDN (jsdelivr)
- `element.style.display = ''` does NOT override CSS `display:none` rule
- Must use `element.style.display = 'block'` explicitly

### GitHub Pages
- Subfolders often 404 unless configured as separate Pages sites
- Deploy to repo root for reliability
- Custom domain `coachkenny.org` redirects from GitHub Pages but may have propagation delays

### Google OAuth
- Cannot complete OAuth flow from VPS/headless environments
- Must walk through setup manually on a real browser

### Deploy Pattern
```
git add <file>
git commit -m "message"
git push origin main
# Wait ~30s for GitHub Pages rebuild
```

## My Preferences
- Mobile-first UI always
- Manual-first with optional enhancement (OCR, etc.)
- No backend required when possible
- Numbered steps in responses
- Batch questions together
- Hard refresh first when debugging: Ctrl+Shift+R or pull-down-to-refresh on mobile
- Voice messages are fine but I prefer text for technical details

## Environment Details
- Hermes Agent v0.15.1 installed
- Model: stepfun/step-3.7-flash:free via nousprovider
- OpenRouter key present but may need refresh
- goose CLI 1.37.0 installed at /root/.local/bin/goose
- Repos live at /root/coach-kenny/ (monorepo-style)

## Current Session Focus
- Receipt tool: polish, quick-add presets, PDF template matching real form
- PE Games: finish remaining 12 game pages
- Memory Wiki: update at end of every working session

## How to Work with Me
1. Build a working prototype first, then polish
2. Test on real device (mobile) before declaring done
3. Push to GitHub Pages immediately after changes
4. If something fails, give me 2-3 options with tradeoffs
5. Don't ask "should I continue?" — just continue and report results
6. Use `goose run --text "<task>" --no-session -q` for quick one-off tasks
7. Use `goose session --name <topic>` for longer interactive work
