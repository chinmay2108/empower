/* ==========================================================================
   Seed data: real recurring groups in Charlottesville, VA
   Researched from public listings on 2026-11-06. Each group has a `source`
   link and a `checked` date. `verify` says what still needs a human check
   (a call, a visit, or the organizer's page) before a live demo.

   What qualifies: meets every week, open to someone walking in alone,
   small enough (or split into teams/tables) that faces repeat.
   Left out on purpose: monthly groups (Silent Book Club at Albemarle
   CiderWorks, Rivanna Contra Dance), weekday 6am run crews (Prolyfyck,
   Cou Cou Rachou), because our free-time slots are evenings and weekends.

   weekday: 0 = Sunday ... 6 = Saturday
   time: 24-hour "HH:MM", local time
   structure: how much the activity does the talking for you
     "high"   = a shared task carries the conversation (trivia, lessons)
     "medium" = some structure (run club, game night)
     "low"    = open mingling (open mic crowd)
   mode: what carries the time together
     "doing"   = a shared activity (side by side)
     "talking" = conversation is the main event (face to face)
   ========================================================================== */

var Empower = typeof window !== "undefined" ? (window.Empower = window.Empower || {}) : {};

Empower.SEED_GROUPS = [
  {
    id: "g01", name: "Thursday Trivia at Alamo Drafthouse", category: "Games",
    interests: ["trivia", "games", "movies"], weekday: 4, time: "19:00", durationMin: 120,
    venue: "Alamo Drafthouse, 5th Street Station", structure: "high", typicalSize: 8, mode: "doing",
    description: "A themed trivia night most Thursdays: movies, TV, general. Teams of a few, so you can join one.",
    source: "https://www.eventbrite.com/d/va--charlottesville/trivia/", checked: "2026-11-06",
    verify: "Theme changes weekly; some nights are ticketed."
  },
  {
    id: "g02", name: "Random Row Run Club", category: "Fitness",
    interests: ["running", "fitness", "outdoors"], weekday: 1, time: "18:00", durationMin: 90,
    venue: "Random Row Brewing, 608 Preston Ave", structure: "medium", typicalSize: 15, mode: "doing",
    description: "Runners and walkers of every pace, then a raffle at the brewery. Close to 100 people on a big night, running in small pace groups.",
    source: "https://charlottesville.guide/blog/running-in-charlottesville", checked: "2026-11-06",
    verify: "Start time not on the listing; confirm with the brewery."
  },
  {
    id: "g03", name: "Lift the Spirit Community Choir", category: "Music",
    interests: ["music", "singing", "community"], weekday: 2, time: "19:00", durationMin: 90,
    venue: "Park Street Christian Church, 1200 Park St", structure: "high", typicalSize: 30, mode: "doing",
    description: "No audition, no music reading needed. Sliding-scale dues and nobody turned away.",
    source: "https://sites.google.com/view/liftthespiritvirginia/sing-with-us", checked: "2026-11-06",
    verify: "Fall season ends Nov 14; check the spring start date."
  },
  {
    id: "g04", name: "Swing Cville Wednesday Lessons", category: "Dance",
    interests: ["dancing", "music"], weekday: 3, time: "19:00", durationMin: 120,
    venue: "The Front Porch, 221 E Water St", structure: "high", typicalSize: 20, mode: "doing",
    description: "Beginner lesson at 7, social dancing at 8. No partner needed; you rotate.",
    source: "https://visitcharlottesville.org/events/weekly-swing-dance1", checked: "2026-11-06",
    verify: "Lessons around $10."
  },
  {
    id: "g05", name: "Open Gym Pickleball", category: "Sports",
    interests: ["pickleball", "sports", "fitness"], weekday: 2, time: "18:30", durationMin: 150,
    venue: "Agnor-Hurt Elementary gym, 3201 Berkmar Dr", structure: "high", typicalSize: 12, mode: "doing",
    description: "Indoor open play run by Albemarle County Parks & Rec. Rotating doubles, so you meet everyone.",
    source: "https://www.courtsource.us/pickleball/va/charlottesville/agnor-hurt-elementary", checked: "2026-11-06",
    verify: "Fall session runs to Dec 17; registration through Albemarle Parks & Rec."
  },
  {
    id: "g06", name: "Charlottesville Game Club", category: "Games",
    interests: ["board games", "games"], weekday: 4, time: "17:00", durationMin: 240,
    venue: "The End Games, 390 Hillsdale Dr", structure: "medium", typicalSize: 12, mode: "doing",
    description: "Find the people hovering around a stack of games and someone will teach you. Also meets Tuesdays.",
    source: "https://meetup.com/charlottesville-gaming-group", checked: "2026-11-06",
    verify: "Listings show both 5pm and 9pm; confirm on Meetup."
  },
  {
    id: "g07", name: "Saturday City Market", category: "Food",
    interests: ["food", "markets", "community"], weekday: 6, time: "09:00", durationMin: 120,
    venue: "City Market, 100 E Water St", structure: "medium", typicalSize: 10, mode: "talking",
    description: "100+ local vendors off the Downtown Mall. Same stalls every week, so you start recognizing people.",
    source: "https://www.whsv.com/2026/04/04/charlottesville-city-market-opens-2026-season/", checked: "2026-11-06",
    verify: "Season runs April to November; check the last date."
  },
  {
    id: "g08", name: "Monday Comedy Open Mic", category: "Performance",
    interests: ["comedy", "performance"], weekday: 1, time: "20:00", durationMin: 120,
    venue: "The Southern Café & Music Hall, 103 S 1st St", structure: "medium", typicalSize: 25, mode: "talking",
    description: "Hosted by Chris Alan, free, 18+. Sign up to try five minutes or just watch.",
    source: "https://www.visitcharlottesville.org/events/almost-every-monday-open-mic-hosted-by-chris-alan-18-7", checked: "2026-11-06",
    verify: "It says almost every Monday; check the venue calendar."
  },
  {
    id: "g09", name: "Loaves & Fishes Saturday Shift", category: "Volunteering",
    interests: ["volunteering", "community"], weekday: 6, time: "09:00", durationMin: 180,
    venue: "Loaves & Fishes Food Pantry, 2050 Lambs Rd", structure: "high", typicalSize: 10, mode: "doing",
    description: "Sort produce and pack groceries with the same crew each week. They welcome weekly regulars.",
    source: "https://thecne.org/?p=12934", checked: "2026-11-06",
    verify: "Shift hours come from an older posting; sign up via the pantry's volunteer page."
  },
  {
    id: "g10", name: "Monday Game Night at Starr Hill", category: "Games",
    interests: ["games", "board games"], weekday: 1, time: "17:00", durationMin: 240,
    venue: "Starr Hill Downtown, 946 Grady Ave", structure: "medium", typicalSize: 12, mode: "doing",
    description: "Meet up with others at the brewery, play a game, and maybe win a prize.",
    source: "https://visitcharlottesville.org/events/game-night-at-starr-hill-brewery5", checked: "2026-11-06",
    verify: "Listing date unclear; confirm it still runs."
  },
  {
    id: "g11", name: "Wednesday Open Mic at Holly's", category: "Music",
    interests: ["music", "performance"], weekday: 3, time: "21:00", durationMin: 150,
    venue: "Holly's Diner, 1221 E Market St", structure: "low", typicalSize: 25, mode: "talking",
    description: "Musicians, poets and everyone in between. Free signup; plenty of people just come to listen.",
    source: "https://visitcharlottesville.org/events/open-mic-night-27", checked: "2026-11-06",
    verify: "Listing date unclear; confirm it still runs."
  },
  {
    id: "g12", name: "Sunday Game Time at Rail Tales", category: "Games",
    interests: ["board games", "games"], weekday: 0, time: "12:00", durationMin: 480,
    venue: "Rail Tales, 705c Dale Ave", structure: "medium", typicalSize: 10, mode: "doing",
    description: "Drop in any time between noon and 8. Bring a game or learn one from the regulars.",
    source: "https://meetup.com/charlottesville-gaming-group", checked: "2026-11-06",
    verify: "Confirm hours on Meetup."
  },
  {
    id: "g13", name: "Wednesday Trivia at Starr Hill", category: "Games",
    interests: ["trivia", "games"], weekday: 3, time: "19:00", durationMin: 120,
    venue: "Starr Hill Downtown, 946 Grady Ave", structure: "high", typicalSize: 8, mode: "doing",
    description: "Weekly brewery trivia. Small teams, so it's easy to slot in with one.",
    source: "https://www.eventbrite.com/d/va--charlottesville/trivia/", checked: "2026-11-06",
    verify: ""
  },
  {
    id: "g14", name: "Charlottesville Chess Club", category: "Games",
    interests: ["chess", "games"], weekday: 1, time: "19:00", durationMin: 150,
    venue: "St. Mark Lutheran Church, 100 Alderman Rd", structure: "high", typicalSize: 15, mode: "doing",
    description: "Running for over 35 years. Every level, from beginners to state champions.",
    source: "https://bg.lichess.org/team/charlottesville-chess-club", checked: "2026-11-06",
    verify: "Club events are Monday 7pm; confirm the regular night by email."
  },
  {
    id: "g15", name: "Geeks Who Drink at Selvedge", category: "Games",
    interests: ["trivia", "games"], weekday: 3, time: "19:00", durationMin: 120,
    venue: "Selvedge Brewing, 2415 Ivy Rd (near Darden)", structure: "high", typicalSize: 8, mode: "doing",
    description: "Free weekly pub quiz with prizes. Ten minutes from Darden.",
    source: "https://visitcharlottesville.org/events/trivia-night-with-geeks-who-drink4", checked: "2026-11-06",
    verify: ""
  }
];

if (typeof module !== "undefined") { module.exports = Empower.SEED_GROUPS; }
