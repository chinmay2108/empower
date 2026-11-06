/* ==========================================================================
   Seed data: recurring groups (SAMPLE DATA)
   These are invented example groups for the prototype. Names and venues
   are placeholders, not real listings. Replace with real, verified groups
   before testing with real users.

   weekday: 0 = Sunday ... 6 = Saturday
   time: 24-hour "HH:MM", local time
   structure: how much the activity does the talking for you
     "high"   = a shared task carries the conversation (trivia, pottery)
     "medium" = some structure (book club, run club)
     "low"    = open mingling (open mic social)
   ========================================================================== */

var Empower = typeof window !== "undefined" ? (window.Empower = window.Empower || {}) : {};

Empower.SEED_GROUPS = [
  {
    id: "g01", name: "Thursday Trivia Crew", category: "Games",
    interests: ["trivia", "games"], weekday: 4, time: "19:00", durationMin: 120,
    venue: "Pub on the Downtown Mall (sample)", structure: "high", typicalSize: 8,
    description: "Teams of four. Newcomers get placed on a team, so nobody sits alone."
  },
  {
    id: "g02", name: "Morning Run Club", category: "Fitness",
    interests: ["running", "outdoors", "fitness"], weekday: 6, time: "08:00", durationMin: 75,
    venue: "Riverside trailhead (sample)", structure: "medium", typicalSize: 15,
    description: "Easy 5K at conversation pace, then coffee nearby."
  },
  {
    id: "g03", name: "Silent Book Club", category: "Books",
    interests: ["books", "reading"], weekday: 3, time: "18:30", durationMin: 90,
    venue: "Neighborhood cafe (sample)", structure: "medium", typicalSize: 10,
    description: "Read your own book for an hour, then chat about it."
  },
  {
    id: "g04", name: "Beginner Pottery Night", category: "Arts",
    interests: ["arts", "crafts"], weekday: 2, time: "18:00", durationMin: 120,
    venue: "Community studio (sample)", structure: "high", typicalSize: 8,
    description: "Hands busy, low pressure. Same small group for four weeks."
  },
  {
    id: "g05", name: "Pickup Volleyball", category: "Sports",
    interests: ["sports", "volleyball", "fitness"], weekday: 0, time: "16:00", durationMin: 120,
    venue: "Park courts (sample)", structure: "high", typicalSize: 12,
    description: "Rotating teams, all levels."
  },
  {
    id: "g06", name: "Board Game Social", category: "Games",
    interests: ["games", "board games"], weekday: 1, time: "19:00", durationMin: 150,
    venue: "Game shop back room (sample)", structure: "high", typicalSize: 14,
    description: "Hosts teach a game to each new table."
  },
  {
    id: "g07", name: "Farmers Market Walk", category: "Food",
    interests: ["food", "outdoors"], weekday: 6, time: "10:00", durationMin: 90,
    venue: "City market (sample)", structure: "medium", typicalSize: 10,
    description: "Walk the stalls together, end with brunch."
  },
  {
    id: "g08", name: "Improv for Beginners", category: "Performance",
    interests: ["comedy", "theater", "performance"], weekday: 3, time: "19:30", durationMin: 90,
    venue: "Black box theater (sample)", structure: "high", typicalSize: 12,
    description: "Games, not shows. Nobody performs alone."
  },
  {
    id: "g09", name: "Weekend Volunteer Crew", category: "Volunteering",
    interests: ["volunteering", "community"], weekday: 0, time: "10:00", durationMin: 180,
    venue: "Food bank (sample)", structure: "high", typicalSize: 10,
    description: "Sort and pack in pairs. Same crew most weeks."
  },
  {
    id: "g10", name: "Climbing Gym Meetup", category: "Fitness",
    interests: ["climbing", "fitness"], weekday: 4, time: "18:00", durationMin: 120,
    venue: "Bouldering gym (sample)", structure: "medium", typicalSize: 10,
    description: "Climb in small groups, swap beta between problems."
  },
  {
    id: "g11", name: "Open Mic Social", category: "Music",
    interests: ["music", "performance"], weekday: 5, time: "20:00", durationMin: 150,
    venue: "Coffeehouse (sample)", structure: "low", typicalSize: 25,
    description: "Listen, mingle between sets. Performing is optional."
  },
  {
    id: "g12", name: "Sunday Hike Group", category: "Outdoors",
    interests: ["hiking", "outdoors"], weekday: 0, time: "09:00", durationMin: 240,
    venue: "Carpool from downtown (sample)", structure: "medium", typicalSize: 12,
    description: "Moderate trail, carpools arranged in the group."
  },
  {
    id: "g13", name: "Spanish Language Exchange", category: "Learning",
    interests: ["languages", "learning"], weekday: 2, time: "19:00", durationMin: 90,
    venue: "Library meeting room (sample)", structure: "high", typicalSize: 12,
    description: "Pairs switch between Spanish and English every 15 minutes."
  },
  {
    id: "g14", name: "Cooking Club Potluck", category: "Food",
    interests: ["food", "cooking"], weekday: 5, time: "19:00", durationMin: 150,
    venue: "Rotating member homes (sample)", structure: "medium", typicalSize: 8,
    description: "Monthly theme, everyone brings one dish."
  },
  {
    id: "g15", name: "Photo Walk", category: "Arts",
    interests: ["photography", "arts", "outdoors"], weekday: 6, time: "16:00", durationMin: 120,
    venue: "Meets at the pavilion (sample)", structure: "medium", typicalSize: 10,
    description: "A weekly theme and a route. Phones are fine."
  }
];

if (typeof module !== "undefined") { module.exports = Empower.SEED_GROUPS; }
