// Use a self-contained recovery entry so a failed native module graph does not
// poison subsequent 3D attempts in the document's module map.
import { build } from 'esbuild';
import { resolve } from 'node:path';

const vendor = resolve('prototype/fast-route/vendor');
await build({
  entryPoints: ['prototype/fast-route/lib/room3d.js'],
  outfile: 'dist/lib/room3d-retry.js',
  bundle: true,
  minify: true,
  target: 'es2022',
  format: 'esm',
  plugins: [{
    name: 'local-three',
    setup(build) {
      build.onResolve({ filter: /^three$/ }, () => ({ path: resolve(vendor, 'three.module.min.js') }));
      build.onResolve({ filter: /^three\/addons\// }, ({ path }) => ({ path: resolve(vendor, path.slice('three/'.length)) }));
    },
  }],
});
