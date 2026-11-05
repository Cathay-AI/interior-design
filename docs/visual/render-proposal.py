#!/usr/bin/env python3
"""Render both proposal languages with an installed answer-me-with-html CLI."""
import argparse
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--renderer', type=Path, required=True, help='Path to scripts/am.mjs')
args = parser.parse_args()
root = Path(__file__).resolve().parent
for source, output in [('proposal.am.md', 'proposal.html'), ('proposal.en.am.md', 'proposal.en.html')]:
    subprocess.run(['node', str(args.renderer.resolve()), 'render', str(root / source), '-o', str(root / output), '--no-open', '--mode', 'light'], check=True)
