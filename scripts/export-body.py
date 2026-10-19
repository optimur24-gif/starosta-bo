"""Run inside Blender with --factory-startup --disable-autoexec on the pinned Z-Anatomy file.

Lossless geometry packing; material-labelled articular regions and original
attachment polygons are retained, not generated from anatomical guesses.
"""
import bpy
import csv
import gzip
import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from mathutils.kdtree import KDTree

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public' / 'models' / 'body'
SOURCE = Path(bpy.data.filepath)
BLEND_SHA = '9f08a17ea0115fed80b2a73ecdf0a1bc2ab2f6956f37c593ce23d513ea35afcd'
CSV_SHA = '0f9092a328b27dcd15d696d9f9a4087deb229a1aad21b75876657622de835974'
CSV_PATH = Path(__import__('os').environ.get('BODY_TA2_CSV', str(SOURCE.with_name('z-TA2.csv'))))


def sha(data):
    return hashlib.sha256(data).hexdigest()


if sha(SOURCE.read_bytes()) != BLEND_SHA or sha(CSV_PATH.read_bytes()) != CSV_SHA:
    raise RuntimeError('Pinned scientific source checksum mismatch')
OUTPUT.mkdir(parents=True, exist_ok=True)

terms = {}
for line in CSV_PATH.read_text(encoding='utf-8-sig').splitlines():
    row = next(csv.reader([line.strip().strip('"')], delimiter=';'))
    if len(row) > 2 and row[0].isdigit():
        english = row[1][1:-1] if row[1].startswith('(') and row[1].endswith(')') else row[1]
        latin = row[2][1:-1] if row[2].startswith('(') and row[2].endswith(')') else row[2]
        terms.setdefault(english.casefold(), {'latin': latin, 'ta2': row[0]})


def base_name(name):
    name = re.sub(r'\.(?:[oe]\d*)?[rl]$', '', name)
    return name[1:-1] if name.startswith('(') and name.endswith(')') else name


def term(name):
    key = base_name(name).casefold()
    return terms.get(key, terms.get(key.removesuffix(' muscle'), {}))


def region(obj, positions=None):
    names = {c.name for c in obj.users_collection}
    for source, result in [('Left upper limb', 'upper-left'), ('Right upper limb', 'upper-right'), ('Left lower limb', 'lower-left'), ('Right lower limb', 'lower-right'), ('Head', 'head'), ('Neck', 'neck'), ('Pelvis', 'pelvis'), ('Thorax', 'thorax'), ('Abdomen', 'abdomen')]:
        if source in names:
            return result
    if positions is not None:
        height = float(positions[:, 1].mean())
        return 'head' if height > 1.5 else 'neck' if height > 1.4 else 'thorax' if height > 1.1 else 'abdomen' if height > .9 else 'pelvis'
    return 'thorax'


def geometry(obj):
    mesh = obj.data
    mesh.calc_loop_triangles()
    positions = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
    normals = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
    indices = np.empty(len(mesh.loop_triangles) * 3, dtype=np.int32)
    polygons = np.empty(len(mesh.loop_triangles), dtype=np.int32)
    mesh.vertices.foreach_get('co', positions)
    mesh.vertices.foreach_get('normal', normals)
    mesh.loop_triangles.foreach_get('vertices', indices)
    mesh.loop_triangles.foreach_get('polygon_index', polygons)
    positions = positions.reshape(-1, 3)
    normals = normals.reshape(-1, 3)
    matrix = np.array(obj.matrix_world, dtype=np.float64)
    positions = positions @ matrix[:3, :3].T + matrix[:3, 3]
    normals = normals @ np.linalg.inv(matrix[:3, :3])
    positions = positions[:, [0, 2, 1]]
    positions[:, 2] *= -1
    normals = normals[:, [0, 2, 1]]
    normals[:, 2] *= -1
    normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
    indices = indices.reshape(-1, 3)
    if np.linalg.det(matrix[:3, :3]) < 0:
        indices = indices[:, [0, 2, 1]]
    material_indices = np.array([p.material_index for p in mesh.polygons], dtype=np.int32)[polygons]
    return positions.astype('<f4'), (normals * 32767).round().astype('<i2'), indices.astype('<u4'), material_indices


parts = []
packs = defaultdict(bytearray)
source_objects = []


