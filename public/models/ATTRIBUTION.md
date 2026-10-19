# Cranium 3D skull data

**BodyParts3D, © The Database Center for Life Science.** BodyParts3D 4.0 geometry is licensed under **Creative Commons Attribution 4.0 International**.

- Official dataset: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- Official license information: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- License terms: https://creativecommons.org/licenses/by/4.0/
- Publication: Mitsuhashi et al. (2009), *BodyParts3D: 3D structure database for anatomical concepts*, Nucleic Acids Research. https://doi.org/10.1093/nar/gkn613

Distribution used: https://github.com/choxos/OMFAtlas at revision `c835665a9ade09ee0b993cee6eee1b25b7f7311b`, `public/models/high-resolution/`. These higher-detail browser assets were repacked from the official `isa_BP3D_4.0_obj_99.zip` archive by the distributor, without additional Human Atlas simplification. Its documented source archive SHA-256 is `40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e`.

Cranium selects only the 22 adult skull bones and 28 contextual permanent teeth. Coordinates, source triangles, FJ mesh IDs and FMA concept IDs are retained. Files are combined into `skull.bin` with adjusted byte offsets in `skull.json`. Display colours, selection, camera movements and the exploded arrangement are application effects; the assembled source geometry is not procedurally fabricated. Exploded positions illustrate the assembly and do not simulate physiological movements.

The adult male source is one anatomical reference. The archive is a reduced surface dataset and does not model every fine named landmark or internal cavity. The additional 28 teeth are visual context and are not counted as skull bones. No primary teeth, soft tissues, synthetic sinus surfaces or third-party dental patient datasets are included.

The distributor's original full attribution is retained in `BODYPARTS3D-ATTRIBUTION.md`; it also describes unrelated datasets that Cranium does not include. Its application MIT notice is retained in `DISTRIBUTOR-LICENSE.txt`. Cranium uses the licensed geometry, not the distributor's application implementation. Full per-file SHA-256 and Git blob checksums are recorded in `provenance.json` and tested locally.

## Separate 3D landmark dataset — CC BY-SA 4.0

`landmarks.json` adapts the authored osteological annotation points from **Z-Anatomy, Gauthier Kervyn and contributors**, https://github.com/Z-Anatomy/Models-of-human-anatomy , revision `767f14e0a4dfc55aa7c3455685b62339a4faec99`. Its source archive is `Z-Anatomy.zip`, Git blob `f43cabc6f366b2a6058dd2ed4a2b3c7b9b2492cb`, SHA-256 `e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736`. The source license notice is in `../licenses/Z-Anatomy-LICENSE.txt`; the adapted landmark data remains under https://creativecommons.org/licenses/by-sa/4.0/ .

Extraction reads the evaluated anatomical endpoint (vertex 1, with native Hook modifiers) of the source Blender `.j` lines. The other endpoint belongs to the text label and must not be mistaken for an anatomical location. Automatic Python execution in the source .blend was disabled. No Wikipedia definitions were used.

Adaptation converts Z-up coordinates to Y-up, registers 22 corresponding bone surfaces with one global similarity transform, mirrors bilateral reference points where necessary, and projects to the nearest vertex of the corresponding target bone. The measured RMS nearest-vertex residual for the model registration was 2.14 mm, 95th percentile 4.99 mm. Points projecting farther than 8 mm were excluded; the included maximum is 5.48 mm. These statistics describe geometric registration and tessellation differences, not medical certification of each landmark's position.

The subset contains 92 concepts at 114 side-specific points, on the frontal, parietal, temporal, occipital, sphenoid and mandibular bones. All other catalogue structures remain explicitly unmapped. Their positions were not fabricated. Original source points, source object names, adaptation data and the exact target vertex for each included point are retained for review.
