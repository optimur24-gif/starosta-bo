# Z-Anatomy body subset

Z-Anatomy, Gauthier Kervyn and contributors, including the underlying BodyParts3D work credited by Z-Anatomy. Source: https://www.z-anatomy.com/ and https://github.com/Z-Anatomy/Models-of-human-anatomy .

License: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0). Full notice: ../../licenses/Z-Anatomy-LICENSE.txt . License terms: https://creativecommons.org/licenses/by-sa/4.0/ . These adapted assets retain CC BY-SA 4.0; this license is separate from the app's MIT code and the earlier BodyParts3D 4.0 skull subset's CC BY 4.0.

Pinned source revision: 767f14e0a4dfc55aa7c3455685b62339a4faec99. SHA-256 of original Z-Anatomy.zip: e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736. SHA-256 of original Blender file: 9f08a17ea0115fed80b2a73ecdf0a1bc2ab2f6956f37c593ce23d513ea35afcd. SHA-256 of source TA2.csv: 0f9092a328b27dcd15d696d9f9a4087deb229a1aad21b75876657622de835974.

Adaptations: skeletal, muscular and joint mesh subsets; object transforms applied; Z-up converted to Y-up; normals packed as normalized int16; triangle indices packed; gzip transport. Surface geometry is not replaced with procedural primitives. No Wikipedia definitions or embedded Python scripts were imported/executed. Russian names are editorial translations; Latin terms and TA2 identifiers retain the original source mapping where available. Serial bone names are formed from anatomical Latin terms and Roman numerals.

Articular overlays reuse triangles assigned the original Cartilage material on bone objects. Muscle/ligament attachment overlays reuse the original muscular-insertion meshes, partitioned by nearest bone vertex within 6 mm to support isolated-bone viewing. This association is spatial, not an expert-certified attachment map. Ligament attachment overlays exist only for the source patellar/long-plantar attachment meshes. Absence of an overlay means absence of source coverage, not absence of the anatomical attachment.

192 landmark anchors retain the source annotation endpoints, evaluated with native Hook geometry modifiers and projected to source bone vertices within 8 mm. No arbitrary coordinates were added. Source names, IDs, parents, projection distances, source hashes, pack hashes and offsets are recorded in manifest.json. Counts are mesh objects (including sides and muscle heads), not a canonical count of bones/muscles/ligaments.

Reproduce: acquire and verify the pinned source archive and TA2.csv, then run Blender with factory startup and --disable-autoexec using scripts/export-body.py. Verify committed output offline with python3 scripts/verify-body.py.
