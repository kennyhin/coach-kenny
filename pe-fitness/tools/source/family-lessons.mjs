// pe-fitness/tools/source/family-lessons.mjs — the PUBLIC, family-facing text for the 16 lesson pages.
//
// Purpose: Kenny (Nov 14, 2026) asked that the Presidential Fitness pages read for parents, teachers,
//   principals AND students: a NEUTRAL voice ("In class we...", "Students practice...") for Coach Kenny's PE
//   class page, short and clear enough for a 3rd-5th grader. Never address parents ("your child").
//   These summaries are what the site shows. They are plain-language rewrites of the teacher plans in ./lessons/*.md (which stay in the repo
//   as the teacher source of truth and for Planbook, but are NOT rendered word for word anymore).
// Used by: ../build-lessons.mjs (lesson pages + lessons list). Lesson ORDER, "When" and grade band still
//   come from ./lessons/index.md and each .md header; every slug in index.md must have an entry here.
// Rules for editing: neutral voice, warm, plain, short words; no teacher asides, box paths, form-check percentages, score
//   sheets or Roll Call details; no student names or scores; no benchmark numbers here (those live only
//   in benchmarks.csv → benchmarks.html).
//
// Shape per slug:
//   title    short page title
//   summary  one or two sentences: what this class is about
//   steps    [lead, text] pairs: what students do in class, in order
//   why      why it matters (one short paragraph)
//   home     "Practice at home" ideas (short list, neutral wording); optional and low-pressure

