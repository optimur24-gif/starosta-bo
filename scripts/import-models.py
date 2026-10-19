"""Restore the pinned, checksum-verified BodyParts3D skull geometry subset."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import tempfile
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / 'public' / 'models'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify-only', action='store_true', help='Verify retained assets without network access or writes.')
    args = parser.parse_args()
    provenance = json.loads((MODEL_DIR / 'provenance.json').read_text())
    if args.verify_only:
        if digest((MODEL_DIR / 'skull.bin').read_bytes()) != provenance['binarySha256']:
            raise RuntimeError('Local skull binary checksum mismatch')
        print('BodyParts3D skull: SHA-256 verified; no network requests.')
        return
    revision = provenance['distributionCommit']
    if revision != 'c835665a9ade09ee0b993cee6eee1b25b7f7311b':
        raise RuntimeError('Review a source revision change before importing.')

    def download(entry):
        path = entry['path']
        if not path.startswith('public/models/high-resolution/') or '..' in path:
            raise RuntimeError('Invalid source path')
        url = f'https://raw.githubusercontent.com/choxos/OMFAtlas/{revision}/{path}'
        with urlopen(url, timeout=45) as response:
            data = response.read()
        git_blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        if len(data) != entry['bytes'] or digest(data) != entry['sha256'] or git_blob != entry['gitBlob']:
            raise RuntimeError(f"Source integrity failure: {entry['id']}")
        return data

    with ThreadPoolExecutor(max_workers=6) as executor:
        sources = list(executor.map(download, provenance['sourceFiles']))
    combined = bytearray()
    for data in sources:
        combined.extend(data)
        combined.extend(b'\0' * ((-len(combined)) % 4))
    if digest(combined) != provenance['binarySha256']:
        raise RuntimeError('Repacked geometry checksum mismatch; existing assets were preserved.')
    with tempfile.NamedTemporaryFile(dir=MODEL_DIR, suffix='.tmp', delete=False) as output:
        temporary = Path(output.name)
        output.write(combined)
    temporary.replace(MODEL_DIR / 'skull.bin')
    print(f'Verified and restored {len(sources)} meshes, {len(combined):,} bytes. Manifest retained.')


if __name__ == '__main__':
    main()
