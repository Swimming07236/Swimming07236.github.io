const SVG = 'http://www.w3.org/2000/svg';
const manifest = fetch('/assets/chapters/scenes.json').then(response => {
  if (!response.ok) throw new Error('章节图像暂时无法读取。');
  return response.json();
});
const prepared = new Map();

export function prepareScene(id) {
  if (!prepared.has(id)) prepared.set(id, manifest.then(async scenes => {
    const scene = scenes[id];
    await Promise.all(scene.layers.map(layer => {
      const image = new Image();
      image.src = layer.src;
      return image.decode();
    }));
    return scene;
  }));
  return prepared.get(id);
}

function movement(id, layer, index) {
  const image = Number(layer.source.match(/image(\d+)/)?.[1]);
  const x = layer.matrix[4] + layer.matrix[0] / 2;
  const y = layer.matrix[5] + layer.matrix[3] / 2;
  if (index === 0) return { x: 0, y: 0, scale: 1.025, delay: 0, duration: 1500 };
  if (image === 20) return { x: 0, y: 0, scale: .9, delay: 1050, duration: 1300 };
  const base = { x: (x - 640) * .06, y: (y - 360) * .08, scale: .96, delay: 250 + index % 7 * 115, duration: 1500 };
  if (id === 'home') return { ...base, x: image === 14 ? 85 : base.x, scale: image === 10 ? .8 : .96 };
  if (id === 'fiction') return { ...base, x: [37, 39, 40, 41].includes(image) ? (x < 640 ? -110 : 110) : base.x, y: image === 42 ? 55 : base.y };
  if (id === 'science-fiction') return { ...base, x: [68, 69].includes(image) ? (x < 640 ? -130 : 130) : 0, y: image === 66 ? -90 : image === 67 ? -65 : 0, scale: image === 66 ? .94 : 1 };
  if (id === 'arts') return { ...base, y: [78, 79, 80].includes(image) ? -40 : 38, scale: [74, 75, 76].includes(image) ? .86 : .95 };
  return { ...base, x: [93, 94, 97, 98, 99].includes(image) ? -130 : image === 95 ? 70 : base.x, y: image === 100 ? 45 : 0 };
}

export async function createScene(id, animated = false) {
  const scene = await prepareScene(id);
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `chapter-art${animated ? ' is-assembling' : ''}`);
  svg.dataset.scene = id;
  scene.layers.forEach((layer, index) => {
    const group = document.createElementNS(SVG, 'g');
    group.setAttribute('class', 'art-layer');
    const image = document.createElementNS(SVG, 'image');
    image.setAttribute('href', layer.src);
    image.setAttribute('width', '1');
    image.setAttribute('height', '1');
    image.setAttribute('preserveAspectRatio', 'none');
    image.setAttribute('transform', `matrix(${layer.matrix.join(' ')})`);
    image.setAttribute('opacity', layer.opacity);
    group.append(image);
    const move = movement(id, layer, index);
    group.style.setProperty('--from-x', `${move.x}px`);
    group.style.setProperty('--from-y', `${move.y}px`);
    group.style.setProperty('--from-scale', move.scale);
    group.style.setProperty('--layer-delay', `${move.delay}ms`);
    group.style.setProperty('--layer-duration', `${move.duration}ms`);
    svg.append(group);
  });
  return svg;
}