export const FAMILY = {
  'w1d1-3-5-intro-and-curl-ups': {
    title: 'Meet the test + curl-ups',
    summary: 'We learn how the Presidential Fitness Test works and practice the first core event: curl-ups.',
    steps: [
      ['Warm-up', 'Jogging in place, high knees, arm circles and a few easy sit-ups to get moving.'],
      ['How the test works', 'There are three categories: core, cardio and upper body. In each one, students pick one of two events. Awards are based on age on test day, not grade.'],
      ['Learning curl-ups', 'Knees bent, feet flat, arms crossed on the chest. Sit up, then lower back down until the shoulder blades touch the mat. No pulling on the neck.'],
      ['Partner practice', 'One partner works while the other counts good reps, then they switch. Students build up to a full one-minute try. These are practice numbers, not the real test.'],
      ['Cool-down', 'An easy walk and gentle stretches, then partners quiz each other on the three categories.'],
    ],
    why: 'A strong core helps with posture, balance and almost every sport and game.',
    home: [
      'Can you name the three categories (core, cardio, upper body) and the two event choices in each?',
      'Try a few slow curl-ups. Good form matters more than speed.',
    ],
  },
  'w1d2-3-5-plank': {
    title: 'Plank',
    summary: 'Students learn the plank, the other choice in the core category.',
    steps: [
      ['Warm-up', 'Light movement to loosen up shoulders, hips and core.'],
      ['Learning the plank', 'Forearms on the floor, body straight like a board from head to heels, eyes looking at the floor.'],
      ['Partner practice', 'A partner times the hold and calls “stop” when the body starts to sag or lift. Then they switch.'],
      ['Picking a favorite', 'Students compare curl-ups and plank and start thinking about which core event suits them.'],
      ['Cool-down', 'Stretching and a quick share about what felt easiest and hardest.'],
    ],
    why: 'Holding a plank builds the deep muscles that protect the back and keep the body steady.',
    home: [
      'Plank for 20 seconds, rest, and try again. Can you keep a straight back?',
      'Which core event do you like better so far, and why?',
    ],
  },
  'w2d1-3-5-mile-run': {
    title: 'One-mile run',
    summary: 'Students learn how to pace a one-mile run so they can finish strong.',
    steps: [
      ['Warm-up', 'Easy jogging and dynamic stretches.'],
      ['The talk test', 'Students learn a steady pace: if you can still say a short sentence while running, you are not going out too fast.'],
      ['Practice run', 'Students run or jog laps on a measured course toward one mile, staying on the path and finishing with control. Walking breaks are fine while they build up.'],
      ['Cool-down', 'Walking, water and stretching.'],
    ],
    why: 'Running builds heart and lung fitness, and learning to pace yourself helps in sports and in life.',
    home: [
      'Go for a walk or jog and practice a pace where you can still chat.',
      'Running shoes and a water bottle make a big difference on PE days.',
    ],
  },
  'w2d2-3-5-beep-test': {
    title: '20-meter beep test',
    summary: 'Students learn the beep test (also called the PACER), the other choice in the cardio category.',
    steps: [
      ['Warm-up', 'Easy jogging and practice turning at a line.'],
      ['How it works', 'Students run back and forth between two lines 20 meters apart, reaching the line before each beep. The beeps slowly get faster.'],
      ['Partner practice', 'One partner runs while the other counts laps. A runner is done after missing the line twice. Then they switch.'],
      ['Cool-down', 'Walking, water and stretching, then a chat about whether the mile or the beep test fits them better.'],
    ],
    why: 'The beep test is a fun way to build endurance and shows how your fitness grows a little at a time.',
    home: [
      'Play a quick game of “run to the line and back” in the yard or park.',
      'Which do you like better, the mile or the beep test?',
    ],
  },
  'w3d1-3-5-push-ups': {
    title: 'Right-angle push-ups',
    summary: 'Students learn right-angle push-ups, one of the two upper-body choices.',
    steps: [
      ['Warm-up', 'Arm circles, shoulder taps and other easy upper-body moves.'],
      ['Learning the push-up', 'Body straight like a board, lower down until the elbows make about a right angle (an “L”), then push all the way back up.'],
      ['Partner practice', 'A partner counts only good-form reps, then they switch. Students who need it can build strength with knee or wall push-ups first.'],
      ['Cool-down', 'Shoulder and arm stretches.'],
    ],
    why: 'Push-ups build strength in the arms, chest and shoulders, and good form keeps you safe as you get stronger.',
    home: [
      'Do a few wall or knee push-ups, slow and steady.',
      'Can you show what a “right angle” elbow looks like?',
    ],
  },
  'w3d2-3-5-pull-ups': {
    title: 'Pull-ups',
    summary: 'Students learn pull-ups, the other upper-body choice.',
    steps: [
      ['Warm-up', 'Easy arm and shoulder moves.'],
      ['Learning the pull-up', 'Hang from the bar, pull up until the chin is over the bar, then lower all the way down with straight arms.'],
      ['Safe tries', 'Students take turns at the bar with a partner or the coach counting. While they wait, they practice push-ups or a short bent-arm hang.'],
      ['Cool-down', 'Stretching and a share about which upper-body event they like.'],
    ],
    why: 'Pull-ups are hard for most students at first. Every try builds grip and back strength, and getting even one is a big win.',
    home: [
      'Monkey bars and hanging at the playground are great pull-up practice.',
      'Cheer for effort. Many students start with a hang and build from there.',
    ],
  },
  'w4d1-3-5-mixed-stations': {
    title: 'Mixed stations + choosing events',
    summary: 'Students try all six events at stations, then pick one favorite in each category.',
    steps: [
      ['Warm-up', 'A quick full-body warm-up.'],
      ['Station rotation', 'Small groups rotate through curl-ups, plank, running, the beep test, push-ups and pull-ups.'],
      ['Making choices', 'Each student picks one event for core, one for cardio and one for upper body on a choice card. They can still change their minds after next class.'],
      ['Cool-down', 'Stretching and a talk about why they chose each event.'],
    ],
    why: 'Choosing the event that fits you best builds confidence.',
    home: [
      'Which three events did you pick, and why?',
    ],
  },
  'w4d2-3-5-practice-test': {
    title: 'Practice test day',
    summary: 'A dress rehearsal: students try their chosen event in each category, just like test day. These are practice results only, not the official test.',
    steps: [
      ['Warm-up', 'The same warm-up they will do on test day.'],
      ['Practice tries', 'Students do their chosen core, cardio and upper-body events with partners counting.'],
      ['Final choices', 'Students confirm or switch their events for the official test.'],
      ['Cool-down', 'Stretching and a reminder that best effort matters most.'],
    ],
    why: 'A practice run takes away the nerves, so test day feels familiar.',
    home: [
      'Effort matters more than numbers. Trying your best is the goal.',
      'A good night’s sleep and breakfast help on PE days.',
    ],
  },
  'testing-d1-3-5-core': {
    title: 'Test day 1: Core',
    summary: 'The official test begins. Students do their core event: curl-ups in one minute or a plank hold.',
    steps: [
      ['Warm-up', 'The same warm-up they practiced.'],
      ['Quick review', 'The coach goes over form one more time so everyone knows exactly what counts.'],
      ['Official try', 'Students do their chosen core event while a partner or the coach counts or times.'],
      ['Cool-down', 'Stretching. Students who finish early do light, fun activities.'],
    ],
    why: 'This is one of three test days, one category per PE class, so no one has to do everything in a single day.',
    home: [
      'Wear sneakers and comfortable clothes, and bring a water bottle.',
      'Your best, honest effort is what counts.',
    ],
  },
  'testing-d2-3-5-cardio': {
    title: 'Test day 2: Cardio',
    summary: 'Students do their cardio event: the one-mile run or the 20-meter beep test.',
    steps: [
      ['Warm-up', 'Easy jogging and stretches.'],
      ['Official try', 'Mile runners run the measured course and get a finish time. Beep-test runners go between the lines while laps are counted.'],
      ['Cool-down', 'Walking, water and stretching.'],
    ],
    why: 'Cardio is the hardest day for many students. Pacing practice from the earlier weeks really pays off here.',
    home: [
      'Running shoes, weather-appropriate clothes and a water bottle (cardio may be outside).',
      'Sleep and breakfast make a big difference on this day.',
    ],
  },
  'testing-d3-3-5-upper-body': {
    title: 'Test day 3: Upper body',
    summary: 'Students do their upper-body event: right-angle push-ups or pull-ups. That finishes all three categories.',
    steps: [
      ['Warm-up', 'Arm and shoulder warm-up.'],
      ['Official try', 'Students do their chosen event while a partner or the coach counts good-form reps.'],
      ['Celebrate', 'Students finish all three categories and celebrate their hard work.'],
    ],
    why: 'After this day, Coach Kenny compares each student’s results to the official targets for their age.',
    home: [
      'How did the three test days feel? What are you proud of?',
    ],
  },
  'testing-d4-3-5-makeup': {
    title: 'Makeup day',
    summary: 'A chance for anyone who was absent or had an attempt interrupted to finish their events.',
    steps: [
      ['Makeup tries', 'Students who missed a category do it now, with the same rules as the regular test days.'],
      ['Everyone else', 'Students who already finished do fun, non-scored activities like jump rope, walking laps or stretching.'],
    ],
    why: 'Every 3rd–5th grader gets a fair chance to finish the test, even after a sick day or an absence.',
    home: [
      'Missed a test day? No worries. This day is for you.',
    ],
  },
  'w1-k2-preview-core': {
    title: 'Superhero core (preview)',
    summary: 'K–2 students try a few slow curl-ups and a short “superhero” plank. Just for fun: no scores and no testing.',
    steps: [
      ['Warm-up', 'Fun movement games.'],
      ['Try it', 'A few slow curl-ups and a short plank with a partner cheering them on. Kneeling planks are fine.'],
      ['Looking ahead', 'Students hear: “In 3rd grade you’ll get to try the Presidential Fitness Test!”'],
    ],
    why: 'Playful practice helps younger students feel excited and ready for 3rd grade.',
    home: [
      'Hold a superhero plank and count to ten.',
    ],
  },
  'w2-k2-preview-cardio': {
    title: 'Short runs + beep games (preview)',
    summary: 'K–2 students do short runs and a start-stop “beep” running game. No times, no scores.',
    steps: [
      ['Warm-up', 'Movement games to get the wiggles out.'],
      ['Short run', 'A short run or walk-run loop at their own pace.'],
      ['Beep game', 'Run to a line, freeze, and run back on the signal. The lines are much closer together than the real test.'],
    ],
    why: 'Running games build stamina and listening skills, and they are fun.',
    home: [
      'Play red light, green light or a “run to the tree and back” game.',
    ],
  },
  'w3-k2-preview-arms': {
    title: 'Strong arms (preview)',
    summary: 'K–2 students try wall or knee push-ups and a short hang from a bar. No counting for scores.',
    steps: [
      ['Warm-up', 'Arm circles and animal walks.'],
      ['Push-ups', 'Wall push-ups or knee push-ups with safe hands.'],
      ['Hang time', 'A short hang from a safe bar while taking turns. If there is no bar, students do animal walks instead.'],
    ],
    why: 'These moves build early arm and grip strength in a safe, playful way.',
    home: [
      'Try wall push-ups, or hang from the monkey bars at the park.',
    ],
  },
  'w4-k2-preview-stations': {
    title: 'Fun stations (preview)',
    summary: 'K–2 students rotate through fun mini stations that preview every event. No scores and no awards, just trying everything safely.',
    steps: [
      ['Stations', 'Short stations: a few curl-ups, a superhero plank, a short run, a beep game, wall or knee push-ups, and a short hang or animal walks.'],
      ['Looking ahead', 'The class says it together: “In 3rd grade you’ll get to try the Presidential Fitness Test!”'],
    ],
    why: 'Students leave proud of trying every station and excited for 3rd grade.',
    home: [
      'Which station was your favorite?',
    ],
  },
};
