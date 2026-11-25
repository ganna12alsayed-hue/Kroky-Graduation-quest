const storageKey = 'kroky-grad-v1';
const questAssets = new URL('./assets/', document.currentScript.src);
let state = {};
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) state = saved;
} catch {}

const $ = id => document.getElementById(id);
const taskId = (week, quest, task) => `${week[0]}-${quest}-${task}`;
const questIds = (week, quest) => week[6][quest][2].map((_, task) => taskId(week, quest, task));
const weekIds = week => week[6].flatMap((_, quest) => questIds(week, quest));
const allIds = WEEKS.flatMap(weekIds);
const count = ids => ids.filter(id => state[id]).length;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const world = $('world');
const traveler = $('traveler');
const kroky = $('kroky');
const speech = $('speech');
const classicPoses = ['default', 'work', 'happy', 'sleep', 'graduate'];
const walkFrames = ['walk-1', 'walk-2', 'walk-3', 'walk-4'];
const poses = Object.fromEntries([...classicPoses, ...walkFrames, 'reading', 'hungry', 'exhausted', 'eating-fries', 'celebrating'].map(name => {
  const image = new Image();
  const file = classicPoses.includes(name) ? `${name}.png`
    : walkFrames.includes(name) ? `arcade/kroky-run-${name.at(-1)}.png`
      : `poses/${name}.png`;
  image.src = new URL(file, questAssets).href;
  return [name, image];
}));
const milestones = {
  10: [['library', 'Library'], ['research', 'Research'], ['cafeteria', 'Cafeteria']],
  11: [['site', 'Site'], ['investigate', 'Investigate'], ['notes', 'Notes']],
  12: [['studio', 'Studio'], ['submission', 'Submission'], ['sleep', 'Sleep']],
  13: [['materials', 'Materials'], ['studio', 'Studio'], ['moodboard', 'Mood board']],
  14: [['puzzle', 'Collect puzzle'], ['zoning', 'Zoning'], ['puzzle', 'Solve puzzle']],
  15: [['studio', 'Studio'], ['submission', 'Submission'], ['gown', 'Gown']],
  16: [['submission', 'Submission'], ['gown', 'Gown'], ['celebrate', 'Celebrate']]
};

