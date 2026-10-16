import { createPolyhedron, projectPolyhedron } from './polyhedron.js';
import { sanityAtProgress, sanityDigits, loadingColor, vertexColor, loadingPhase, garbleMessage } from './loading.js';
import { createTitle } from './title.js';
import { createStarDrift, wrapStar, STAR_MARGIN } from './star-drift.js';

const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => value * value * (3 - 2 * value);
const lerp = (a, b, t) => a + (b - a) * t;

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function initIntro({ content, onEnter, onComplete, onProgress, onInteraction }) {
  const overlay = document.querySelector('#intro');
  const canvas = document.querySelector('#universe');
  const ctx = canvas.getContext('2d');
  const enter = document.querySelector('#enter-button');
  const message = document.querySelector('#loading-message');
  const sanityPanel = document.querySelector('#sanity-panel');
  const sanityValue = document.querySelector('#sanity-value');
  const progressElement = document.querySelector('#intro-progress');
  const status = document.querySelector('#intro-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const figure = createPolyhedron();
  const title = createTitle({ content });
  const random = seededRandom(2048);
  const stars = Array.from({ length: 270 }, (_, index) => ({
    x: random(), y: random(), size: random() * 1.1 + .25,
    opacity: random() * .48 + .15, phase: random() * TAU,
    warm: index % 6 === 0,
  }));
  const targets = Array.from({ length: 615 }, (_, index) => ({ x: random(), y: random(), size: index % 11 === 0 ? random() * 1.1 + .8 : random() * .55 + .25, active: true }));
  const constellationIndices = targets.map((target, index) => target.active ? index : -1).filter(index => index >= 0);
  const constellationEdges = [];
  const linkedPairs = new Set();
  for (const a of constellationIndices.filter(index => targets[index].size >= .8)) {
    const neighbors = constellationIndices.filter(index => index !== a).map(b => ({ b, distance: Math.hypot(targets[a].x - targets[b].x, targets[a].y - targets[b].y) })).sort((a, b) => a.distance - b.distance).slice(0, 2);
    for (const { b } of neighbors) {
      const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      if (!linkedPairs.has(key)) { linkedPairs.add(key); constellationEdges.push([a, b]); }
    }
  }
  const glitchBuffer = document.createElement('canvas');
  const glitchContext = glitchBuffer.getContext('2d');
  const effects = content.introEffects;
  const starDrift = createStarDrift({ speed: effects.starDriftSpeed, intervalMin: effects.starDriftIntervalMin, intervalMax: effects.starDriftIntervalMax });
  let drift = { x: 0, y: 0 };
  let width = 0;
  let height = 0;
  let state = 'idle';
  let stateStarted = performance.now();
  let frameId = 0;
  let phase = -1;
  let progress = 0;
  let messageTimer = 0;
  let garbleStep = -1;
  let revealedSite = false;
  let pointer = { x: 0, y: 0 };
  let nextGlitch = Infinity;
  let glitchStarted = -Infinity;
  let glitchSeed = 0;
  let figureAnchor = null;
  let pixelRatio = 1;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    glitchBuffer.width = canvas.width;
    glitchBuffer.height = canvas.height;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    figureAnchor = null;
  }
  resize();
  window.addEventListener('resize', resize);
  overlay.addEventListener('pointermove', event => {
    pointer = { x: (event.clientX / width - .5) * 8, y: (event.clientY / height - .5) * 8 };
  });

  function changeState(next, now = performance.now()) {
    const anchor = next === 'morphing' ? figurePositions(now) : null;
    state = next;
    stateStarted = now;
    overlay.dataset.state = next;
    if (next === 'morphing') figureAnchor = anchor;
    if (next === 'ready') {
      overlay.classList.add('title-revealed');
      enter.disabled = false;
      status.textContent = '星图已展开。点击画面，或按回车进入网站。';
      enter.focus({ preventScroll: true });
      nextGlitch = now + 2800 + Math.random() * 1800;
    }
  }

  function setProgress(value) {
    progress = value;
    const rounded = Math.floor(value);
    overlay.style.setProperty('--progress', value);
    overlay.style.setProperty('--loading-color', loadingColor(value).join(','));
    for (const label of overlay.querySelectorAll('.progress-number')) label.textContent = `${rounded}%`;
    progressElement.setAttribute('aria-valuenow', rounded);
    const sanity = sanityAtProgress(value);
    onProgress?.({ progress: value, sanity });
    sanityValue.textContent = sanity;
    sanityValue.classList.toggle('is-negative', sanity < 0);
    sanityPanel.dataset.digits = sanityDigits(sanity);
    const nextPhase = loadingPhase(value, content.loadingMessages.length);
    if (nextPhase !== phase) {
      phase = nextPhase;
      clearTimeout(messageTimer);
      const showMessage = () => {
        message.textContent = content.loadingMessages[nextPhase] || '';
        message.classList.toggle('is-final', nextPhase === content.loadingMessages.length - 1);
        message.setAttribute('aria-live', nextPhase === content.loadingMessages.length - 1 ? 'off' : 'polite');
        garbleStep = -1;
        message.classList.remove('changing');
      };
      if (nextPhase === 0) showMessage();
      else {
        message.classList.add('changing');
        messageTimer = setTimeout(showMessage, 170);
      }
    }
  }

  function figurePositions(now = performance.now()) {
    return projectPolyhedron(figure, { width, height, time: now - stateStarted, motion: !reducedMotion.matches });
  }

  function drawLine(a, b, opacity, lineWidth = .65, color = '216,224,232') {
    ctx.strokeStyle = `rgba(${color},${opacity})`;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.stroke();
  }

  function drawPoint(x, y, size, opacity, glow = false, warm = false) {
    if (opacity <= 0) return;
    if (glow) {
      const gradient = ctx.createRadialGradient(x,y,0,x,y,size * 5);
      const glowColor = warm ? '229,225,171' : '226,234,244';
      gradient.addColorStop(0, `rgba(${glowColor},${opacity * .24})`);
      gradient.addColorStop(1, `rgba(${glowColor},0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();ctx.arc(x,y,size * 5,0,TAU);ctx.fill();
    }
    ctx.fillStyle = `rgba(${warm ? '220,212,161' : '222,229,226'},${opacity})`;
    ctx.beginPath();ctx.arc(x,y,size,0,TAU);ctx.fill();
  }

  function drawFigure(now) {
    const points = figurePositions(now);
    const colors = figure.nodes.map(node => vertexColor(progress, node.wave).join(','));
    const edges = [...figure.edges].sort(([a, b], [c, d]) => points[a].depth + points[b].depth - points[c].depth - points[d].depth);
    for (const [a, b] of edges) {
      const depth = (points[a].depth + points[b].depth) / 2;
      const opacity = .15 + Math.pow(depth, 1.4) * .78;
      const gradient = ctx.createLinearGradient(points[a].x, points[a].y, points[b].x, points[b].y);
      gradient.addColorStop(0, `rgba(${colors[a]},${opacity})`);
      gradient.addColorStop(1, `rgba(${colors[b]},${opacity})`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = .65 + depth * .7;
      ctx.beginPath(); ctx.moveTo(points[a].x, points[a].y); ctx.lineTo(points[b].x, points[b].y); ctx.stroke();
    }
    for (const index of points.map((_, i) => i).sort((a, b) => points[a].depth - points[b].depth)) {
      const point = points[index];
      const color = colors[index];
      const size = 1.2 + point.depth * 1.7;
      const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size * 4);
      glow.addColorStop(0, `rgba(${color},${.15 + point.depth * .18})`);
      glow.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(point.x, point.y, size * 4, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(${color},${.45 + point.depth * .55})`;
      ctx.beginPath(); ctx.arc(point.x, point.y, size, 0, TAU); ctx.fill();
    }
  }

  function starPosition(target, parallax = 1) {
    return {
      x: wrapStar(target.x * (width + STAR_MARGIN * 2) - STAR_MARGIN + drift.x + pointer.x * parallax, width),
      y: wrapStar(target.y * (height + STAR_MARGIN * 2) - STAR_MARGIN + drift.y + pointer.y * parallax, height),
    };
  }

  function drawConstellationLines(points, opacity, lens = null) {
    ctx.beginPath();
    for (const [a, b] of constellationEdges) {
      const distance = Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
      if (distance > Math.min(width * .25, 200)) continue;
      if (lens && (Math.hypot(points[a].x - width / 2, points[a].y - height / 2) < lens.radius * 1.5 || Math.hypot(points[b].x - width / 2, points[b].y - height / 2) < lens.radius * 1.5)) continue;
      ctx.moveTo(points[a].x, points[a].y); ctx.lineTo(points[b].x, points[b].y);
    }
    ctx.strokeStyle = `rgba(171,185,192,${opacity})`;
    ctx.lineWidth = .5;
    ctx.stroke();
  }

  function drawStarField(now, opacity = 1, lens = null) {
    for (const star of stars) {
      let { x, y } = starPosition(star, star.size);
      if (lens) {
        const dx = x - width / 2, dy = y - height / 2;
        const distance = Math.hypot(dx,dy);
        if (distance < lens.radius * .95) continue;
        const influence = Math.exp(-Math.pow((distance - lens.radius) / (lens.radius * .55 + 45), 2));
        const angle = Math.atan2(dy,dx) + influence * lens.twist;
        const warpedDistance = distance + influence * lens.radius * .3;
        x = width / 2 + Math.cos(angle) * warpedDistance;
        y = height / 2 + Math.sin(angle) * warpedDistance;
        const length = influence * (20 + lens.radius * .08);
        if (length > 1) drawLine({ x,y },{ x:x + Math.cos(angle+.4) * length,y:y + Math.sin(angle+.4) * length },star.opacity * opacity * .6,.8,star.warm ? '206,194,151' : '190,206,216');
      }
      const twinkle = reducedMotion.matches ? 1 : .72 + .28 * Math.sin(now * .0009 + star.phase);
      drawPoint(x,y,star.size,star.opacity * twinkle * opacity,false,star.warm);
    }
  }

  function drawMorph(now, amount) {
    const original = figureAnchor || figurePositions(now);
    const spread = 1 + ease(clamp(amount * 1.4)) * 3.8;
    const blend = ease(clamp((amount - .12) / .88));
    const points = targets.map((_,index) => {
      const point = original[index % original.length];
      const target = starPosition(targets[index]);
      return {
        x: lerp(width / 2 + (point.x - width / 2) * spread, target.x, blend),
        y: lerp(height / 2 + (point.y - height / 2) * spread, target.y, blend),
      };
    });
    drawStarField(now,ease(amount));
    ctx.beginPath();
    for (const [a,b] of figure.edges) {
      ctx.moveTo(points[a].x, points[a].y); ctx.lineTo(points[b].x, points[b].y);
    }
    ctx.strokeStyle = `rgba(216,224,232,${.48 * Math.pow(1 - amount, 2)})`;
    ctx.lineWidth = .8;
    ctx.stroke();
    drawConstellationLines(points, .065 * ease(amount));
    points.forEach((point,index) => {
      const pulse = .72 + .18 * Math.sin(now * .0015 + index * 1.8);
      const appearing = index < figure.nodes.length ? 1 : ease(clamp(amount * 2));
      drawPoint(point.x,point.y,lerp(index < figure.nodes.length ? 2 : .5,targets[index].size,blend),pulse * (index % 11 === 0 ? 1 : .35) * appearing, index % 11 === 0,index % 7 === 0);
    });
  }

  function drawConstellations(now, lens = null) {
    drawStarField(now,1,lens);
    const points = Array(targets.length);
    for (const index of constellationIndices) points[index] = starPosition(targets[index]);
    drawConstellationLines(points, .085, lens);
    for (const index of constellationIndices) {
      const point = points[index];
      if (lens) {
        const dx = point.x-width/2,dy = point.y-height/2;
        const distance = Math.hypot(dx,dy);
        if (distance < lens.radius) continue;
        const influence = Math.exp(-Math.pow((distance-lens.radius)/(lens.radius*.5+45),2));
        const angle = Math.atan2(dy,dx)+influence*lens.twist;
        point.x = width/2+Math.cos(angle)*(distance+influence*lens.radius*.3);
        point.y = height/2+Math.sin(angle)*(distance+influence*lens.radius*.3);
      }
      drawPoint(point.x,point.y,targets[index].size,(index % 11 === 0 ? .65 : .28) + .1 * Math.sin(now * .001 + index),index % 11 === 0,index % 7 === 0);
    }
  }

  function drawGlitch(now) {
    if (reducedMotion.matches) return;
    if (now >= nextGlitch) {
      glitchStarted = now;
      glitchSeed = Math.floor(Math.random() * 100000);
      nextGlitch = now + effects.glitchIntervalMin + Math.random() * (effects.glitchIntervalMax - effects.glitchIntervalMin);
    }
    const elapsed = now - glitchStarted;
    const active = elapsed < 520 && (elapsed < 130 || elapsed > 205 && elapsed < 345 || elapsed > 405);
    overlay.dataset.glitch = active ? 'active' : 'idle';
    if (!active) return;
    glitchContext.clearRect(0, 0, glitchBuffer.width, glitchBuffer.height);
    glitchContext.drawImage(canvas, 0, 0);
    const noise = seededRandom(glitchSeed + Math.floor(elapsed / 65));
    const strength = Math.sin(elapsed / 520 * Math.PI) * .7 + .25;
    for (let i = 0; i < 5; i++) {
      const y = noise() * height;
      const bandHeight = 4 + noise() * 30;
      const shift = (noise() - .5) * 34 * strength;
      ctx.drawImage(glitchBuffer, 0, y * pixelRatio, width * pixelRatio, bandHeight * pixelRatio, shift, y, width, bandHeight);
      ctx.fillStyle = `rgba(190,207,222,${.016 * strength})`;
      ctx.fillRect(0, y, width, 1);
    }
    const fragments = [
      'const universe = new Simulation(seed);',
      'observer.position = memory.read(0x0001);',
      'if (!observed) return null;',
      'reality.commit(observer);',
      'stars.forEach(node => node.connect());',
      'ERR_OBSERVER_OUTSIDE_REALITY',
      '// the sky is a compiled memory',
      'while (you.exist) world.render();',
    ];
    ctx.font = `${width < 500 ? 9 : 11}px WorldMono, Consolas, monospace`;
    const lines = width < 500 ? 2 : 4;
    for (let i = 0; i < lines; i++) {
      const x = 25 + noise() * Math.max(20, width - 390);
      const y = i % 2 === 0 ? height * (.13 + noise() * .14) : height * (.77 + noise() * .13);
      ctx.fillStyle = `rgba(207,224,232,${(.19 + noise() * .25) * strength})`;
      ctx.fillText(fragments[Math.floor(noise() * fragments.length)], x, y, width - x - 20);
    }
  }

  function drawBlackHole(now, amount) {
    const maximumRadius = Math.hypot(width,height) * .7;
    const radius = 5 + Math.pow(amount,2.35) * maximumRadius;
    const centerX = width/2, centerY = height/2;
    drawConstellations(now,{ radius,twist:ease(amount)*1.55 });
    const corona = ctx.createRadialGradient(centerX,centerY,radius*.93,centerX,centerY,radius*1.45+16);
    corona.addColorStop(0,'rgba(0,0,0,0)');
    corona.addColorStop(.15,`rgba(176,162,114,${.38*(1-amount*.5)})`);
    corona.addColorStop(.24,`rgba(235,221,172,${.28*(1-amount*.5)})`);
    corona.addColorStop(.5,'rgba(98,104,98,.06)');
    corona.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = corona;
    ctx.beginPath();ctx.arc(centerX,centerY,radius*1.45+16,0,TAU);ctx.fill();
    ctx.save();ctx.translate(centerX,centerY);ctx.rotate(-.22);
    ctx.strokeStyle = `rgba(210,201,165,${.4*(1-amount*.6)})`;
    ctx.lineWidth = 1 + amount*2;
    ctx.beginPath();ctx.ellipse(0,0,radius*1.3,radius*.34,0,0,TAU);ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#000';
    ctx.beginPath();ctx.arc(centerX,centerY,radius,0,TAU);ctx.fill();
    ctx.strokeStyle = `rgba(224,217,179,${.55*(1-amount)})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();ctx.arc(centerX,centerY,radius+1,0,TAU);ctx.stroke();
  }

  function revealSite() {
    if (revealedSite) return;
    revealedSite = true;
    onEnter();
  }

  function frame(now) {
    drift = starDrift.update(now, !reducedMotion.matches);
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle = '#000';ctx.fillRect(0,0,width,height);
    const elapsed = now - stateStarted;
    if (state === 'loading') {
      const duration = reducedMotion.matches ? 1100 : content.introDuration;
      setProgress(Math.min(100,elapsed / duration * 100));
      drawFigure(now);
      if (!reducedMotion.matches && message.classList.contains('is-final')) {
        const step = Math.floor(elapsed / 130);
        if (step !== garbleStep) {
          garbleStep = step;
          message.textContent = garbleMessage(step);
        }
      }
      if (progress >= 100 && elapsed >= duration + (reducedMotion.matches ? 0 : 900)) changeState('morphing',now);
    } else if (state === 'morphing') {
      const amount = clamp(elapsed / (reducedMotion.matches ? 350 : 3600));
      drawMorph(now,amount);
      if (amount >= .25) overlay.classList.add('title-revealed');
      if (amount >= 1) changeState('ready',now);
    } else if (state === 'ready') {
      drawConstellations(now);
      drawGlitch(now);
    }
    else if (state === 'entering') {
      const amount = clamp(elapsed / (reducedMotion.matches ? 450 : 2300));
      if (reducedMotion.matches) drawConstellations(now);
      else drawBlackHole(now,amount);
      if (amount >= .64) revealSite();
      if (amount >= .78) overlay.classList.add('is-leaving');
      if (amount >= 1) {
        revealSite();
        overlay.hidden = true;
        state = 'complete';
        onComplete?.();
        return;
      }
    }
    frameId = requestAnimationFrame(frame);
  }

  function startEntering() {
    if (state !== 'ready') return;
    onInteraction?.();
    enter.disabled = true;
    overlay.dataset.glitch = 'idle';
    changeState('entering');
    status.textContent = '正在进入作品页面。';
  }
  enter.addEventListener('click', startEntering);
  overlay.addEventListener('click', event => {
    if (event.target.closest('#skip-intro, #enter-button')) return;
    if (state === 'ready') startEntering();
    else onInteraction?.();
  });
  document.addEventListener('keydown', event => {
    if (state === 'ready' && ['Enter',' '].includes(event.key)) {
      event.preventDefault();
      startEntering();
    }
  });
  document.querySelector('#skip-intro').addEventListener('click', event => {
    event.stopPropagation();
    onInteraction?.();
    clearTimeout(messageTimer);
    setProgress(100);
    changeState('morphing');
  });

  function replay() {
    cancelAnimationFrame(frameId);
    clearTimeout(messageTimer);
    overlay.hidden = false;
    overlay.classList.remove('is-leaving','title-revealed');
    overlay.dataset.glitch = 'idle';
    title.prepare();
    enter.disabled = true;
    revealedSite = false;
    phase = -1;
    pointer = { x:0,y:0 };
    starDrift.reset();
    status.textContent = '';
    changeState('loading');
    setProgress(0);
    resize();
    frameId = requestAnimationFrame(frame);
  }
  return {
    replay,
    wait() {
      cancelAnimationFrame(frameId);
      clearTimeout(messageTimer);
      overlay.hidden = true;
      state = 'idle';
      overlay.dataset.state = 'idle';
      status.textContent = '';
    },
  };
}