def add(obj, kind, positions, normals, indices, *, zone=None, parent=None, suffix='', part_region=None):
    if not len(indices):
        return None
    if zone:
        unique, inverse = np.unique(indices.ravel(), return_inverse=True)
        positions, normals, indices = positions[unique], normals[unique], inverse.reshape(-1, 3).astype('<u4')
    name = base_name(obj.name)
    name_term = term(obj.name)
    side = 'left' if re.search(r'[oe]?\d*l$', obj.name.split('.')[-1]) and '.' in obj.name else 'right' if obj.name.endswith('r') and '.' in obj.name else None
    area = part_region or region(obj, positions)
    pack_name = f'{"zones" if zone else kind}-{area}.bin.gz'
    binary = packs[pack_name]
    position_offset = len(binary)
    binary.extend(positions.tobytes())
    normal_offset = len(binary)
    binary.extend(normals.tobytes())
    binary.extend(b'\0' * ((-len(binary)) % 4))
    index_offset = len(binary)
    binary.extend(indices.astype('<u4').tobytes())
    item = {
        'id': f'z{len(parts):04d}', 'sourceName': obj.name, 'name': name,
        'latin': name_term.get('latin'), 'ta2': name_term.get('ta2'),
        'kind': kind, 'region': area, 'side': side, 'pack': pack_name,
        'positions': position_offset, 'normals': normal_offset, 'indices': index_offset,
        'vertexCount': len(positions), 'indexCount': int(indices.size),
        'bounds': [positions.min(axis=0).tolist(), positions.max(axis=0).tolist()],
        'zone': zone, 'parent': parent,
    }
    parts.append(item)
    return item


def meshes(collection):
    return sorted([o for o in bpy.data.collections[collection].all_objects if o.type == 'MESH' and len(o.data.polygons) > 2 and not o.name.endswith(('.j', '.g'))], key=lambda o: o.name)


bones = []
bone_geometry = {}
articular_materials = Counter()
for obj in meshes('1: Skeletal system'):
    if any(word in obj.name.lower() for word in ['sinus', 'cells of ethmoid']):
        continue
    positions, normals, indices, materials = geometry(obj)
    kind = 'joint' if 'cartilage' in obj.name.lower() else 'tooth' if any(word in obj.name.lower() for word in ['tooth', 'incisor', 'canine', 'premolar', 'molar']) else 'bone'
    item = add(obj, kind, positions, normals, indices)
    source_objects.append(obj.name)
    if kind != 'bone':
        continue
    bones.append(item)
    bone_geometry[item['id']] = (obj, positions, normals, indices)
    cartilage_slots = [i for i, material in enumerate(obj.data.materials) if material and 'cartilage' in material.name.lower()]
    articular_materials.update([material.name for material in obj.data.materials if material])
    if cartilage_slots:
        selected = indices[np.isin(materials, cartilage_slots)]
        add(obj, 'zone', positions, normals, selected, zone='articular', parent=item['id'], part_region=item['region'])

for collection, kind in [('Muscles', 'muscle'), ('3: Joints', 'joint')]:
    for obj in meshes(collection):
        if obj.name in source_objects:
            continue
        positions, normals, indices, _ = geometry(obj)
        actual_kind = 'ligament' if any(word in obj.name.lower() for word in ['ligament', 'interosseous membrane']) else 'connective' if kind == 'muscle' and any(word in obj.name.lower() for word in ['tendon', 'tendinous', 'retinaculum', 'aponeurosis', 'tract', 'tarsus', 'linea alba', 'trochlea of']) else kind
        add(obj, actual_kind, positions, normals, indices)
        source_objects.append(obj.name)

count = sum(len(bone_geometry[b['id']][1]) for b in bones)
tree = KDTree(count)
owner = []
for index, bone in enumerate(bones):
    for position in bone_geometry[bone['id']][1]:
        tree.insert(position, len(owner))
        owner.append(index)
tree.balance()

unassigned = []
attachment_source_count = 0
for obj in meshes('2: Muscular insertions'):
    positions, normals, indices, _ = geometry(obj)
    grouped = defaultdict(list)
    for face in indices:
        middle = positions[face].mean(axis=0)
        _, vertex_index, distance = tree.find(middle)
        if distance <= .006:
            grouped[owner[vertex_index]].append(face)
    if not grouped:
        unassigned.append(obj.name)
        continue
    attachment_source_count += 1
    source_objects.append(obj.name)
    zone = 'ligament' if 'ligament' in obj.name.lower() else 'muscle'
    for bone_index, faces in grouped.items():
        parent = bones[bone_index]
        add(obj, 'zone', positions, normals, np.array(faces, dtype='<u4'), zone=zone, parent=parent['id'], part_region=parent['region'])

