// Room and furniture dimensions (metres, origin at the floor centre; x = left→right, z = back→front).
// Pure data: the 3D scene and the construction drawings are both drawn from it.

export const ROOM = { w: 5.0, d: 4.2, h: 2.8 };
/** Window opening in the back wall (x range, sill and head height, metres). */
export const WINDOW = { x0: -0.35, x1: 2.05, y0: 0.45, y1: 2.55 };
/** Built-in storage on the back wall. */
export const CABINET = { x0: -2.5, x1: -0.75, depth: 0.42 };
/** Furniture footprint used by the drawings too (centre x/z, size along x/z). */
export const LAYOUT = {
  sofa: { x: -2.5 + 0.48, z: 0.25, sx: 0.96, sz: 2.3 },
  table: { x: -0.85, z: 0.25, sx: 0.62, sz: 1.05 },
  chair: { x: 0.85, z: -0.55, sx: 0.85, sz: 0.85 },
  rug: { x: -0.7, z: 0.25, sx: 2.0, sz: 2.6 },
  sideboard: { x: 0.85, z: -2.1 + 0.2, sx: 1.6, sz: 0.4 },
  lamp: { x: -2.15, z: 1.75 },
  sidetable: { x: -2.2, z: -1.25 },
  plant: { x: 2.1, z: -1.55 },
  pendant: { x: -0.85, z: 0.25 },
};
