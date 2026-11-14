# Presidential Physical Fitness Test — Official Benchmarks

Extracted on Saturday, November 14, 2026 (America/Los_Angeles) from the official White House materials at [https://www.whitehouse.gov/fitness/](https://www.whitehouse.gov/fitness/). **No numbers were invented.** If an age or event is not in the official source, it is marked `missing`.

## Sources

| File | Official URL | What it contains |
| --- | --- | --- |
| [official/Presidential-Physical-Fitness-Test.pdf](official/Presidential-Physical-Fitness-Test.pdf) | [Presidential Physical Fitness Test PDF](https://www.whitehouse.gov/wp-content/uploads/2026/05/Presidential-Physical-Fitness-Test.pdf) | One-page table of **Presidential Award** benchmarks only, ages **6–17+**, boys and girls, all six events |
| [official/Fitness-Council-Certification-Presidential-Award-1.pdf](official/Fitness-Council-Certification-Presidential-Award-1.pdf) | [Presidential Award certificate](https://www.whitehouse.gov/wp-content/uploads/2026/05/Fitness-Council-Certification-Presidential-Award-1.pdf) | 2026 Presidential Physical Fitness Award certificate |
| [official/Fitness-Council-Certification-National-Award.pdf](official/Fitness-Council-Certification-National-Award.pdf) | [National Award certificate](https://www.whitehouse.gov/wp-content/uploads/2026/05/Fitness-Council-Certification-National-Award.pdf) | 2026 National Physical Fitness Award certificate |
| [official/Fitness-Council-Certification-Participation-1.pdf](official/Fitness-Council-Certification-Participation-1.pdf) | [Participation certificate](https://www.whitehouse.gov/wp-content/uploads/2026/05/Fitness-Council-Certification-Participation-1.pdf) | 2026 certificate for completing the test (linked on the same page as “Participation Award”) |
| White House fitness page (interactive standards) | [https://www.whitehouse.gov/fitness/](https://www.whitehouse.gov/fitness/) | Presidential numbers (match the PDF) **and National Award numbers** (not printed in the PDF). Saved as [official/whitehouse-fitness-page-standards.js](official/whitehouse-fitness-page-standards.js) |

Presidential Award numbers below were extracted with `pdftotext -layout` and checked against a high-resolution render of the official PDF ([official/Presidential-Physical-Fitness-Test.png](official/Presidential-Physical-Fitness-Test.png)). They also match the page JavaScript exactly.

Machine-readable copy: [benchmarks.csv](benchmarks.csv).

## Coverage and gaps

**Covered (official):** ages **6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, and 17+**; sexes **Boys** and **Girls**; events **curl-ups (in 1 minute), plank (seconds), one-mile run (min:sec), 20m beep test / PACER (laps), right-angle push-ups (reps), pull-ups (reps)**; award levels **Presidential** (PDF + website) and **National** (website only).

**Gaps (do not invent numbers):**

- **Age 5 is missing** from both the official PDF and the website age picker (which starts at 6). This matters for some kindergarteners. Every age-5 row in the CSV is marked `missing`.
- **National Award tables are not in the official PDF.** The PDF is titled “Presidential Physical Fitness Award” and prints only that level. National targets come only from the official website’s published standards object. They are included here with that source noted, not treated as PDF content.
- **No official event-by-event administration manual** appears in the 1-page PDF, on whitehouse.gov/fitness/, in the July 31, 2025 executive order or fact sheet, or in the Get Kids Active overview at getactive.gov/kids (curl from this machine received HTTP 403 from Akamai; the page was read successfully with WebFetch and also via archive.org). There is **no official written definition of “age”** (for example, age on test day vs. age at the start of the school year). There is **no required testing calendar** in the PDF. HHS stated on June 29, 2026 that schools would administer the test “beginning this fall” (fall 2026), but did not set a window.

## How awards work (official wording)

From the official PDF header: students **must meet benchmarks in all three categories**. In each category, the **student may pick one** event:

1. **Core & Abdominal Strength** — curl-ups *or* plank
2. **Cardiorespiratory Fitness** — one-mile run *or* 20m beep test
3. **Upper Body Strength** — right-angle push-ups *or* pull-ups

The White House page says: “Hit at least **one target from every category** and you’ll earn the [Presidential / National] Physical Fitness Award.” Presidential is labeled “Top tier.” National is labeled “Solid achievement.”

**Direction of each target** (implied by the units; the official table does not print the words “at least” / “at most”):

- Curl-ups, plank, 20m beep test, right-angle push-ups, and pull-ups are scores to **meet or exceed** (`at least`).
- One-mile run is a time to **meet or beat** (`at most`).

## Participation certificates (official)

The White House page states: “Two levels of achievement—Presidential and National—recognize students who meet established fitness benchmarks, while **all students who complete the test may receive a Certificate of Participation**.” It also says, “Every student who completes the test earns a Certificate of Participation.” Official fillable 2026 certificate PDFs are linked on that page (see Sources). The materials do not say a student must reach a benchmark to get the participation certificate—only that they complete the test.

## Official rules that are *not* published in these files

The official PDF and fitness page do **not** spell out how to perform a legal curl-up, plank, mile, 20m beep test, right-angle push-up, or pull-up (form, cadence, starting position, when a rep counts, when the beep test ends, etc.). They also do not say whether “Age” means age on test day. Do not treat older historical Presidential Fitness Test or FITNESSGRAM manuals as the current official protocol unless HHS or the White House later publishes them for this restored test.

Related official context (not a testing manual):

- Executive order of July 31, 2025: the test “shall be administered by the Secretary of Health and Human Services with the support of the Secretary of Education.”
- HHS press release, June 29, 2026: schools would administer the test beginning fall 2026 using “updated, age-appropriate standards.”
- Certificates are dated **2026** and issued under the President’s Council on Sports, Fitness & Nutrition (Presidential Award PDF is signed by the President; National and Participation certificates also name Bryson DeChambeau as Chairman).

---

## K–5 snapshot (ages 5–11)

Age 5 is officially missing. Ages 6–11 are complete. A student earns an award by hitting **one event in each of the three categories** at that level, not every event.

### 10-year-old boy and girl (quick reference)

| Event | Unit | Direction | Boys Presidential | Boys National | Girls Presidential | Girls National |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Curl-ups | reps in 1 minute | at least | 45 | 35 | 40 | 30 |
| Plank | seconds | at least | 119 | 65 | 105 | 66 |
| One-mile run | min:sec | at most | 7:57 | 9:48 | 9:19 | 11:22 |
| 20m beep test | laps | at least | 55 | 26 | 41 | 21 |
| Right-angle push-ups | reps | at least | 22 | 14 | 20 | 13 |
| Pull-ups | reps | at least | 6 | 2 | 3 | 1 |

### Boys, ages 5–11 — Presidential Award

| Age | Curl-ups (in 1 min) | Plank (sec) | One mile run (min:sec) | 20m beep test (laps) | Right-angle push-ups (reps) | Pull-ups (reps) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | missing | missing | missing | missing | missing | missing |
| 6 | 33 | 73 | 10:15 | 27 | 9 | 2 |
| 7 | 36 | 90 | 9:22 | 32 | 14 | 4 |
| 8 | 40 | 95 | 8:48 | 39 | 17 | 5 |
| 9 | 41 | 109 | 8:31 | 47 | 18 | 5 |
| 10 | 45 | 119 | 7:57 | 55 | 22 | 6 |
| 11 | 47 | 119 | 7:32 | 60 | 27 | 6 |

### Boys, ages 5–11 — National Award (website only; not in the PDF)

| Age | Curl-ups (in 1 min) | Plank (sec) | One mile run (min:sec) | 20m beep test (laps) | Right-angle push-ups (reps) | Pull-ups (reps) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | missing | missing | missing | missing | missing | missing |
| 6 | 22 | 42 | 12:36 | 10 | 7 | 1 |
| 7 | 28 | 50 | 11:40 | 14 | 8 | 1 |
| 8 | 31 | 63 | 11:05 | 19 | 9 | 1 |
| 9 | 32 | 63 | 10:30 | 23 | 12 | 2 |
| 10 | 35 | 65 | 9:48 | 26 | 14 | 2 |
| 11 | 37 | 71 | 9:20 | 31 | 15 | 2 |

### Girls, ages 5–11 — Presidential Award

| Age | Curl-ups (in 1 min) | Plank (sec) | One mile run (min:sec) | 20m beep test (laps) | Right-angle push-ups (reps) | Pull-ups (reps) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | missing | missing | missing | missing | missing | missing |
| 6 | 32 | 71 | 11:20 | 22 | 9 | 2 |
| 7 | 34 | 92 | 10:36 | 25 | 14 | 2 |
| 8 | 38 | 92 | 10:02 | 29 | 17 | 2 |
| 9 | 39 | 105 | 9:30 | 35 | 18 | 2 |
| 10 | 40 | 105 | 9:19 | 41 | 20 | 3 |
| 11 | 42 | 105 | 9:02 | 46 | 20 | 3 |

### Girls, ages 5–11 — National Award (website only; not in the PDF)

| Age | Curl-ups (in 1 min) | Plank (sec) | One mile run (min:sec) | 20m beep test (laps) | Right-angle push-ups (reps) | Pull-ups (reps) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | missing | missing | missing | missing | missing | missing |
| 6 | 23 | 41 | 13:12 | 10 | 6 | 1 |
| 7 | 25 | 56 | 12:56 | 12 | 8 | 1 |
| 8 | 29 | 60 | 12:30 | 15 | 9 | 1 |
| 9 | 30 | 66 | 11:52 | 18 | 12 | 1 |
| 10 | 30 | 66 | 11:22 | 21 | 13 | 1 |
| 11 | 32 | 67 | 11:17 | 24 | 13 | 1 |

---

## Full official tables (ages 6–17+)

### Boys — Presidential Award (official PDF)

| Age | Curl-ups (in 1 min) | Plank (sec) | One mile run (min:sec) | 20m beep test (laps) | Right-angle push-ups (reps) | Pull-ups (reps) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6 | 33 | 73 | 10:15 | 27 | 9 | 2 |
| 7 | 36 | 90 | 9:22 | 32 | 14 | 4 |
| 8 | 40 | 95 | 8:48 | 39 | 17 | 5 |
| 9 | 41 | 109 | 8:31 | 47 | 18 | 5 |
| 10 | 45 | 119 | 7:57 | 55 | 22 | 6 |
| 11 | 47 | 119 | 7:32 | 60 | 27 | 6 |
| 12 | 50 | 127 | 7:11 | 65 | 31 | 7 |
| 13 | 53 | 134 | 6:50 | 70 | 39 | 7 |
| 14 | 56 | 134 | 6:26 | 75 | 40 | 10 |
| 15 | 57 | 156 | 6:20 | 81 | 42 | 11 |
| 16 | 57 | 156 | 6:08 | 84 | 44 | 11 |
| 17+ | 57 | 156 | 6:06 | 84 | 53 | 13 |

### Boys — National Award (official website; not in the PDF)

| Age | Curl-ups (in 1 min) | Plank (sec) | One mile run (min:sec) | 20m beep test (laps) | Right-angle push-ups (reps) | Pull-ups (reps) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6 | 22 | 42 | 12:36 | 10 | 7 | 1 |
| 7 | 28 | 50 | 11:40 | 14 | 8 | 1 |
| 8 | 31 | 63 | 11:05 | 19 | 9 | 1 |
| 9 | 32 | 63 | 10:30 | 23 | 12 | 2 |
| 10 | 35 | 65 | 9:48 | 26 | 14 | 2 |
| 11 | 37 | 71 | 9:20 | 31 | 15 | 2 |
| 12 | 40 | 71 | 8:40 | 37 | 18 | 2 |
| 13 | 42 | 83 | 8:06 | 42 | 24 | 3 |
| 14 | 45 | 90 | 7:44 | 44 | 24 | 5 |
| 15 | 45 | 98 | 7:30 | 46 | 30 | 6 |
| 16 | 45 | 98 | 7:10 | 48 | 30 | 7 |
| 17+ | 45 | 98 | 7:04 | 50 | 37 | 8 |

### Girls — Presidential Award (official PDF)

| Age | Curl-ups (in 1 min) | Plank (sec) | One mile run (min:sec) | 20m beep test (laps) | Right-angle push-ups (reps) | Pull-ups (reps) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6 | 32 | 71 | 11:20 | 22 | 9 | 2 |
| 7 | 34 | 92 | 10:36 | 25 | 14 | 2 |
| 8 | 38 | 92 | 10:02 | 29 | 17 | 2 |
| 9 | 39 | 105 | 9:30 | 35 | 18 | 2 |
| 10 | 40 | 105 | 9:19 | 41 | 20 | 3 |
| 11 | 42 | 105 | 9:02 | 46 | 20 | 3 |
| 12 | 45 | 127 | 8:23 | 49 | 20 | 3 |
| 13 | 46 | 127 | 8:13 | 50 | 21 | 3 |
| 14 | 47 | 134 | 7:59 | 50 | 21 | 3 |
| 15 | 48 | 145 | 7:59 | 50 | 21 | 3 |
| 16 | 48 | 145 | 7:59 | 50 | 24 | 3 |
| 17+ | 48 | 145 | 7:59 | 50 | 25 | 3 |

### Girls — National Award (official website; not in the PDF)

| Age | Curl-ups (in 1 min) | Plank (sec) | One mile run (min:sec) | 20m beep test (laps) | Right-angle push-ups (reps) | Pull-ups (reps) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6 | 23 | 41 | 13:12 | 10 | 6 | 1 |
| 7 | 25 | 56 | 12:56 | 12 | 8 | 1 |
| 8 | 29 | 60 | 12:30 | 15 | 9 | 1 |
| 9 | 30 | 66 | 11:52 | 18 | 12 | 1 |
| 10 | 30 | 66 | 11:22 | 21 | 13 | 1 |
| 11 | 32 | 67 | 11:17 | 24 | 13 | 1 |
| 12 | 35 | 69 | 11:05 | 26 | 13 | 1 |
| 13 | 37 | 69 | 10:23 | 26 | 13 | 1 |
| 14 | 37 | 79 | 10:06 | 27 | 13 | 1 |
| 15 | 37 | 79 | 9:58 | 28 | 15 | 1 |
| 16 | 37 | 79 | 9:58 | 28 | 15 | 1 |
| 17+ | 37 | 79 | 9:58 | 28 | 16 | 1 |