# Source annotation points are retained separately from material/attachment areas.
bone_name_to_indices = defaultdict(list)
for i, bone in enumerate(bones):
    bone_name_to_indices[bone['name'].lower()].append(i)
collection_parents = defaultdict(set)
for c in bpy.data.collections:
    for child in c.children:
        collection_parents[child.name].add(c.name)


def ancestors(obj):
    seen = set()
    queue = [c.name for c in obj.users_collection]
    while queue:
        name = queue.pop()
        if name in seen:
            continue
        seen.add(name)
        queue.extend(collection_parents[name])
    return seen


landmarks = []
depsgraph = bpy.context.evaluated_depsgraph_get()
for obj in sorted(bpy.data.objects, key=lambda o: o.name):
    if obj.type != 'MESH' or not obj.name.endswith('.j') or len(obj.data.vertices) != 2:
        continue
    candidates = [i for name in sorted(ancestors(obj)) for i in bone_name_to_indices.get(name.lower(), [])]
    if not candidates:
        continue
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        point = evaluated.matrix_world @ mesh.vertices[1].co
        point = np.array([point.x, point.z, -point.y], dtype=np.float32)
    finally:
        evaluated.to_mesh_clear()
    best = None
    for bone_index in candidates:
        bone = bones[bone_index]
        vertices = bone_geometry[bone['id']][1]
        distances = np.linalg.norm(vertices - point, axis=1)
        vertex = int(distances.argmin())
        if best is None or distances[vertex] < best[0]:
            best = (float(distances[vertex]), bone, vertex)
    if best is None or best[0] > .008:
        continue
    distance, bone, vertex = best
    name = obj.name[:-2].strip('()')
    mapped = term(name)
    positions, normals = bone_geometry[bone['id']][1:3]
    landmarks.append({'id': f'a{len(landmarks):04d}', 'parent': bone['id'], 'name': name, 'latin': mapped.get('latin'), 'ta2': mapped.get('ta2'), 'sourceObject': obj.name, 'sourcePoint': point.tolist(), 'position': positions[vertex].tolist(), 'normal': (normals[vertex].astype(float) / 32767).tolist(), 'projectionMm': distance * 1000})

pack_metadata = []
for stale in OUTPUT.glob('*.bin.gz'):
    if stale.name not in packs:
        stale.unlink()
for filename, binary in sorted(packs.items()):
    compressed = gzip.compress(bytes(binary), compresslevel=9, mtime=0)
    (OUTPUT / filename).write_bytes(compressed)
    pack_metadata.append({'file': filename, 'bytes': len(compressed), 'rawBytes': len(binary), 'sha256': sha(compressed), 'rawSha256': sha(binary)})

manifest = {
    'version': 1, 'source': 'Z-Anatomy', 'license': 'CC BY-SA 4.0',
    'sourceRepository': 'https://github.com/Z-Anatomy/Models-of-human-anatomy',
    'sourceRevision': '767f14e0a4dfc55aa7c3455685b62339a4faec99',
    'sourceArchiveSha256': 'e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736',
    'sourceBlendSha256': BLEND_SHA, 'sourceTa2Sha256': CSV_SHA,
    'units': 'metres', 'up': 'Y',
    'geometry': 'Original mesh vertices and triangles, losslessly repacked; native object transforms and Z-up to Y-up conversion. No decimation, generated anatomy, or Wikipedia definitions.',
    'articularZones': 'Original bone polygons assigned the source Cartilage material; no inferred boundaries.',
    'attachmentZones': 'Original authored origin/insertion polygons. Triangles assigned to the nearest source bone vertex within 6 mm, solely for per-bone filtering; geometry is unchanged. This assignment is not expert medical review.',
    'annotationPoints': 'Evaluated anatomical endpoint 1 of native .j lines, associated by source bone collections, then nearest source bone vertex within 8 mm. No invented points.',
    'counts': dict(Counter(p['kind'] for p in parts)),
    'zoneCounts': dict(Counter(p['zone'] for p in parts if p['zone'])),
    'attachmentSourceCount': attachment_source_count, 'unassignedAttachments': unassigned,
    'packs': pack_metadata, 'parts': parts, 'landmarks': landmarks,
}
(OUTPUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')))
print('BODY_EXPORT', json.dumps({'counts': manifest['counts'], 'zones': manifest['zoneCounts'], 'landmarks': len(landmarks), 'bytes': sum(p['bytes'] for p in pack_metadata), 'rawBytes': sum(p['rawBytes'] for p in pack_metadata), 'boneMaterials': dict(articular_materials)}))
