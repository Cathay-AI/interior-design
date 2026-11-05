#!/usr/bin/env python3
"""Render both proposal languages with an installed answer-me-with-html CLI."""
import argparse
import base64
import mimetypes
import re
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--renderer', type=Path, required=True, help='Path to scripts/am.mjs')
args = parser.parse_args()
root = Path(__file__).resolve().parent

for source, output in [('proposal.am.md', 'proposal.html'), ('proposal.en.am.md', 'proposal.en.html')]:
    text = (root / source).read_text()
    # Native components do not support responsive photographs. Sources use only
    # a small HTML img element; all layout/CSS/SVG still comes from the CLI.
    def embed(match):
        asset = (root / match.group(1)).resolve()
        asset.relative_to(root)
        mime = mimetypes.guess_type(asset.name)[0]
        data = base64.b64encode(asset.read_bytes()).decode('ascii')
        return 'src="data:' + mime + ';base64,' + data + '"'
    text = re.sub(r'src="(assets/[^\"]+)"', embed, text)
    subprocess.run(['node', str(args.renderer.resolve()), 'render', '-', '-o', str(root / output), '--no-open', '--mode', 'light'], input=text, text=True, check=True)
