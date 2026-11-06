"""Generate the synthetic Empower population: data/population.js

SYNTHETIC DATA. Every person here is invented by this script from a fixed
random seed. No real people, no scraped data. Rerunning the script produces
the same file.

What it makes:
  - 500 users in Charlottesville, each with interests, free times, a comfort
    level, and memberships in 1 to 3 recurring groups that fit them.
  - Each membership has a weekly attendance probability. js/people.js turns
    that into who attended (or is going to) any session, for any week, with
    a deterministic hash, so history and upcoming sessions are consistent
    without storing every row.
  - Each group gets a few regulars (attend most weeks) and a long tail of
    occasional members, so expected Empower turnout per session is about
    60% of the group's usual size.

Run from the repo root (needs Node for reading groups):  python3 scripts/generate_population.py
"""
import json
import random
import subprocess
from pathlib import Path

SEED = 2026
N_USERS = 500
ROOT = Path(__file__).resolve().parent.parent
REFERENCE_WEEK = 44  # week index of Nov 8, 2026 (see js/people.js weekIndex)
SHARE_OF_GROUP = 0.6

rng = random.Random(SEED)

FIRST = """Aaliyah Aaron Abby Adaeze Aditi Adrian Aisha Alex Alicia Amara Amir Ana Andre Anika Arjun Ava Ben
Bianca Brandon Bri Caleb Camila Carlos Chen Chloe Chris Dana Daniel Danielle Deepa Devon Diego Elena Eli Emeka
Emily Ethan Fatima Felix Gabe Grace Hannah Hassan Hiro Ines Isaac Isabel Jada Jamal Jasmine Javier Jen Jess
Jordan Jose Julia Kai Kavya Keisha Kenji Kevin Kofi Lauren Layla Leo Lily Lucas Luis Maya Malik Marco Maria
Matt Mei Mia Miguel Mina Nadia Naomi Nate Nia Nikhil Noah Nora Olivia Omar Owen Pablo Priya Quinn Rachel Rahul
Rania Ravi Rosa Ryan Sam Sana Sara Sean Shreya Sofia Tariq Tessa Theo Tom Tyler Uma Victor Wei Will Yara Yusuf
Zara Zoe""".split()
LAST_INITIALS = list("ABCDEFGHJKLMNOPRSTVWY")
NEIGHBORHOODS = ["Downtown", "Belmont", "Fry's Spring", "Rugby", "Fifeville", "North Downtown", "Locust Grove",
                 "Woolen Mills", "The Corner", "Barracks Road", "Pantops", "Greenbrier"]
FROM = ["DC", "Richmond", "New York", "Atlanta", "Chicago", "Boston", "Raleigh", "Philadelphia", "Austin",
        "Baltimore", "Charlotte", "Seattle", "Denver", "Mumbai", "Lagos", "London", "Toronto", "Seoul"]
WHY = ["a new job", "grad school", "a residency", "my partner's job", "a fresh start", "remote work",
       "a fellowship", "family"]
SLOTS = ["mon-eve", "tue-eve", "wed-eve", "thu-eve", "fri-eve", "sat-am", "sat-pm", "sun-am", "sun-pm"]
DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]


