/* ==========================================================================
   store.js: the data layer (the "Model")

   This is the ONLY file that reads or writes saved data. Pages call these
   functions; they never touch localStorage directly. That way, if we move
   from the browser's storage to a real database later, only this file
   changes.

   Rules for teammates:
   - Keep business rules OUT of this file (for example "you cannot commit to
     two events at the same time"). Those belong in the feature's own JS file.
   - Changing the shape of saved data? Open a separate small PR for this file
     and tell the team, because every page depends on it.

   Entities (see README, "Data model"):
     Profile      one per browser:  { name, interests[], freeSlots[], comfort, createdAt }
                                    freeSlots like "thu-eve", "sat-am"; comfort "easy" | "nervous" | "anxious"
     Group        seed data:        see data/groups.js
     Session      generated:        see js/schedule.js
     Commitment   many:             { id, sessionId, groupId, startsAt, leaveAt, travelMode, status, createdAt }
                                    status: "committed" | "cancelled" | "attended" | "missed"
     Reflection   many:             { id, commitmentId, enjoyed (1-3), talkedToSomeone (bool),
                                      wouldReturn (bool), note, createdAt }
   ========================================================================== */

window.Empower = window.Empower || {};

Empower.store = (function () {
  var KEYS = {
    profile: "empower.profile",
    commitments: "empower.commitments",
    reflections: "empower.reflections"
  };

  function read(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      Empower.log("store.read_failed", { key: key, error: String(err) });
      return fallback;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      Empower.log("store.write_failed", { key: key, error: String(err) });
      return false;
    }
  }

  function newId(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  return {
    /* ---- Profile ---- */
    getProfile: function () {
      return read(KEYS.profile, null);
    },
    saveProfile: function (profile) {
      var saved = Object.assign({ createdAt: new Date().toISOString() }, profile);
      write(KEYS.profile, saved);
      Empower.log("store.profile_saved", { interests: saved.interests });
      return saved;
    },

    /* ---- Groups (read-only seed data) ---- */
    getGroups: function () {
      return Empower.SEED_GROUPS.slice();
    },
    getGroup: function (groupId) {
      return Empower.SEED_GROUPS.find(function (g) { return g.id === groupId; }) || null;
    },

    /* ---- Commitments ---- */
    getCommitments: function () {
      return read(KEYS.commitments, []);
    },
    addCommitment: function (fields) {
      var list = read(KEYS.commitments, []);
      var item = Object.assign(
        { id: newId("c"), status: "committed", createdAt: new Date().toISOString() },
        fields
      );
      list.push(item);
      write(KEYS.commitments, list);
      Empower.log("store.commitment_added", { id: item.id, sessionId: item.sessionId });
      return item;
    },
    updateCommitment: function (id, changes) {
      var list = read(KEYS.commitments, []);
      var found = null;
      list = list.map(function (c) {
        if (c.id !== id) return c;
        found = Object.assign({}, c, changes);
        return found;
      });
      write(KEYS.commitments, list);
      Empower.log("store.commitment_updated", { id: id, changes: changes });
      return found;
    },

    /* ---- Reflections ---- */
    getReflections: function () {
      return read(KEYS.reflections, []);
    },
    addReflection: function (fields) {
      var list = read(KEYS.reflections, []);
      var item = Object.assign({ id: newId("r"), createdAt: new Date().toISOString() }, fields);
      list.push(item);
      write(KEYS.reflections, list);
      Empower.log("store.reflection_added", { id: item.id, commitmentId: item.commitmentId });
      return item;
    },

    getCommitment: function (id) {
      return read(KEYS.commitments, []).find(function (c) { return c.id === id; }) || null;
    },

    /* ---- Testing helper: wipe all saved data in this browser ---- */
    resetAll: function () {
      Object.keys(KEYS).forEach(function (k) { window.localStorage.removeItem(KEYS[k]); });
      window.localStorage.removeItem("empower.clockOffsetMs");
      Empower.log("store.reset", {});
    }
  };
})();
