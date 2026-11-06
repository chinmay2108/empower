"""Give every synthetic person a face (AI generated, nobody real).

Source: the StyleGAN2 faces at https://github.com/sejas/ai-StyleGAN2-faces
(clone it, then pass its images/ folder). scripts/face_labels.txt lists the
hand-picked adult faces and whether each reads as a man or a woman.

Each person gets a face that fits their first name (men's names a man's
face, women's names a woman's face, names that work either way whatever is
left), in id order, with no face used twice. Faces are cropped around the head,
shrunk to 160x160 and saved as img/people/<id>.jpg; data/photos.js maps ids
to files.

Run from the repo root:
  python3 scripts/add_photos.py /path/to/ai-StyleGAN2-faces/images
"""

import json
import os
import subprocess
import sys

from PIL import Image

WOMEN = set("""Aaliyah Abby Adaeze Aditi Aisha Alicia Amara Ana Anika Ava Bianca Bri Camila Chloe Danielle
Deepa Elena Emily Fatima Grace Hannah Ines Isabel Jada Jasmine Jen Jess Julia Kavya Keisha Lauren Layla
Lily Maya Maria Mei Mia Mina Nadia Naomi Nia Nora Olivia Priya Rachel Rania Rosa Sana Sara Shreya Sofia
Tessa Uma Yara Zara Zoe""".split())
EITHER = set("Alex Chris Dana Devon Jordan Kai Quinn Sam Chen Wei".split())
SIZE = 160


def load_population():
    out = subprocess.check_output(["node", "-e", "console.log(JSON.stringify(require('./data/population.js')))"])
    return json.loads(out)


def main(src):
    faces = {"M": [], "F": []}
    for line in open("scripts/face_labels.txt"):
        if line.startswith("#") or not line.strip():
            continue
        name, sex = line.split()
        faces[sex].append(name)

    os.makedirs("img/people", exist_ok=True)
    photos = {}
    for person in load_population():
        first = person["name"].split()[0]
        if first in EITHER:
            pool = faces["F"] if len(faces["F"]) >= len(faces["M"]) else faces["M"]
        else:
            pool = faces["F"] if first in WOMEN else faces["M"]
        if not pool:
            continue  # no face left: this person keeps their initials
        src_name = pool.pop(0)
        im = Image.open(os.path.join(src, src_name)).convert("RGB")
        w, h = im.size  # faces are centered; keep the middle 84%, a little above center
        m = int(w * 0.08)
        top = int(h * 0.04)
        im = im.crop((m, top, w - m, top + (w - 2 * m))).resize((SIZE, SIZE), Image.LANCZOS)
        im.save("img/people/%s.jpg" % person["id"], quality=72, optimize=True, progressive=True)
        photos[person["id"]] = person["id"] + ".jpg"

    header = open("data/photos.js").read().split("Empower.PHOTOS =")[0]
    with open("data/photos.js", "w") as f:
        f.write(header + "Empower.PHOTOS = " + json.dumps(photos) + ";\n\n"
                'if (typeof module !== "undefined") { module.exports = Empower.PHOTOS; }\n')
    print("faces assigned:", len(photos), "of", len(load_population()))


if __name__ == "__main__":
    main(sys.argv[1])
