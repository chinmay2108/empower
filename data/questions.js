/* ==========================================================================
   Question bank: "this or that" pairs (SAMPLE DATA)

   Each pair measures one dimension. Option "a" leans to -1, option "b"
   leans to +1:
     energy   a = small, familiar groups     b = bigger, lively crowds
     style    a = doing something together   b = talking face to face
     novelty  a = the same favorites         b = something new
     rhythm   a = a set weekly routine       b = spontaneous plans

   Both options in a pair should feel equally appealing, so nobody picks the
   answer that sounds better. Pairs were drafted and balanced with AI, then
   edited by hand. "onboarding: true" pairs are asked at signup (2 per
   dimension); the rest are asked one a day on Home, in this order.
   ========================================================================== */

var Empower = typeof window !== "undefined" ? (window.Empower = window.Empower || {}) : {};

Empower.QUESTIONS = [
  /* ---- Onboarding: 2 per dimension ---- */
  { id: "q01", dim: "energy", onboarding: true, a: "Dinner with five people you're getting to know", b: "A packed party where anything could happen" },
  { id: "q02", dim: "style", onboarding: true, a: "Building something side by side", b: "A long conversation over coffee" },
  { id: "q03", dim: "novelty", onboarding: true, a: "Your usual spot, done really well", b: "A place you've never tried" },
  { id: "q04", dim: "rhythm", onboarding: true, a: "Same night every week, on the calendar", b: "Deciding the day of" },
  { id: "q05", dim: "energy", onboarding: true, a: "A table of regulars who know your name", b: "A room full of new faces" },
  { id: "q06", dim: "style", onboarding: true, a: "A game that keeps your hands busy", b: "A table where the talk is the main event" },
  { id: "q07", dim: "novelty", onboarding: true, a: "Getting really good at one thing", b: "Sampling a bit of everything" },
  { id: "q08", dim: "rhythm", onboarding: true, a: "A plan made days ahead", b: "A 5pm text: who's in tonight?" },

  /* ---- Daily: one a day ---- */
  { id: "q09", dim: "style", a: "Cooking a meal together", b: "Being cooked for and talking all night" },
  { id: "q10", dim: "energy", a: "A small workshop with eight people", b: "A festival with a few hundred" },
  { id: "q11", dim: "novelty", a: "Rereading a favorite book", b: "Starting a book nobody's mentioned" },
  { id: "q12", dim: "rhythm", a: "A standing Sunday hike", b: "Whichever trail looks good that morning" },
  { id: "q13", dim: "style", a: "Doubles at the volleyball court", b: "A walk where you just talk" },
  { id: "q14", dim: "energy", a: "A quiet bar where you can hear yourself", b: "A loud bar with a great crowd" },
  { id: "q15", dim: "novelty", a: "The same team every trivia night", b: "A new team each time" },
  { id: "q16", dim: "rhythm", a: "Knowing your week by Monday", b: "Leaving room for surprises" },
  { id: "q17", dim: "style", a: "Painting next to someone", b: "Swapping stories with someone" },
  { id: "q18", dim: "energy", a: "Getting close to two or three people", b: "Knowing a little about lots of people" },
  { id: "q19", dim: "novelty", a: "A restaurant where you know the menu", b: "Ordering the dish you can't pronounce" },
  { id: "q20", dim: "rhythm", a: "A class that runs for six weeks", b: "A drop-in you can try once" },
  { id: "q21", dim: "style", a: "Volunteering on a shared task", b: "A dinner where everyone shares a story" },
  { id: "q22", dim: "energy", a: "A board game for four", b: "A game night for thirty" },
  { id: "q23", dim: "novelty", a: "Going deep on a hobby you love", b: "Trying a hobby you've never done" },
  { id: "q24", dim: "rhythm", a: "Saturday mornings are always the run", b: "Saturday mornings are whatever comes up" },
  { id: "q25", dim: "style", a: "Climbing with a partner", b: "Coffee with a partner after" },
  { id: "q26", dim: "energy", a: "Being one of the regulars", b: "Being the new face in the room" },
  { id: "q27", dim: "novelty", a: "The neighborhood you know best", b: "A neighborhood you've never walked" },
  { id: "q28", dim: "rhythm", a: "Booking the ticket early", b: "Grabbing a ticket at the door" },
  { id: "q29", dim: "style", a: "A puzzle you solve as a team", b: "A question you debate as a group" },
  { id: "q30", dim: "energy", a: "A host who introduces you around", b: "Finding your own way in a crowd" }
];

if (typeof module !== "undefined") { module.exports = Empower.QUESTIONS; }
