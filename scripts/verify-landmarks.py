"""Independently verify the recorded 3D landmark registration with stdlib math.

This checks provenance and numerical consistency, not medical correctness.
"""
import hashlib
import json
import math
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'models'


def main():
    path = ROOT / 'landmarks.json'
    expected = (ROOT / 'landmarks.sha256').read_text().split()[0]
    if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        raise RuntimeError('Landmark file checksum mismatch')
    data = json.loads(path.read_text())
    parts = {p['id']: p for p in json.loads((ROOT / 'skull.json').read_text())['parts']}
    binary = (ROOT / 'skull.bin').read_bytes()
    scale = data['registration']['scale']
    rotation = data['registration']['rotation']
    translation = data['registration']['translation']
    concepts = set()
    for marker in data['markers']:
        part = parts[marker['partId']]
        if part['boneId'] != marker['boneId'] or not 0 <= marker['vertexIndex'] < part['vertexCount']:
            raise RuntimeError('Invalid anatomical mesh binding')
        source = marker['sourcePoint']
        point = [source[0], source[2], -source[1]]
        if marker['mirroredForSide']:
            point[0] *= -1
        moved = [scale * sum(rotation[a][b] * point[b] for b in range(3)) + translation[a] for a in range(3)]
        vertex = struct.unpack_from('<fff', binary, part['positions'] + marker['vertexIndex'] * 12)
        if any(abs(vertex[a] - marker['position'][a]) > 1e-8 for a in range(3)):
            raise RuntimeError('Marker position differs from recorded target vertex')
        projection = math.dist(moved, vertex) * 1000
        if abs(projection - marker['surfaceProjectionMm']) > 1e-6 or projection > 8:
            raise RuntimeError('Recorded registration does not reproduce')
        concepts.add(marker['structureId'])
    if len(concepts) != data['coveredStructureCount']:
        raise RuntimeError('Coverage count mismatch')
    print(f'Verified {len(concepts)} concepts, {len(data["markers"])} side-specific anchors, source transforms and surface projections.')


if __name__ == '__main__':
    main()
