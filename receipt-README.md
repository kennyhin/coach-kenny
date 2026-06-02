# Receipt → PDF — Handoff Notes

## Project
Standalone receipt form filler for Coach Kenny. Select Purchase Request or Reimbursement, fill the form fields, then generate and download a filled PDF. Mobile-first, no backend, deployed via GitHub Pages.

## Live URL
- https://kennyhin.github.io/coach-kenny/receipt.html
- Custom domain: https://coachkenny.org/receipt.html (redirects from GitHub Pages)

## What’s Working
- Type selection: Purchase Request / Reimbursement
- Step-by-step guided form flow
- Receipt photo capture from phone camera
- Line item quick-add presets (Cones, Whistle, Basketball, etc.)
- Auto math on line items: edit Price or Qty → Total updates
- Add multiple line items
- PDF generation and browser download
- Form state persists across step navigation

## Critical Gotchas
1. PDF lib async API in pdf-lib 1.17.1
   - `PDFDocument.create()` returns a Promise → must `await`
   - `embedFont()` is async → must `await`
   - `doc.save()` returns a Promise → must `await`
2. pdf-lib via CDN
   - Script must load BEFORE the app script
   - CDN: `https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js`
   - Keeping a local vendor copy failed because GitHub Pages push errored out on large files
3. Display:none CSS bug
   - Setting `element.style.display = ''` does NOT override a CSS rule with `display:none`
   - Use `element.style.display = 'block'` explicitly

## File Structure
- `/root/coach-kenny/receipt.html` — Main app (self-contained, ~20KB)
- `/root/coach-kenny/receipt-filler/` — Old folder (deleted from git, still local), has node_modules, tesseract, vendor copies

## Form Fields

### Purchase Request
- Date Submitted
- Requested By
- Cost Center/Team
- Items: desc / Price / Qty / Total (auto)
- Subtotal
- Shipping
- Total
- Shipping Instructions

### Reimbursement
- Employee Name
- Date
- Vendor/Store
- Amount
- Purpose
- Account/Cost Center

## Next Steps for New LLM
1. Replace generated PDF with the actual blank form template image so it looks like the real paper form (current version is just text on a blank page)
2. Add “quality” / condition dropdown for items (New, Good, Fair)
3. Add unit dropdown or preset for common PE items with prices
4. Pre-fill team/defaults when known (e.g. Kenny Ho, Kinder, Soccer)
5. Consider OCR fallback from receipt photo (tesseract.js in local node_modules)
6. Fix custom domain `coachkenny.org` if 404 persists

## Deploy
From `/root/coach-kenny/`:
- Edit `receipt.html`
- `git add receipt.html`
- `git commit -m "message"`
- `git push origin main`
- Wait ~30s for GitHub Pages to rebuild
