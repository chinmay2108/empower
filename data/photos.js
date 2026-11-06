/* ==========================================================================
   Photos of synthetic people (SAMPLE DATA)
   Maps a person's id to an image file in img/people/. Faces are AI
   generated (nobody real). Anyone missing here shows their initials.
   Filled by scripts/add_photos.py; empty until faces are added.
   ========================================================================== */

var Empower = typeof window !== "undefined" ? (window.Empower = window.Empower || {}) : {};

Empower.PHOTOS = {};

if (typeof module !== "undefined") { module.exports = Empower.PHOTOS; }
