#!/usr/bin/env python3
"""把源泉圓體（GenSenMaruGothicTW，SIL OFL 1.1）抽成只含介面用得到的字的 woff2。

用法：python3 tools/subset_fonts.py <放 GenSenMaruGothicTW-*.ttf 的資料夾>
字集＝index.html、app.js、lib/*.js 裡出現過的所有非 ASCII 字元，加上常用標點與數字。
介面文案有新字時要重跑；test/assets.test.mjs 會檢查字集有沒有涵蓋原始碼。
屋主自己打的字不在字集裡時，瀏覽器會退回 Noto Sans TC 或系統字體。
需要：pip install fonttools brotli
"""
import glob, os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
src = sys.argv[1]
files = [os.path.join(root, 'index.html'), os.path.join(root, 'app.js')] + sorted(glob.glob(os.path.join(root, 'lib', '*.js')))
chars = set('，。、；：？！「」（）《》・—–…％＋－×÷～＝／｜〈〉『』【】 ０１２３４５６７８９㎡°')
for f in files:
    chars |= {c for c in open(f, encoding='utf-8').read() if ord(c) > 0x7f}
chars = ''.join(sorted(c for c in chars if not c.isspace() or c == '　'))
out = os.path.join(root, 'assets', 'fonts')
os.makedirs(out, exist_ok=True)
open(os.path.join(out, 'charset.txt'), 'w', encoding='utf-8').write(chars + '\n')
for weight, name in [(400, 'Regular'), (700, 'Bold')]:
    subprocess.run([sys.executable, '-m', 'fontTools.subset', os.path.join(src, f'GenSenMaruGothicTW-{name}.ttf'),
                    f'--text-file={os.path.join(out, "charset.txt")}', '--flavor=woff2', '--layout-features=*', '--no-hinting',
                    f'--output-file={os.path.join(out, f"gensen-maru-tw-{weight}.woff2")}'], check=True)
print(len(chars), 'characters')
