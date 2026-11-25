(() => {
  const element = id => document.getElementById(id);
  const tabs = [element('quest-tab'), element('arcade-tab')];
  const panels = [element('quest-panel'), element('arcade-panel')];
  const adventure = document.querySelector('.scene');
  const main = document.querySelector('main');
  const track = element('run-track');
  const stage = track.parentElement;
  const canvas = track.getContext('2d');
  const action = element('run-action');
  const message = element('run-message');
  const distanceLabel = element('run-score');
  const bestLabel = element('run-best');
  const hitsLabel = element('run-hits');
  const status = element('run-status');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const scoreKey = 'kroky-arcade-best-v1';
  const arcadeAssets = new URL('./assets/arcade/', document.currentScript.src);

  function readBest() {
    try {
      const value = Number(localStorage.getItem(scoreKey));
      return Number.isSafeInteger(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  let best = readBest();
  let selected = 0;
  let phase = 'idle';
  let ready = false;
  let frame = 0;
  let previousTime = null;
  let width = 1;
  let height = 1;
  let elapsed = 0;
  let distance = 0;
  let hits = 0;
  let cooldown = 0;
  let lift = 0;
  let jumpSpeed = 0;
  let gap = 0;
  let paperClock = 0;
  let obstacles = [];
  let papers = [];

  const asset = name => {
    const image = new Image();
    image.src = new URL(`${name}.png`, arcadeAssets).href;
    return image;
  };
  const runner = [1, 2, 3, 4].map(n => asset(`kroky-run-${n}`));
  const monster = [3, 4, 5, 4].map(n => asset(`monster-run-${n}`));
  const caught = asset('monster-chase');
  const books = asset('books');

  function selectTab(index) {
    if (index === selected) return;
    if (index === 0) pause();
    selected = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    adventure.hidden = index === 1;
    main.classList.toggle('arcade-open', index === 1);
    if (index === 1) resize();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', event => {
      const next = { ArrowLeft: 1 - index, ArrowRight: 1 - index, Home: 0, End: 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectTab(next);
      tabs[next].focus();
    });
  });

  function saveBest() {
    try {
      best = Math.max(best, readBest());
      if (best > 0) localStorage.setItem(scoreKey, String(best));
    } catch {}
  }

  function showMessage(title, copy = '') {
    message.hidden = !title;
    element('run-message-title').textContent = title;
    element('run-message-copy').textContent = copy;
    element('run-message-copy').hidden = !copy;
  }

  function updateHud() {
    const meters = Math.floor(distance / 12);
    best = Math.max(best, meters);
    distanceLabel.textContent = `${meters} m`;
    bestLabel.textContent = `${best} m`;
    hitsLabel.textContent = `${hits} / 3`;
  }

  // The CSS size sets the playfield. The backing bitmap follows device pixel ratio.
  function resize() {
    if (selected !== 1 || !canvas) return;
    const bounds = track.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const oldRunner = runnerX();
    width = bounds.width;
    height = bounds.height;
    const offset = runnerX() - oldRunner;
    obstacles.forEach(book => { book.x += offset; });
    track.width = Math.round(width * dpr);
    track.height = Math.round(height * dpr);
    canvas.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function runnerX() {
    return Math.min(218, Math.max(129, width * .38));
  }

  function spriteWidth(image, spriteHeight) {
    return spriteHeight * image.naturalWidth / image.naturalHeight;
  }

  function drawSprite(image, x, ground, spriteHeight) {
    if (!image.naturalWidth) return;
    const w = spriteWidth(image, spriteHeight);
    canvas.drawImage(image, x - w / 2, ground - spriteHeight, w, spriteHeight);
  }

  function draw() {
    const ground = height - 31;
    const x = runnerX();
    const monsterX = x - [91, 69, 48, 21][hits];
    canvas.fillStyle = '#f0e8fa';
    canvas.fillRect(0, 0, width, height);
    canvas.fillStyle = '#fff4da';
    canvas.fillRect(0, ground, width, height - ground);
    canvas.fillStyle = '#7356a1';
    canvas.fillRect(0, ground, width, 2);
    canvas.fillStyle = '#9e81b9';
    for (let dash = -(distance % 43); dash < width; dash += 43) {
      canvas.fillRect(dash, ground + 13, 12, 2);
    }
    for (const paper of papers) {
      canvas.save();
      canvas.translate(paper.x, ground - paper.y);
      canvas.rotate(paper.angle);
      canvas.fillStyle = '#fff8e9';
      canvas.strokeStyle = '#8b6b9f';
      canvas.fillRect(-5, -4, 10, 8);
      canvas.strokeRect(-5, -4, 10, 8);
      canvas.restore();
    }
    for (const book of obstacles) drawSprite(books, book.x, ground + 1, book.h);
    const step = reducedMotion.matches ? 0 : Math.floor(elapsed * 12);
    const runnerFrame = runner[lift > 0 ? 1 : step % runner.length];
    const monsterFrame = phase === 'over' ? caught : monster[step % monster.length];
    if (phase === 'over') {
      drawSprite(runnerFrame, x + 12, ground + 1, 64);
      drawSprite(monsterFrame, monsterX, ground + 1, 95);
    } else {
      drawSprite(monsterFrame, monsterX, ground + 1, 89);
      drawSprite(runnerFrame, x, ground - lift + 1, 62);
    }
  }

  function jump() {
    if (phase !== 'running' || lift > 0 || jumpSpeed > 0) return;
    jumpSpeed = 490;
  }

  function spawnBook(speed) {
    const h = 26 + Math.random() * 18;
    obstacles.push({ x: width + 34, h, hit: false });
    // Space every pair by more than one full jump even at the top speed.
    gap = speed * (1.30 + Math.random() * .42);
  }

  function advance(dt) {
    elapsed += dt;
    const speed = Math.min(287, 176 + elapsed * 3.4);
    const travel = speed * dt;
    distance += travel;
    gap -= travel;
    cooldown = Math.max(0, cooldown - dt);
    if (gap <= 0) spawnBook(speed);
    if (lift > 0 || jumpSpeed > 0) {
      lift = Math.max(0, lift + jumpSpeed * dt);
      jumpSpeed = lift ? jumpSpeed - 1400 * dt : 0;
    }
    const x = runnerX();
    for (const book of obstacles) {
      book.x -= travel;
      const halfWidth = spriteWidth(books, book.h) * .43;
      if (book.hit || cooldown || Math.abs(book.x - x) >= halfWidth + 12 || lift + 4 >= book.h) continue;
      book.hit = true;
      hits++;
      cooldown = .62;
      status.textContent = hits < 3 ? `Hit ${hits} of 3. The Submission Monster is closer.` : 'Submission Monster got you!';
      if (hits === 3) {
        endRun();
        break;
      }
    }
    obstacles = obstacles.filter(book => book.x > -50);
    if (!reducedMotion.matches) {
      paperClock -= dt;
      if (paperClock <= 0) {
        papers.push({ x: x - [91, 69, 48, 21][hits], y: 70, angle: Math.random() });
        paperClock = .2;
      }
      papers.forEach(paper => {
        paper.x -= travel * .45;
        paper.y += 21 * dt;
        paper.angle += 4 * dt;
      });
      papers = papers.filter(paper => paper.x > -12 && paper.y < 130);
    } else {
      papers = [];
    }
    updateHud();
  }

  function tick(time) {
    frame = 0;
    if (phase !== 'running') return;
    if (previousTime !== null) advance(Math.min((time - previousTime) / 1000, .035));
    previousTime = time;
    draw();
    if (phase === 'running') frame = requestAnimationFrame(tick);
  }

  function play() {
    if (!ready || document.hidden || selected !== 1 || phase === 'running') return;
    if (phase !== 'paused') {
      elapsed = distance = hits = cooldown = lift = jumpSpeed = paperClock = 0;
      gap = 105;
      obstacles = [];
      papers = [];
      updateHud();
    }
    phase = 'running';
    previousTime = null;
    stage.classList.add('playing');
    action.textContent = 'Jump';
    showMessage('');
    status.textContent = 'Run started.';
    track.focus({ preventScroll: true });
    frame = requestAnimationFrame(tick);
  }

  function pause() {
    if (phase !== 'running') return;
    phase = 'paused';
    cancelAnimationFrame(frame);
    stage.classList.remove('playing');
    saveBest();
    action.textContent = 'Resume run';
    showMessage('Run paused');
  }

  function endRun() {
    phase = 'over';
    updateHud();
    saveBest();
    stage.classList.remove('playing');
    action.textContent = 'Resubmission';
    showMessage('SUBMISSION MONSTER GOT YOU!', 'Unfortunately, the deadline was not a suggestion.');
    action.focus({ preventScroll: true });
  }

  action.addEventListener('click', () => {
    if (phase === 'running') jump();
    else play();
  });
  track.addEventListener('pointerdown', event => {
    if (phase !== 'running' || event.button !== 0) return;
    event.preventDefault();
    jump();
  });
  document.addEventListener('keydown', event => {
    if (selected !== 1 || phase !== 'running' || !panels[1].contains(event.target)) return;
    if (event.code !== 'Space' && event.key !== 'ArrowUp') return;
    if (event.target === action && event.code === 'Space') return;
    event.preventDefault();
    if (!event.repeat) jump();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('pagehide', () => { pause(); saveBest(); });
  new ResizeObserver(resize).observe(track);
  updateHud();

  Promise.all([...runner, ...monster, caught, books].map(image => image.decode())).then(() => {
    ready = true;
    action.disabled = false;
    draw();
  }).catch(() => {
    showMessage('Game art could not load', 'Reload the page and try again.');
  });
})();