// The story props are separate layers around the approved character artwork.
const stories = {
  10: {
    title: 'Escape the Library & Fuel Up',
    beats: [
      ['reading', 'I’ve been in this library for nine weeks. One more page…'],
      ['walk-1', 'We made it outside. Is that the smell of cheesy fries?'],
      ['hungry', 'My stomach is peer-reviewing this entire thesis.'],
      ['exhausted', 'Too many analyses. Someone roll me to the fries.']
    ],
    scenery: '',
    prop: '<span class="fry"></span><span class="fry"></span><span class="fry"></span>',
    action: 'Cheesy fries! I’m calling this a research expense.',
    pose: 'eating-fries',
    ending: 'Week complete! Cheesy fries acquired. You are my favourite human.',
    duration: 1700
  },
  11: {
    beats: [
      ['default', 'Bag packed. Camera? Check. Sense of direction? Absolutely not.', 'bag'],
      ['work', 'A clue! Or a drainage cover. Let’s get closer.', 'lens'],
      ['work', 'Into the site notes it goes. Detective handwriting is a secret code.', 'notes']
    ],
    scenery: '<span class="case-file"><span>CASE CLOSED</span></span>',
    prop: '<span class="magnifier"></span>',
    action: 'Kroky checks the site clues and stamps the case closed.',
    actionPose: 'work',
    pose: 'happy'
  },
  12: {
    beats: [
      ['work', 'Studio mode. Please tell me Figure 27 actually exists.'],
      ['exhausted', 'If the paper mountain gets any higher, it needs a site plan.', 'papers'],
      ['work', 'Final files ready. Hovering over Submit counts as cardio.', 'upload']
    ],
    scenery: '<span class="bed"></span>',
    prop: '<span class="bed-cover"></span><span class="dream">z z Z</span><span class="submission-receipt">✓</span>',
    action: 'Files submitted. Kroky reaches the bed and drifts off.',
    actionPose: 'work',
    pose: 'sleep'
  },
  13: {
    beats: [
      ['default', 'Welcome to the materials shop. We cannot solve everything with beige.', 'samples'],
      ['work', 'Texture samples acquired. The backpack has filed a complaint.', 'samples'],
      ['work', 'Let’s pin the colours before I adopt another sample.', 'samples']
    ],
    scenery: '<span class="mood-board"></span>',
    prop: '<span class="swatch"></span><span class="swatch"></span><span class="swatch"></span>',
    action: 'Kroky pins the collected colour and material samples to the mood board.',
    actionPose: 'work',
    pose: 'happy'
  },
  14: {
    beats: [
      ['work', 'Apparently, circulation is not optional.', 'pieces'],
      ['work', 'I found another piece under the bubble diagrams.', 'pieces'],
      ['work', 'The pieces are ready. Time to see which spaces fit together.', 'pieces']
    ],
    scenery: '<span class="puzzle-board"></span>',
    prop: '<span class="puzzle-piece"></span><span class="puzzle-piece"></span><span class="puzzle-piece"></span><span class="puzzle-piece"></span>',
    action: 'Kroky fits the spatial puzzle pieces together.',
    actionPose: 'work',
    pose: 'work'
  },
  15: {
    beats: [
      ['work', 'Remember when the thesis was just a small research assignment?', 'papers'],
      ['work', 'Panel coming together. I can almost see my desk again.', 'notes'],
      ['default', 'The graduation shop is open. Do they have a backpack-friendly gown?']
    ],
    scenery: '<span class="gown"></span>',
    prop: '<span class="sparkle"></span>',
    action: 'Kroky slips into the graduation gown.',
    pose: 'graduate'
  },
  16: {
    beats: [
      ['work', 'This is it. Our moment of glory.', 'upload'],
      ['work', 'One file down. My paw is shaking over the last upload.', 'upload']
    ],
    scenery: '<span class="podium"></span>',
    prop: '<span class="cap"></span>',
    action: 'WE DID IT! WE’RE GRADUATING!',
    ending: 'Wait... WHAT DO YOU MEAN THERE’S ANOTHER SEMESTER?!',
    actionPose: 'celebrating',
    pose: 'celebrating',
    duration: 2050
  }
};
let current = WEEKS[0];
let sceneTimers = [];

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    $('storage').textContent = 'Saved.';
  } catch {
    $('storage').textContent = 'Storage unavailable; progress may be lost.';
  }
}

function setPose(name) {
  if (kroky.src !== poses[name].src) kroky.src = poses[name].src;
  traveler.dataset.pose = name;
}

function later(callback, delay) {
  sceneTimers.push(setTimeout(callback, delay));
}

function celebrate(large) {
  if (reducedMotion.matches) return;
  const colors = ['#17355e', '#7356b5', '#f4c629', '#fff'];
  const fragments = document.createDocumentFragment();
  for (let index = 0; index < (large ? 34 : 12); index++) {
    const piece = document.createElement('i');
    piece.style.setProperty('--color', colors[index % colors.length]);
    piece.style.setProperty('--x', `${(Math.random() - .5) * (large ? 54 : 25)}cqw`);
    piece.style.setProperty('--y', `${-28 - Math.random() * (large ? 91 : 43)}px`);
    piece.style.setProperty('--spin', `${Math.random() * 540 - 270}deg`);
    fragments.append(piece);
  }
  $('confetti').replaceChildren(fragments);
  later(() => $('confetti').replaceChildren(), 1100);
}

