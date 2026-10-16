const normalize = ([x, y, z]) => {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
};

export function createPolyhedron() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const vertices = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
  ].map(normalize);
  const baseFaces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const midpoints = new Map();
  function midpoint(a, b) {
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    if (!midpoints.has(key)) {
      midpoints.set(key, vertices.length);
      vertices.push(normalize(vertices[a].map((value, axis) => (value + vertices[b][axis]) / 2)));
    }
    return midpoints.get(key);
  }
  const faces = baseFaces.flatMap(([a, b, c]) => {
    const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
    return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
  });
  const uniqueEdges = new Map();
  for (const [a, b, c] of faces) {
    for (const [from, to] of [[a, b], [b, c], [c, a]]) {
      const key = `${Math.min(from, to)}:${Math.max(from, to)}`;
      uniqueEdges.set(key, [from, to]);
    }
  }
  const nodes = vertices.map(([x, y, z], index) => {
    const radius = .97 + (Math.sin(index * 4.73) + 1) * .035;
    return { x: x * radius, y: y * radius * 1.06, z: z * radius * .96 };
  });
  const edges = [...uniqueEdges.values()];
  const distances = nodes.map(() => Infinity);
  distances[0] = 0;
  const remaining = new Set(nodes.map((_, index) => index));
  while (remaining.size) {
    const current = [...remaining].reduce((a, b) => distances[a] < distances[b] ? a : b);
    remaining.delete(current);
    for (const [a, b] of edges) {
      const next = a === current ? b : b === current ? a : -1;
      if (next < 0) continue;
      const from = nodes[current], to = nodes[next];
      const length = Math.hypot(from.x - to.x, from.y - to.y, from.z - to.z);
      distances[next] = Math.min(distances[next], distances[current] + length);
    }
  }
  const maximum = Math.max(...distances);
  nodes.forEach((node, index) => { node.wave = distances[index] / maximum; });
  return { nodes, edges, faces };
}

export function projectPolyhedron(model, { width, height, time = 0, motion = true }) {
  const t = motion ? time : 0;
  const angleY = .32 + t * .00024;
  const angleX = -.21 + t * .000075;
  const angleZ = -.06 + Math.sin(t * .0003) * .045;
  const cy = Math.cos(angleY), sy = Math.sin(angleY);
  const cx = Math.cos(angleX), sx = Math.sin(angleX);
  const cz = Math.cos(angleZ), sz = Math.sin(angleZ);
  const vibrationX = motion ? Math.sin(t * .071) * .55 + Math.sin(t * .113) * .35 : 0;
  const vibrationY = motion ? Math.sin(t * .083) * .5 + Math.cos(t * .097) * .3 : 0;
  const size = Math.min(width * .30, height * .29, 240) * (1 + (motion ? Math.sin(t * .012) * .005 : 0));
  return model.nodes.map(node => {
    const x1 = node.x * cy + node.z * sy;
    const z1 = -node.x * sy + node.z * cy;
    const y1 = node.y * cx - z1 * sx;
    const z2 = node.y * sx + z1 * cx;
    const perspective = 5.5 / (5.5 - z2);
    return {
      x: width / 2 + (x1 * cz - y1 * sz) * size * perspective + vibrationX,
      y: height * .44 + (x1 * sz + y1 * cz) * size * perspective + vibrationY,
      depth: Math.max(0, Math.min(1, (z2 + 1.2) / 2.4)),
    };
  });
}