def load_groups():
    """Read the seed groups from data/groups.js using Node (needs Node 18+)."""
    out = subprocess.run(["node", "-e", "console.log(JSON.stringify(require('./data/groups.js')))"],
                         cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def slot_for(group):
    hour = int(group["time"].split(":")[0])
    day = DAY_KEYS[group["weekday"]]
    if day in ("sat", "sun"):
        return day + ("-am" if hour < 12 else "-pm")
    return day + ("-eve" if hour >= 17 else "-day")


def make_user(i, groups, all_interests):
    comfort = rng.choices(["easy", "nervous", "anxious"], weights=[3, 5, 2])[0]
    interests = rng.sample(all_interests, rng.randint(3, 6))
    free = sorted(rng.sample(SLOTS, rng.randint(2, 5)), key=SLOTS.index)
    moved = rng.randint(1, 18)

    def fit(g):
        shared = len(set(g["interests"]) & set(interests))
        score = shared * 2 + (2 if slot_for(g) in free else -3)
        if comfort != "easy" and g["structure"] == "low":
            score -= 2
        return score

    ranked = sorted(groups, key=lambda g: (-fit(g), rng.random()))
    candidates = [g for g in ranked if fit(g) > 0][:4] or ranked[:1]
    k = min(len(candidates), rng.choices([1, 2, 3], weights=[4, 4, 2])[0])
    reliability = round(rng.betavariate(6, 2), 2)
    memberships = [{"groupId": g["id"], "p": round(reliability * rng.uniform(0.4, 1.0), 3)} for g in candidates[:k]]

    first = rng.choice(FIRST)
    return {
        "id": "u%03d" % (i + 1),
        "name": "%s %s." % (first, rng.choice(LAST_INITIALS)),
        "age": rng.randint(23, 34),
        "neighborhood": rng.choice(NEIGHBORHOODS),
        "movedMonthsAgo": moved,
        "joinedWeek": REFERENCE_WEEK - min(40, moved * 4 + rng.randint(-2, 2)),
        "bio": "Moved from %s %s for %s." % (
            rng.choice(FROM), "%d months ago" % moved if moved > 1 else "last month", rng.choice(WHY)),
        "interests": interests,
        "freeSlots": free,
        "comfort": comfort,
        "warmth": round(rng.uniform(0.2, 0.9), 2),
        "reliability": reliability,
        "memberships": memberships,
    }


def scale_to_group_sizes(users, groups):
    """Give each group a core of regulars plus a long tail of occasional members.

    Real groups run on regulars, and repeat contact with regulars is how
    friendships form, so about 60% of a session's expected Empower turnout
    comes from a few people who attend most weeks (probability 0.6 to 0.9).
    The rest is spread across everyone else in the group.
    """
    for g in groups:
        members = [m for u in users for m in u["memberships"] if m["groupId"] == g["id"]]
        target = max(3, round(g["typicalSize"] * SHARE_OF_GROUP))
        rng.shuffle(members)
        members.sort(key=lambda m: -m["p"])
        n_core = max(2, round(target * 0.6 / 0.75))
        core, tail = members[:n_core], members[n_core:]
        for m in core:
            m["p"] = round(rng.uniform(0.6, 0.9), 3)
        remaining = max(0.0, target - sum(m["p"] for m in core))
        tail_sum = sum(m["p"] for m in tail)
        for m in tail:
            m["p"] = round(min(0.5, m["p"] * remaining / tail_sum), 3) if tail_sum else 0.0


def main():
    groups = load_groups()
    all_interests = sorted({i for g in groups for i in g["interests"]})
    users = [make_user(i, groups, all_interests) for i in range(N_USERS)]
    scale_to_group_sizes(users, groups)

    payload = json.dumps(users, separators=(",", ":"), ensure_ascii=False)
    out = ROOT / "data" / "population.js"
    out.write_text(
        "/* SYNTHETIC DATA generated by scripts/generate_population.py (seed %d).\n"
        "   %d invented people. Not real users. Do not edit by hand; rerun the script. */\n"
        'var Empower = typeof window !== "undefined" ? (window.Empower = window.Empower || {}) : {};\n'
        "Empower.POPULATION = %s;\n"
        'if (typeof module !== "undefined") { module.exports = Empower.POPULATION; }\n'
        % (SEED, N_USERS, payload)
    )

    per_group = {g["id"]: round(sum(m["p"] for u in users for m in u["memberships"] if m["groupId"] == g["id"]), 1)
                 for g in groups}
    print("wrote %s (%d KB)" % (out.relative_to(ROOT), out.stat().st_size // 1024))
    print("expected Empower members per session:", per_group)


if __name__ == "__main__":
    main()
