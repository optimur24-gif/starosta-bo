"""Verify the committed Z-Anatomy export without fetching/executing source code."""
import gzip
import hashlib
import json
import math
import struct
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'public/models/body'
manifest = json.loads((root / 'manifest.json').read_text())
assert manifest['sourceRevision'] == '767f14e0a4dfc55aa7c3455685b62339a4faec99'
assert manifest['license'] == 'CC BY-SA 4.0'
assert manifest['sourceBlendSha256'] == '9f08a17ea0115fed80b2a73ecdf0a1bc2ab2f6956f37c593ce23d513ea35afcd'
buffers = {}
for pack in manifest['packs']:
    compressed = (root / pack['file']).read_bytes()
    assert len(compressed) == pack['bytes'], pack['file']
    assert hashlib.sha256(compressed).hexdigest() == pack['sha256'], pack['file']
    raw = gzip.decompress(compressed)
    assert len(raw) == pack['rawBytes'], pack['file']
    assert hashlib.sha256(raw).hexdigest() == pack['rawSha256'], pack['file']
    buffers[pack['file']] = raw
parts = {part['id']: part for part in manifest['parts']}
assert len(parts) == len(manifest['parts'])
assert dict(Counter(part['kind'] for part in parts.values())) == manifest['counts']
assert dict(Counter(part['zone'] for part in parts.values() if part['zone'])) == manifest['zoneCounts']
for part in parts.values():
    raw = buffers[part['pack']]
    assert part['vertexCount'] > 0 and part['indexCount'] > 0
    assert part['indexCount'] % 3 == 0
    for key, size, alignment in [('positions', part['vertexCount']*12, 4), ('normals', part['vertexCount']*6, 2), ('indices', part['indexCount']*4, 4)]:
        assert part[key] % alignment == 0 and part[key]+size <= len(raw), part['id']
    indices = struct.unpack_from(f"<{part['indexCount']}I", raw, part['indices'])
    assert max(indices) < part['vertexCount'], part['id']
    positions = struct.unpack_from(f"<{part['vertexCount']*3}f", raw, part['positions'])
    assert all(math.isfinite(value) for value in positions)
    if part['zone']:
        assert part['kind'] == 'zone' and parts[part['parent']]['kind'] == 'bone'
for marker in manifest['landmarks']:
    assert parts[marker['parent']]['kind'] == 'bone'
    assert marker['projectionMm'] <= 8
    assert abs(sum(v*v for v in marker['normal'])-1) < .001
    assert all(math.isfinite(v) for v in marker['position'])
for kind in ['bone', 'muscle', 'ligament']:
    assert len({part['region'] for part in parts.values() if part['kind']==kind}) >= 8
for name in ['Femur', 'Humerus', 'Tibia', 'Scapula', 'Hip bone', 'Sacrum', 'Frontal bone']:
    assert any(part['name']==name and part['kind']=='bone' for part in parts.values()), name
print(f"Verified Z-Anatomy: {len(parts)} meshes, {len(manifest['landmarks'])} source landmarks, {len(buffers)} packs.")

thumbs = root.parent / 'thumbnails'
provenance = json.loads((thumbs / 'provenance.json').read_text())
assert len(provenance['images']) == 14
for image in provenance['images']:
    data = (thumbs / image['file']).read_bytes()
    assert hashlib.sha256(data).hexdigest() == image['sha256']
    assert struct.unpack('>II', data[16:24]) == (image['width'], image['height'])
print('Verified 14 real anatomical study thumbnails.')