function updateProgress({ checked = false, questDone = false, instant = false } = {}) {
  sceneTimers.forEach(clearTimeout);
  sceneTimers = [];
  $('confetti').replaceChildren();
  const ids = weekIds(current);
  const done = count(ids);
  const ratio = done / ids.length;
  const complete = done === ids.length;
  const story = stories[current[0]];
  const [pose, reaction, accessory] = story.beats[Math.min(story.beats.length - 1, Math.floor(ratio * story.beats.length))];
  const walking = checked && !reducedMotion.matches;
  const overall = count(allIds);
  $('overall').innerHTML = `Overall progress · ${overall}/${allIds.length}<progress aria-label="Overall progress" value="${overall}" max="${allIds.length}"></progress>`;
  $('weekly').innerHTML = `${done}/${ids.length} tasks completed<progress aria-label="Weekly progress" value="${done}" max="${ids.length}"></progress>`;
  world.classList.remove('performing', 'complete');
  traveler.classList.remove('walking');
  traveler.classList.toggle('instant', instant);
  if (instant) traveler.getBoundingClientRect();
  world.style.setProperty('--position', `${12 + ratio * 70}%`);

  const milestone = complete ? 2 : ratio >= .5 ? 1 : 0;
  for (const [index, stop] of Array.from($('milestones').children).entries()) {
    stop.classList.toggle('reached', index < milestone || complete);
    if (index === milestone) stop.setAttribute('aria-current', 'step');
    else stop.removeAttribute('aria-current');
  }
  world.dataset.accessory = complete ? '' : (accessory || '');
  if (!complete) speech.textContent = questDone ? `Quest complete! ${reaction}` : reaction;

  function settle() {
    traveler.classList.remove('walking');
    if (complete) {
      const finish = () => {
        world.classList.remove('performing');
        world.classList.add('complete');
        setPose(story.pose);
        speech.textContent = story.ending || current[5];
        if (checked && current[0] !== 16) celebrate(true);
      };
      if (walking) {
        speech.textContent = story.action;
        setPose(story.actionPose || (current[0] === 15 ? 'default' : story.pose));
        world.classList.add('performing');
        if (current[0] === 12) later(() => setPose('sleep'), 520);
        if (current[0] === 15) later(() => setPose('graduate'), 650);
        if (current[0] === 16) later(() => celebrate(true), 290);
        later(finish, story.duration || 1250);
      } else {
        finish();
        if (checked && current[0] === 16) speech.textContent = `${story.action} ${story.ending}`;
      }
    } else {
      setPose(pose);
      if (checked && questDone) celebrate(false);
    }
  }

  if (walking) {
    setPose(walkFrames[0]);
    for (let step = 1; step < 7; step++) {
      later(() => setPose(walkFrames[step % walkFrames.length]), step * 85);
    }
    traveler.classList.add('walking');
    if (complete) speech.textContent = `Last task done! ${current[0] === 10 ? 'I can smell the fries from here.' : 'One last walk before I call it a week.'}`;
    later(settle, 620);
  } else {
    settle();
  }
}

function render() {
  for (const button of $('weeks').children) {
    const selected = Number(button.textContent) === current[0];
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  const story = stories[current[0]];
  $('mission').innerHTML = `<small>WEEK ${current[0]}</small><h2>${story.title || current[1]}</h2><div id="weekly"></div>`;
  $('milestones').innerHTML = milestones[current[0]].map(([icon, label]) =>
    `<li><img src="${new URL(`map-icons/${icon}.svg`, questAssets).href}" alt=""><span>${label}</span></li>`
  ).join('');
  world.dataset.week = current[0];
  $('story-prop').innerHTML = story.scenery;
  $('action-prop').innerHTML = story.prop;
  $('quests').replaceChildren();
  current[6].forEach((quest, index) => {
    const article = document.createElement('article');
    article.innerHTML = `<small>QUEST ${index + 1} · ${quest[1]}</small><h3>${quest[0]}</h3>`;
    quest[2].forEach((task, taskIndex) => {
      const id = taskId(current, index, taskIndex);
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!state[id];
      checkbox.onchange = () => {
        state[id] = checkbox.checked;
        save();
        const ids = questIds(current, index);
        updateProgress({ checked: checkbox.checked, questDone: checkbox.checked && count(ids) === ids.length });
      };
      label.append(checkbox, document.createTextNode(task));
      article.append(label);
    });
    $('quests').append(article);
  });
  updateProgress({ instant: true });
}

for (const week of WEEKS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = week[0];
  button.onclick = () => {
    current = week;
    render();
  };
  $('weeks').append(button);
}
$('reset').onclick = () => {
  if (!confirm('Reset only this week?')) return;
  weekIds(current).forEach(id => delete state[id]);
  save();
  render();
};

const panel = document.querySelector('.scene');
const sceneToggle = $('scene-toggle');
sceneToggle.onclick = () => {
  const collapsed = panel.classList.toggle('collapsed');
  sceneToggle.setAttribute('aria-expanded', String(!collapsed));
  sceneToggle.textContent = collapsed ? 'Show scene' : 'Hide scene';
};
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--panel-height', `${panel.offsetHeight}px`);
}).observe(panel);
render();
