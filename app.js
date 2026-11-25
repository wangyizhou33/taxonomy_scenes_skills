/* Physical Work Atlas — client-only interactive explorer. No backend/dependencies. */
(function () {
  'use strict';
  const DATA = window.PHYSICAL_WORK_TAXONOMY;
  if (!DATA) throw new Error('taxonomy-data.js must be loaded first.');

  const STORAGE_KEY = 'physical-work-atlas-v1';
  const LANGUAGE_KEY = 'physical-work-atlas-language';
  const THEME_KEY = 'physical-work-atlas-theme';
  let language = 'en';
  try { language = localStorage.getItem(LANGUAGE_KEY) === 'zh' ? 'zh' : 'en'; }
  catch { /* Storage is optional for file URLs. */ }
  const tr = (en, zh) => language === 'zh' ? zh : en;
  const typeLabels = {
    domain: ['L1 · Domain', 'L1 · 领域'], scene: ['L2 · Scene', 'L2 · 场景'],
    workflow: ['L3 · Workflow', 'L3 · 流程'], task: ['L4 · Task', 'L4 · 任务']
  };
  const typeLabel = type => tr(...typeLabels[type]);
  const nodeName = node => tr(node.en || node.label, node.label);
  const alternateName = node => node.en && node.en !== node.label ? tr(node.label, node.en) : '';
  const skillName = skill => tr(skill.name, skill.zh);
  const skillExamples = skill => tr(skill.examples, skill.examplesZh);
  const quantity = (count, singular, plural, zh) => tr(`${count} ${count === 1 ? singular : plural}`, `${count} ${zh}`);
  const numberOfSkills = count => quantity(count, 'skill', 'skills', '项技能');
  const CHILD_TYPE = { domain: 'scene', scene: 'workflow', workflow: 'task' };
  const COVERAGE_LABELS = { untracked: ['Untracked', '未标记'], planned: ['Planned', '已规划'], curated: ['Curated', '已策展'] };
  const coverageLabel = status => tr(...COVERAGE_LABELS[status]);
  const $ = (id) => document.getElementById(id);
  const safe = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeColor = (v) => /^#[0-9a-fA-F]{3,8}$/.test(String(v)) ? v : '#567cb7';
  const uid = () => `U-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const skillIds = new Set(DATA.SKILL_FAMILIES.map(s => s.id));

  const idealTaxonomy = DATA.seedTaxonomy();
  const seedIndex = new Map();
  function indexSeed(nodes) {
    for (const node of nodes) {
      seedIndex.set(node.id, node);
      indexSeed(node.children);
    }
  }
  indexSeed(idealTaxonomy);

  const capacityWorkflows = window.ATLAS_CAPACITY_WORKFLOWS || {};
  const capacityScenes = (window.ATLAS_CAPACITY_SCENES || []).map(scene => ({
    ...scene,
    type: 'scene',
    fromCapacity: true,
    children: (capacityWorkflows[scene.id] || []).map(([key, label, en, tasks]) => {
      const id = `${scene.id}-W-${key}`;
      return {
        id, label, en, type: 'workflow', fromCapacity: true,
        children: tasks.map(([taskKey, taskLabel, english, ...skills]) => ({
          id: `${id}-T-${taskKey}`, label: taskLabel, en: english, type: 'task', fromCapacity: true, skills, children: []
        }))
      };
    })
  }));
  const capacityScenesById = new Map(capacityScenes.map(scene => [scene.id, scene]));
  const sourceCapacityByDomain = new Map();
  for (const entry of window.ATLAS_CAPACITY) {
    const domainId = (capacityScenesById.get(entry.nodeId) || seedIndex.get(entry.nodeId))?.id.split('-')[0];
    if (!domainId) continue;
    if (!sourceCapacityByDomain.has(domainId)) sourceCapacityByDomain.set(domainId, []);
    sourceCapacityByDomain.get(domainId).push(entry);
  }
  const capacityByNode = new Map();
  const addedScenesByDomain = new Map();
  const capacityFor = node => capacityByNode.get(node) || [];
  const capacityCount = node => capacityFor(node).length;
  const recordCount = count => quantity(count, 'record', 'records', '条记录');

  const referenceLabel = node => node.type === 'task' ? tr('Reference task', '参考任务') : tr('Reference workflow', '参考流程');
  const isPlanningTask = node => node.type === 'task' && !node.fromCapacity;

  function capacityBadge(node) {
    const count = capacityCount(node);
    const status = node.fromCapacity && !node.unclassified ? tr('Capacity scene', '产能新增场景') : tr('Existing capacity', '已有产能');
    return count
      ? `<span class="capacity-badge is-existing">${status} · ${recordCount(count)}</span>`
      : `<span class="capacity-badge">${tr('Potential scope', '潜在范围')}</span>`;
  }
  const renderRadialOverview = window.createAtlasRadialOverview($('radial-overview'), tr, safe);
  const renderCoverageReport = window.createAtlasCoverage($('coverage-report'), idealTaxonomy, tr, nodeName, safe);
  let taxonomy = loadStored();
  let index = new Map();
  let selectedId = null;
  let selectedDomainId = 'D03';
  let expandedScenes = new Set(['D03-S01', 'D03-S02']);
  let mode = 'explore';
  let layout = 'map';
  let overview = false;
  let capacityOnly = false;
  let selectedSkillId = DATA.SKILL_FAMILIES[0].id;
  let editorMode = null;
  let editorTargetId = null;
  let toastTimer = null;
  let draggedSkill = null;
  let refreshHeroParticles;
  const skillDragType = 'application/x-atlas-skill';

  function validateAndNormalize(arr) {
    if (!Array.isArray(arr) || arr.length < 1 || arr.length > 200) throw new Error(tr('Expected a nonempty array of up to 200 L1 domains.', '请输入包含 1 至 200 个 L1 领域的数组。'));
    const seen = new Set();
    let count = 0;
    const types = ['domain', 'scene', 'workflow', 'task'];
    function visit(node, depth) {
      if (!node || typeof node !== 'object' || Array.isArray(node)) throw new Error(tr('Each taxonomy item must be a JSON object.', '每个分类条目应为 JSON 对象。'));
      if (node.type !== types[depth]) throw new Error(tr(`Invalid node type at level ${depth + 1}: expected ${types[depth]}.`, `L${depth + 1} 的节点类型无效，应为 ${types[depth]}。`));
      if (typeof node.id !== 'string' || node.id.length > 128 || !node.id) throw new Error(tr('Every node requires a valid string id.', '每个节点需要有效的字符串 ID。'));
      if (seen.has(node.id)) throw new Error(tr(`Duplicate node ID: ${node.id}`, `节点 ID 重复：${node.id}`));
      seen.add(node.id);
      if (typeof node.label !== 'string' || !node.label.trim() || node.label.length > 140) throw new Error(tr('Every node needs a short nonempty label.', '每个节点需要简短且非空的名称。'));
      if (++count > 10000) throw new Error(tr('The dataset contains more than 10,000 nodes.', '数据包含超过 10,000 个节点。'));
      if (node.children != null && !Array.isArray(node.children)) throw new Error(tr('children must be an array.', 'children 字段应为数组。'));
      if (depth === 3 && node.children && node.children.length) throw new Error(tr('L4 tasks cannot contain child nodes.', 'L4 任务不能包含子节点。'));
      const original = seedIndex.get(node.id);
      const matchesSeed = original?.type === node.type && original.label === node.label.trim();
      const skills = Array.isArray(node.skills) ? [...new Set(node.skills.filter(id => skillIds.has(id)))] : [];
      // Older copies started with empty skill lists. Explicitly cleared lists in new copies stay empty.
      const useSeedSkills = depth === 3 && matchesSeed && node.custom !== true && node.skills_initialized !== true && !skills.length;
      return {
        id: node.id,
        type: types[depth],
        label: node.label.trim(),
        en: (typeof node.en === 'string' ? node.en.trim().slice(0,140) : '') || (matchesSeed ? original.en : ''),
        description: typeof node.description === 'string' ? node.description.slice(0,1200) : '',
        icon: typeof node.icon === 'string' ? node.icon.slice(0,5) : '',
        color: safeColor(node.color),
        custom: node.custom === true,
        ...(depth === 3 && typeof node.coverage === 'string' && Object.hasOwn(COVERAGE_LABELS, node.coverage) ? { coverage: node.coverage } : {}),
        skills: useSeedSkills ? [...original.skills] : skills,
        ...(depth === 3 ? { skills_initialized: true } : {}),
        children: (node.children || []).map(n => visit(n,depth + 1))
      };
    }
    return arr.map(d => visit(d,0));
  }
  function loadStored() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return validateAndNormalize(JSON.parse(stored));
    } catch (err) { console.warn('Could not load local workspace:', err); }
    return DATA.seedTaxonomy();
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(taxonomy)); }
    catch (err) { toast(tr('Browser storage unavailable. Export JSON to keep your edits.', '浏览器存储不可用。请导出 JSON 保存修改。')); }
  }
  function rebuildIndex() {
    index = new Map();
    function visit(node, path, domainId) {
      const record = {node, path: [...path,node], domainId: domainId || node.id, parentId: path.length ? path[path.length-1].id : null};
      index.set(node.id, record);
      node.children.forEach(child => visit(child,record.path,record.domainId));
    }
    taxonomy.forEach(domain => visit(domain, [], null));
    capacityByNode.clear();
    addedScenesByDomain.clear();
    const hasIdConflict = node => index.has(node.id) || node.children.some(hasIdConflict);
    for (const domain of taxonomy) {
      if (domain.custom) continue;
      const extraScenes = capacityScenes.filter(scene => scene.domainId === domain.id && !hasIdConflict(scene));
      for (const scene of extraScenes) visit(scene, [domain], domain.id);
      addedScenesByDomain.set(domain, extraScenes);

      const records = sourceCapacityByDomain.get(domain.id) || [];
      capacityByNode.set(domain, records);
      const scenes = new Map([...domain.children, ...extraScenes]
        .filter(scene => !scene.custom && (!capacityScenesById.has(scene.id) || scene.fromCapacity))
        .map(scene => [scene.id, scene]));
      const unclassified = [];
      for (const entry of records) {
        const scene = scenes.get(entry.nodeId);
        if (scene) {
          if (!capacityByNode.has(scene)) capacityByNode.set(scene, []);
          capacityByNode.get(scene).push(entry);
        } else {
          unclassified.push(entry);
        }
      }
      if (!unclassified.length) continue;
      // Keep every record in exactly one visible scene, including in partial imports.
      const baseId = `${domain.id}-CAP-UNCLASSIFIED`;
      let id = baseId;
      let suffix = 2;
      while (index.has(id)) id = `${baseId}-${suffix++}`;
      const scene = {id, type: 'scene', label: '未分类', en: 'Unclassified', fromCapacity: true, unclassified: true, children: []};
      visit(scene, [domain], domain.id);
      extraScenes.push(scene);
      capacityByNode.set(scene, unclassified);
    }
  }
  function browsableChildren(node) {
    const extraScenes = addedScenesByDomain.get(node);
    return extraScenes?.length ? [...node.children, ...extraScenes] : node.children;
  }
  function counts(node, include = () => true) {
    const res = {domain:0,scene:0,workflow:0,task:0};
    function walk(n) {
      if (!include(n)) return;
      res[n.type]++;
      browsableChildren(n).forEach(walk);
    }
    if (node) walk(node); else taxonomy.forEach(walk);
    return res;
  }
  const getNode = id => index.get(id)?.node;
  const getDomain = () => getNode(selectedDomainId) || taxonomy[0];

  const filteringCapacity = () => mode === 'explore' && capacityOnly;
  const visibleNode = node => !filteringCapacity() || node.type === 'task' || node.type === 'workflow' || capacityCount(node) > 0;
  const visibleScenes = domain => browsableChildren(domain).filter(visibleNode);
  const hasCapacityAtPath = record => capacityCount(record?.path[1] || record?.node) > 0;

  function renderSidebar() {
    const domains = taxonomy.filter(visibleNode);
    $('domain-count').textContent = String(domains.length);
    $('overview-btn').classList.toggle('active',overview && mode==='explore');
    $('domain-list').innerHTML = domains.map(domain => `
      <button type="button" class="domain-item ${!overview && mode === 'explore' && selectedDomainId === domain.id ? 'active':''}" data-action="select" data-id="${safe(domain.id)}" title="${safe(alternateName(domain) || nodeName(domain))}">
        <span class="domain-symbol" aria-hidden="true">${safe(domain.icon || '◇')}</span>
        <span class="domain-name">${safe(nodeName(domain))}</span>
        ${capacityCount(domain) ? `<span class="capacity-dot"><span class="visually-hidden">${tr('Existing capacity', '已有产能')}</span></span>` : ''}
        <span class="domain-count">${visibleScenes(domain).length}</span>
      </button>`).join('');
  }
  function renderHero(domain) {
    const hero = $('domain-hero');
    if (!hero.firstElementChild) {
      hero.innerHTML = `<div id="hero-art" aria-hidden="true" class="hidden"><canvas id="hero-particles"></canvas></div>
        <div class="hero-content">
          <div class="hero-badges"><div class="hero-label"><span aria-hidden="true">◇</span> <span class="hero-level"></span></div><div id="hero-capacity"></div></div>
          <h2 class="hero-title"></h2>
          <div class="hero-english"></div>
          <p class="hero-description"></p>
        </div>
        <figure class="hero-photo hidden" id="hero-photo">
          <img id="hero-image" alt="" decoding="async">
          <figcaption><a id="hero-credit" target="_blank" rel="noopener noreferrer"></a></figcaption>
        </figure>`;
      $('hero-image').addEventListener('error', showHeroArt);
    }
    hero.querySelector('.hero-level').textContent = typeLabel('domain');
    const count = capacityCount(domain);
    $('hero-capacity').innerHTML = count
      ? `<button class="capacity-badge is-existing capacity-link" type="button" data-action="select" data-id="${safe(domain.id)}" data-reveal-details>${tr('Existing capacity', '已有产能')} · ${recordCount(count)}</button>`
      : capacityBadge(domain);
    hero.querySelector('.hero-title').textContent = nodeName(domain);
    hero.querySelector('.hero-english').textContent = alternateName(domain);
    hero.querySelector('.hero-description').textContent = domain.description ||
      tr('Explore the physical scenes, workflows, and tasks in this domain.', '浏览此领域的场景、工作流程和任务。');
    const original = seedIndex.get(domain.id);
    const matchesDomain = original && (domain.label === original.label || domain.en === original.en);
    if (!Object.hasOwn(DATA.DOMAIN_PHOTOS, domain.id) || domain.custom || !matchesDomain) {
      showHeroArt();
      return;
    }
    const [source, english, chinese, position = ''] = DATA.DOMAIN_PHOTOS[domain.id];
    const image = $('hero-image');
    const imagePath = `assets/domains/${domain.id}.jpg`;
    image.alt = tr(english, chinese);
    image.style.objectPosition = position;
    $('hero-credit').href = `https://www.pexels.com/photo/${source}/`;
    $('hero-credit').textContent = tr('Photo source', '图片来源');
    $('hero-photo').classList.remove('hidden');
    $('hero-art').classList.add('hidden');
    hero.classList.add('has-photo');
    if (image.getAttribute('src') !== imagePath) image.src = imagePath;
    else if (image.complete && !image.naturalWidth) showHeroArt();
  }
  function showHeroArt() {
    $('hero-photo').classList.add('hidden');
    $('domain-hero').classList.remove('has-photo');
    $('hero-art').classList.remove('hidden');
    if (!refreshHeroParticles) refreshHeroParticles = window.mountAtlasParticles($('hero-particles'));
  }
  function renderMetrics(domain) {
    const c = counts(domain, visibleNode);
    const planningTasks = [...index.values()].filter(record => record.domainId === domain.id && isPlanningTask(record.node) &&
      (!filteringCapacity() || hasCapacityAtPath(record)));
    const curated = planningTasks.filter(({ node }) => node.coverage === 'curated').length;
    $('metric-strip').innerHTML = [
      [typeLabel('scene'), c.scene, tr('Physical settings', '物理环境'), '◇'],
      [typeLabel('workflow'), c.workflow, tr('Work procedures', '操作流程'), '▤'],
      [typeLabel('task'), c.task, tr('Observable actions', '可观察动作'), '▦'],
      [tr('Curated tasks', '已策展任务'), curated, tr(`of ${planningTasks.length} tasks in the collection plan`, `采集计划内共 ${planningTasks.length} 项任务`), '◉']
    ].map(([label,value,sub,icon])=>`<div class="metric"><span class="metric-icon" aria-hidden="true">${icon}</span><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-sub">${sub}</div></div>`).join('');
  }
  function renderMap(domain) {
    const path = index.get(selectedId)?.path || [];
    const scenes = visibleScenes(domain);
    const scene = path[1] || scenes.find(item => item.children.some(flow => flow.children.length)) ||
      scenes.find(item => item.children.length) || scenes[0];
    const workflow = path[2] || scene?.children.find(item => item.children.length) || scene?.children[0];
    const map = $('workflow-map');
    const oldViewport = map.querySelector('.map-viewport');
    const scrollLeft = oldViewport?.dataset.domain === domain.id ? oldViewport.scrollLeft : 0;
    const scrollByBranch = new Map([...map.querySelectorAll('[data-map-branch]')].map(list => [list.dataset.mapBranch, list.scrollTop]));
    const lane = (type, label, nodes, branchId, parentId, empty) => `<div class="map-lane" data-lane="${type}"><div class="lane-label">${label}</div>
      <div class="map-nodes" data-map-branch="${safe(parentId || '')}">${nodes.length ? nodes.map(node => `
        <button type="button" class="map-node${node.id === branchId ? ' branch' : ''}${selectedId === node.id ? ' inspected' : ''}" aria-pressed="${node.id === branchId || selectedId === node.id}" data-action="select" data-id="${safe(node.id)}" ${isPlanningTask(node) ? `data-drop-task="${safe(node.id)}"` : node.children.length ? `aria-expanded="${node.id === branchId}"` : ''}>
          <span class="map-node-icon" aria-hidden="true">${node.type === 'scene' ? '◇' : node.type === 'workflow' ? '▤' : '▦'}</span>
          <span class="map-node-copy"><strong>${safe(nodeName(node))}</strong>
          <small>${node.type === 'task'
            ? `<span class="map-status ${node.coverage || 'untracked'}">${node.fromCapacity ? referenceLabel(node) : coverageLabel(node.coverage || 'untracked')}</span>${node.skills.length ? ` · ${numberOfSkills(node.skills.length)}` : ''}`
            : (node.type === 'scene' ? quantity(node.children.length, 'workflow', 'workflows', '个流程') : quantity(node.children.length, 'task', 'tasks', '项任务'))}
          ${node.fromCapacity && node.type === 'workflow' ? ` · ${referenceLabel(node)}` : ''}</small>
          ${node.type === 'scene' ? capacityBadge(node) : ''}</span>
        </button>`).join('') : `<p class="map-empty">${empty}</p>`}</div></div>`;
    map.innerHTML = `<div class="map-viewport" data-domain="${safe(domain.id)}" tabindex="0" role="region" aria-labelledby="navigator-title">
      <div class="map-board"><canvas class="map-connections" aria-hidden="true"></canvas>
        <div class="map-lane" data-lane="root"><div class="lane-label">${typeLabel('scene')}</div>
          <div class="map-nodes"><button type="button" class="map-node map-root${selectedId === domain.id ? ' inspected' : ''}" aria-pressed="${selectedId === domain.id}" data-action="select" data-id="${safe(domain.id)}">
            <span class="map-node-icon" aria-hidden="true">◇</span>
            <span class="map-node-copy"><strong>${tr('Physical scenes', '物理场景')}</strong>
              <small>${quantity(scenes.length, 'scene', 'scenes', '个场景')}</small></span>
          </button></div>
        </div>
        ${lane('scene', tr('Scene nodes', '场景节点'), scenes, scene?.id, domain.id, tr('No scenes yet', '暂无场景'))}
        ${lane('workflow', typeLabel('workflow'), scene?.children || [], workflow?.id, scene?.id,
          scene?.unclassified ? tr('Classify the scene to add workflows', '场景归类后可补充流程') : tr('No workflows yet', '暂无流程'))}
        ${lane('task', typeLabel('task'), workflow?.children || [], undefined, workflow?.id, tr('No tasks yet', '暂无任务'))}
      </div></div>`;
    map.querySelector('.map-viewport').scrollLeft = scrollLeft;
    for (const list of map.querySelectorAll('[data-map-branch]')) {
      if (list.dataset.mapBranch) list.scrollTop = scrollByBranch.get(list.dataset.mapBranch) || 0;
    }
    drawConnections();
  }
  function drawConnections() {
    const board = $('workflow-map').querySelector('.map-board');
    if (!board || !board.clientWidth) return;
    const canvas = board.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bounds = board.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(bounds.width * scale);
    canvas.height = Math.round(bounds.height * scale);
    ctx.scale(scale, scale);
    const root = board.querySelector('.map-root');
    const scene = board.querySelector('[data-lane="scene"] .branch');
    const workflow = board.querySelector('[data-lane="workflow"] .branch');
    const colors = window.getComputedStyle(board);
    const branchColor = colors.getPropertyValue('--map-link-muted').trim();
    function connect(source, targets, activeColor) {
      if (!source || !targets.length) return;
      const from = source.getBoundingClientRect();
      const fromList = source.parentElement.getBoundingClientRect();
      const fromY = from.top + from.height / 2;
      if (fromY < fromList.top || fromY > fromList.bottom) return;
      const toList = targets[0].parentElement.getBoundingClientRect();
      for (const target of targets) {
        const to = target.getBoundingClientRect();
        const toY = to.top + to.height / 2;
        if (toY < toList.top || toY > toList.bottom) continue;
        const x = from.right - bounds.left;
        const y = fromY - bounds.top;
        const endX = to.left - bounds.left;
        const endY = toY - bounds.top;
        if (endX <= x) return;
        const middle = (x + endX) / 2;
        ctx.strokeStyle = target.classList.contains('branch') || target.getAttribute('aria-pressed') === 'true' ? activeColor : branchColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(middle, y, middle, endY, endX, endY);
        ctx.stroke();
      }
    }
    const sceneLink = colors.getPropertyValue('--map-link-branch').trim();
    connect(root, board.querySelectorAll('[data-lane="scene"] .map-node'), sceneLink);
    connect(scene, board.querySelectorAll('[data-lane="workflow"] .map-node'), sceneLink);
    connect(workflow, board.querySelectorAll('[data-lane="task"] .map-node'), colors.getPropertyValue('--map-link-task').trim());
  }
  function renderTree(domain) {
    const scenes = visibleScenes(domain);
    if (!scenes.length) {
      const message = tr('No scenes yet. Select the domain and choose Add child.', '暂无场景。选择领域后点击「添加子节点」。');
      $('taxonomy-tree').innerHTML = `<div class="skill-empty">${message}</div>`;
      return;
    }
    $('taxonomy-tree').innerHTML = scenes.map(scene=>{
      const open = expandedScenes.has(scene.id);
      const sc = counts(scene);
      return `<div class="scene-item">
        <div class="scene-row">
          ${!scene.children.length ? '<span class="chevron" aria-hidden="true">◇</span>' :
            `<button class="chevron ${open?'open':''}" data-action="toggle-scene" data-id="${safe(scene.id)}" aria-label="${open ? tr('Collapse', '收起') : tr('Expand', '展开')} ${safe(nodeName(scene))}" aria-expanded="${open}">▶</button>`}
          <button data-action="select" data-id="${safe(scene.id)}" class="tree-label-button ${selectedId === scene.id?'selected':''}">${safe(nodeName(scene))}${capacityBadge(scene)}</button>
          <span class="scene-count-pill">${scene.unclassified ? tr('No workflow mapped', '暂无流程') :
            `${quantity(sc.workflow, 'flow', 'flows', '个流程')} · ${quantity(sc.task, 'task', 'tasks', '项任务')}`}</span>
        </div>
        ${open && scene.children.length?`<div class="tree-children">${scene.children.map(workflow=>`
          <div class="workflow-item"><div class="workflow-row"><span class="workflow-marker">↳</span><button class="workflow-label ${selectedId===workflow.id?'selected':''}" data-action="select" data-id="${safe(workflow.id)}">${safe(nodeName(workflow))}</button><span class="scene-count-pill">${workflow.fromCapacity ? `${referenceLabel(workflow)} · ` : ''}${workflow.children.length}</span></div>
          <div class="task-list">${workflow.children.map(task=>`<button class="task-item ${selectedId===task.id?'selected':''}" data-action="select" data-id="${safe(task.id)}" ${isPlanningTask(task) ? `data-drop-task="${safe(task.id)}"` : ''}><span class="task-bullet"></span><span class="task-label">${safe(nodeName(task))}</span>${task.fromCapacity ? `<span class="task-skills-count">${referenceLabel(task)}</span>` : ''}${task.skills?.length?`<span class="task-skills-count">${numberOfSkills(task.skills.length)}</span>`:''}</button>`).join('')}</div>
          </div>`).join('')}</div>`:''}
      </div>`;
    }).join('');
  }
  function renderCapacityDetails(node, path) {
    if (node.type === 'workflow' || node.type === 'task') {
      const scene = path[1];
      const count = capacityCount(scene);
      return count ? `<button type="button" class="text-btn scene-capacity-link" data-action="select" data-id="${safe(scene.id)}" data-reveal-details>
        ${tr('View capacity for this scene', '查看所在场景的产能')} · ${recordCount(count)}
      </button>` : '';
    }

    const entries = capacityFor(node);
    if (!entries.length) return `<section class="capacity-detail"><h4>${tr('Capacity', '产能')}</h4>${capacityBadge(node)}
      <p>${tr('No matching records in the source sheet.', '来源表中暂无对应记录。')}</p></section>`;

    const groups = node.type === 'domain'
      ? browsableChildren(node).map(scene => [scene, capacityFor(scene)]).filter(([, records]) => records.length)
      : [[node, entries]];
    const photoCount = entries.reduce((count, entry) => count + entry.photos.length, 0);
    const photoLabel = quantity(photoCount, 'photo', 'photos', '张贴图');

    const image = (filename, entry) => {
      const href = `assets/capacity/${filename}`;
      const caption = tr(`Source photo, row ${entry.row}`, `来源表第 ${entry.row} 行贴图`);
      return `<a class="capacity-image" href="${href}" target="_blank" rel="noopener" aria-label="${caption}">
        <img src="${href}" alt="${caption}" loading="lazy" decoding="async">
      </a>`;
    };

    const photos = entries.flatMap(entry => entry.photos.map(filename => ({ filename, entry })));
    return `<section class="capacity-detail">
      <h4>${tr('Existing capacity', '已有产能')}</h4>
      <p>${recordCount(entries.length)} · ${photoLabel}</p>
      ${photos.length ? `<div class="capacity-images">${photos.slice(0, 2).map(({ filename, entry }) => image(filename, entry)).join('')}</div>` : ''}
      <details class="capacity-records">
        <summary>${tr('View records and photos', '查看记录和贴图')}</summary>
        <div class="capacity-record-list">
          ${groups.map(([scene, records]) => `<section class="capacity-record-group">
            ${node.type === 'domain' ? `<h5>${safe(nodeName(scene))} · ${recordCount(records.length)}</h5>` : ''}
            ${records.map(entry => `<div class="capacity-record"><strong lang="zh-CN">${safe(entry.category)} · ${safe(entry.venueType)}</strong>
              <small>${tr(`Row ${entry.row}`, `第 ${entry.row} 行`)}${entry.photos.length ? '' : tr(' · No photo', ' · 未附贴图')}</small>
              ${entry.photos.length ? `<div class="capacity-images">${entry.photos.map(filename => image(filename, entry)).join('')}</div>` : ''}
            </div>`).join('')}
          </section>`).join('')}
        </div>
      </details>
    </section>`;
  }

  function renderDetails() {
    const record = index.get(selectedId) || index.get(selectedDomainId);
    if (!record) { $('details-panel').innerHTML = `<div class="empty-details">${tr('Select a taxonomy node to view its details.', '选择分类节点查看详情。')}</div>`; return; }
    const {node,path} = record;
    const c = counts(node, visibleNode);
    const isLeaf = node.type === 'task';
    const crumbs = path.map((n,i)=>`${i?'<span class="crumb-arrow">›</span>':''}<span class="crumb ${i===path.length-1?'current':''}">${safe(nodeName(n))}</span>`).join('');
    const description = node.unclassified ? tr('Capacity records awaiting scene classification.', '尚未归入具体场景的产能记录。') :
      node.fromCapacity ? (node.type === 'scene'
        ? tr('This scene comes from capacity records. Its workflows and tasks are reference examples.', '此场景来自产能记录，下方流程和任务为参考示例。')
        : tr('A reference example based on the scene type. The collection status for this example is unverified.', '根据场景类型整理的参考示例，采集状态待核实。'))
      : node.description || (!isLeaf ? defaultDescription(node) : '');
    const referenceSkills = isLeaf && node.fromCapacity && node.skills.length ? `
      <h4 class="skill-heading">${tr('Suggested skills', '建议技能')}</h4>
      <div class="detail-actions">${DATA.SKILL_FAMILIES.filter(skill => node.skills.includes(skill.id)).map(skill =>
        `<span class="assigned-skill" style="--skill-accent:${skill.color}">${safe(skillName(skill))}</span>`).join('')}</div>` : '';
    const skills = isPlanningTask(node) ? `
      <label class="coverage-field" for="task-coverage">${tr('Collection status', '采集状态')}
        <select id="task-coverage">${Object.keys(COVERAGE_LABELS).map(id => `<option value="${id}" ${id === (node.coverage || 'untracked') ? 'selected' : ''}>${coverageLabel(id)}</option>`).join('')}</select>
      </label>
      <div class="detail-divider"></div>
      <h4 class="skill-heading">${tr('Transferable skills', '可迁移技能')}</h4>
      <div class="skill-zone" data-drop-task="${safe(node.id)}">
        ${node.skills.length ? node.skills.map(id => {
          const skill = DATA.SKILL_FAMILIES.find(item => item.id === id);
          return `<button type="button" class="assigned-skill" style="--skill-accent:${skill.color}" data-action="toggle-tag" data-id="${id}" aria-label="${safe(tr(`Remove ${skillName(skill)}`, `移除${skillName(skill)}`))}">${safe(skillName(skill))} <span aria-hidden="true">×</span></button>`;
        }).join('') : `<span>${tr('Drop skill cards here', '将技能卡拖到此处')}</span>`}
      </div>
      <p class="skill-note">${tr('Drag a card onto a task or select it to toggle the tag.', '将技能卡拖到任务上，也可点击卡片添加或移除标签。')}</p>
      <div class="skill-checklist">${DATA.SKILL_FAMILIES.map(skill => `<button type="button" class="skill-option" style="--skill-accent:${skill.color}" draggable="true" data-skill="${skill.id}" data-action="toggle-tag" data-id="${skill.id}" aria-pressed="${node.skills.includes(skill.id)}" title="${safe(skillExamples(skill))}"><span class="skill-grip" aria-hidden="true">⠿</span><span class="skill-option-label">${safe(skillName(skill))}</span><span class="skill-chip-icon" aria-hidden="true">${node.skills.includes(skill.id) ? '✓' : '+'}</span></button>`).join('')}</div>` : '';
    $('details-panel').innerHTML = `
      <div class="detail-topline"><span class="level-pill">${typeLabel(node.type)}</span><span class="detail-id">${node.fromCapacity && node.type !== 'scene' ? referenceLabel(node) : tr('NODE INSPECTOR', '节点详情')}</span></div>
      <h3 tabindex="-1">${safe(nodeName(node))}</h3>
      ${alternateName(node) ? `<div class="detail-en">${safe(alternateName(node))}</div>` : ''}
      <div class="breadcrumb">${crumbs}</div>
      <div class="detail-divider"></div>
      ${description ? `<div class="detail-body">${safe(description)}</div>${isLeaf ? '<div class="detail-divider"></div>' : ''}` : ''}
      ${!isLeaf && !node.unclassified?`<div class="detail-divider"></div><div class="detail-section-label">${tr('CHILD NODES', '下级节点')}</div><div class="count-tiles"><div class="count-tile"><b>${c.scene}</b><span>${tr('Scenes', '场景')}</span></div><div class="count-tile"><b>${c.workflow}</b><span>${tr('Workflows', '流程')}</span></div><div class="count-tile"><b>${c.task}</b><span>${tr('Tasks', '任务')}</span></div></div>`:''}
      ${renderCapacityDetails(node, path)}
      ${skills}
      ${referenceSkills}
      ${node.fromCapacity ? '' : `<div class="detail-actions">
      ${!isLeaf?`<button type="button" class="action-btn primary" data-action="add-child" data-id="${safe(node.id)}">＋ ${tr('Add child', '添加子节点')}</button>`:''}
      <button type="button" class="action-btn secondary" data-action="edit" data-id="${safe(node.id)}">✎ ${tr('Edit', '编辑')}</button>
      ${node.custom?`<button type="button" class="action-btn danger" data-action="delete" data-id="${safe(node.id)}">${tr('Delete', '删除')}</button>`:''}
      </div>`}`;
  }
  function defaultDescription(node) {
    return {
      domain: tr('A top-level societal work area. Organize its physical settings into L2 scenes.', '社会活动的顶层领域，下分为 L2 物理场景。'),
      scene: tr('A concrete physical environment where human work is performed. Expand into goal-directed L3 workflows.', '人类活动发生的具体物理环境，下分为 L3 工作流程。'),
      workflow: tr('A process with an operational objective. Decompose into observable, outcome-defined L4 tasks.', '具有明确操作目标的流程，下分为 L4 可观察任务。'),
      task: tr('A concrete physical task. Define its starting state, desired outcome, objects, and success criteria as your dataset matures.', '具体的体力任务，可记录初始状态、预期结果、涉及物体和成功标准。')
    }[node.type];
  }
  function renderOverview() {
    const c = counts(undefined, visibleNode);
    const coveredDomains = taxonomy.filter(domain => capacityCount(domain));
    const coveredScenes = taxonomy.reduce((count, domain) => count + browsableChildren(domain).filter(capacityCount).length, 0);
    const shown = capacityOnly ? coveredDomains : taxonomy;
    $('overview-title').textContent = capacityOnly ? tr('Domains with existing capacity', '已有产能的领域') : tr('All domains', '全部领域');
    $('overview-summary').innerHTML = `
      <div class="capacity-overview">
        <p>${tr(`Existing capacity in ${quantity(coveredDomains.length, 'domain', 'domains', '个领域')} and ${quantity(coveredScenes, 'scene', 'scenes', '个场景')}`, `已有产能覆盖 ${coveredDomains.length} 个领域、${coveredScenes} 个场景`)}</p>
      </div>
      <div class="overview-metrics">${[
        [typeLabel('domain'), c.domain, tr('Societal work areas', '社会活动领域')], [typeLabel('scene'), c.scene, tr('Physical environments', '物理环境')],
        [typeLabel('workflow'), c.workflow, tr('Goal-directed processes', '目标导向的流程')], [typeLabel('task'), c.task, tr('Observable actions', '可观察动作')]
      ].map(([label,value,desc])=>`<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-sub">${desc}</div></div>`).join('')}</div>`;
    renderRadialOverview(shown.map(domain => ({
      id: domain.id,
      label: nodeName(domain),
      color: safeColor(domain.color),
      scenes: visibleScenes(domain).map(scene => ({
        id: scene.id,
        label: nodeName(scene),
        records: capacityFor(scene)
      }))
    })));
  }
  function renderSkillView() {
    const allTasks = [...index.values()].filter(r=>r.node.type==='task');
    const annotatedCount = id => allTasks.filter(r=>r.node.skills.includes(id)).length;
    $('skill-family-list').innerHTML = DATA.SKILL_FAMILIES.map(s=>`
      <button class="skill-family ${selectedSkillId === s.id?'active':''}" aria-pressed="${selectedSkillId === s.id}" data-action="select-skill" data-id="${safe(s.id)}"><span class="skill-swatch" style="background:${safeColor(s.color)}"></span><span class="skill-family-info"><span class="skill-family-name">${safe(skillName(s))}</span><span class="skill-family-cn">${safe(tr(s.zh, s.name))}</span></span><span class="skill-family-count">${annotatedCount(s.id)}</span></button>`).join('');
    const skill = DATA.SKILL_FAMILIES.find(s=>s.id===selectedSkillId) || DATA.SKILL_FAMILIES[0];
    const tasks = allTasks.filter(r=>r.node.skills.includes(skill.id));
    $('skill-task-list').innerHTML = `<div class="mini-eyebrow">${tr('RELATED TASKS', '关联任务')}</div><h3 style="margin-top:8px">${safe(skillName(skill))}</h3><div class="skill-task-intro">${safe(skillExamples(skill))}<br>${tr(`${quantity(tasks.length, 'tagged task', 'tagged tasks', '项任务')} across the taxonomy.`, `全分类共 ${tasks.length} 项任务带有此标签。`)}</div>
       ${tasks.length?tasks.map(r=>`<button class="skill-result" data-action="select" data-id="${safe(r.node.id)}"><div class="skill-result-title">${safe(nodeName(r.node))}</div><div class="skill-result-path">${r.node.fromCapacity ? `${referenceLabel(r.node)} · ` : ''}${r.path.map(n=>safe(nodeName(n))).join(' / ')}</div></button>`).join(''):
         `<div class="skill-empty">${tr('No tasks tagged in this family yet. Open a task in Scene taxonomy to assign skills.', '暂无任务带有此技能标签。请在领域场景分类体系中打开任务并添加技能。')}</div>`}`;
  }
  function renderCoverage() {
    const byDomain = new Map(taxonomy.map(domain => [domain.id, { untracked: 0, planned: 0, curated: 0 }]));
    const totals = { untracked: 0, planned: 0, curated: 0 };
    for (const { node, domainId } of index.values()) {
      if (!isPlanningTask(node)) continue;
      const status = node.coverage || 'untracked';
      byDomain.get(domainId)[status]++;
      totals[status]++;
    }
    $('coverage-summary').innerHTML = Object.keys(COVERAGE_LABELS).reverse().map(id =>
      `<div class="metric"><div class="metric-label"><span class="coverage-key ${id}"></span>${coverageLabel(id)}</div><div class="metric-value">${totals[id]}</div></div>`).join('');
    const filter = $('coverage-filter').value || 'all';
    const statuses = filter === 'all' ? ['curated', 'planned', 'untracked'] : [filter];
    const countFor = domain => statuses.reduce((sum, id) => sum + byDomain.get(domain.id)[id], 0);
    const max = Math.max(1, ...taxonomy.map(countFor));
    $('coverage-subtitle').textContent = filter === 'all' ? tr('Select a domain to explore its tasks.', '选择领域浏览任务。') : tr(`${totals[filter]} ${coverageLabel(filter).toLowerCase()} tasks across all domains.`, `全部领域共 ${totals[filter]} 项${coverageLabel(filter)}任务。`);
    $('coverage-chart').innerHTML = taxonomy.map(domain => {
      const values = byDomain.get(domain.id);
      const caption = statuses.map(id => `${values[id]} ${coverageLabel(id).toLowerCase()}`).join(', ');
      return `<button type="button" class="coverage-row" data-action="select" data-id="${safe(domain.id)}" aria-label="${safe(nodeName(domain))}, ${caption}">
        <span>${safe(nodeName(domain))}</span>
        <span class="coverage-track" aria-hidden="true">${statuses.map(id => `<span class="${id}" style="--bar-width:${values[id] / max * 100}%"></span>`).join('')}</span>
        <strong>${countFor(domain)}</strong></button>`;
    }).join('');
  }
  function render() {
    rebuildIndex();
    if (!getNode(selectedDomainId)) selectedDomainId = taxonomy[0].id;
    if (selectedId && !index.has(selectedId)) selectedId = selectedDomainId;
    if (filteringCapacity() && !overview && !hasCapacityAtPath(index.get(selectedId))) {
      const domain = taxonomy.find(item => item.id === selectedDomainId && capacityCount(item)) ||
        taxonomy.find(item => capacityCount(item));
      if (domain) {
        selectedDomainId = domain.id;
        const scene = visibleScenes(domain)[0];
        selectedId = scene?.id || domain.id;
        if (scene) expandedScenes.add(scene.id);
      } else {
        overview = true;
      }
    }
    $('capacity-filter-controls').classList.toggle('hidden', mode !== 'explore');
    $('capacity-filter-all').setAttribute('aria-pressed', String(!capacityOnly));
    $('capacity-filter-existing').setAttribute('aria-pressed', String(capacityOnly));
    renderSidebar();
    for (const view of ['explore', 'skills', 'coverage']) {
      const active = mode === view;
      $(`${view}-view`).classList.toggle('hidden', !active);
      const tab = $(`tab-${view}`);
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    }
    $('overview-view').classList.toggle('hidden',!overview);
    $('domain-view').classList.toggle('hidden',overview);
    if (mode==='skills') renderSkillView();
    if (mode==='coverage') { renderCoverageReport(); renderCoverage(); }
    if (mode==='explore') {
      if (overview) renderOverview();
      else {
        const domain = getDomain();
        renderHero(domain);
        renderMetrics(domain);
        const map = layout === 'map';
        $('layout-map').setAttribute('aria-pressed', String(map));
        $('layout-tree').setAttribute('aria-pressed', String(!map));
        $('workflow-map').classList.toggle('hidden', !map);
        $('tree-view').classList.toggle('hidden', map);
        $('navigator-title').textContent = map ? tr('Workflow map', '工作流程图') : tr('Taxonomy tree', '分类树状图');
        $('navigator-description').textContent = map ? tr('Choose a scene or workflow to update the task list.', '选择场景或流程，查看对应任务。') : tr('Expand a scene to explore its workflows and tasks.', '展开场景查看其流程和任务。');
        if (map) renderMap(domain);
        else renderTree(domain);
        renderDetails();
      }
    }
  }
  function select(id, { revealDetails = true } = {}) {
    const record = index.get(id);
    if (!record) return;
    if (capacityOnly && !hasCapacityAtPath(record)) capacityOnly = false;
    selectedId = id;
    selectedDomainId = record.domainId;
    if (record.path.length>1) expandedScenes.add(record.path[1].id);
    overview = false;
    mode = 'explore';
    $('global-search').value = '';
    hideSearch();
    closeMobile();
    render();
    if (revealDetails && window.innerWidth < 821) {
      $('details-panel').scrollIntoView({ block: 'start' });
      $('details-panel').querySelector('h3')?.focus({ preventScroll: true });
    }
  }
  function openOverview() {
    mode='explore'; overview=true; hideSearch(); closeMobile(); render();
  }
  function switchMode(next) {
    mode=next; overview=false; hideSearch(); closeMobile(); render();
  }
  function showSearch() {
    const q = $('global-search').value.trim().toLocaleLowerCase();
    if (!q) { hideSearch(); return; }
    const matches = [...index.values()].filter(r=>{
      if (filteringCapacity() && !hasCapacityAtPath(r)) return false;
      const n = r.node;
      return `${n.label} ${n.en||''} ${n.description||''} ${n.id}`.toLocaleLowerCase().includes(q);
    });
    const view = matches.slice(0,48);
    $('search-popover').innerHTML = `<div class="search-summary">${quantity(matches.length, 'match', 'matches', '条结果')} ${matches.length > view.length ? tr(`· Showing first ${view.length}`, `· 显示前 ${view.length} 条`) : ''}</div>` +
      (view.length ? view.map(r=>`<button class="search-result" data-action="select" data-id="${safe(r.node.id)}"><span class="search-type">${safe(typeLabel(r.node.type).split(' · ')[0])}</span><span class="search-text"><div class="search-name">${safe(nodeName(r.node))} ${alternateName(r.node) ? `<span class="search-path">· ${safe(alternateName(r.node))}</span>` : ''}</div><div class="search-path">${r.path.slice(0,-1).map(n=>safe(nodeName(n))).join(' › ') || tr('Top-level domain', '顶层领域')}</div></span></button>`).join(''):
      `<div class="search-noresult">${tr('No results. Try a broader term.', '没有搜索结果。请尝试更宽泛的关键词。')}</div>`);
    $('search-popover').classList.remove('hidden');
  }
  function hideSearch() { $('search-popover').classList.add('hidden'); }
  function openEditor(editorType, targetId) {
    const node = getNode(targetId);
    if (!node || node.fromCapacity || (editorType==='add' && !CHILD_TYPE[node.type])) return;
    editorMode=editorType; editorTargetId=targetId;
    const nextType = editorType==='add' ? CHILD_TYPE[node.type] : node.type;
    $('editor-title').textContent = editorType === 'add' ? tr('Add a taxonomy node', '添加分类节点') : tr('Edit taxonomy node', '编辑分类节点');
    $('node-level').value = `${typeLabel(nextType)}${editorType === 'add' ? tr(` · Under ${nodeName(node)}`, ` · 上级为${nodeName(node)}`) : ''}`;
    $('node-label').value = editorType==='edit' ? node.label : '';
    $('node-en').value = editorType==='edit' ? (node.en||'') : '';
    $('node-description').value = editorType==='edit' ? (node.description||'') : '';
    $('editor-backdrop').classList.remove('hidden');
    $('node-label').focus();
  }
  function closeEditor() { $('editor-backdrop').classList.add('hidden'); editorMode=null; editorTargetId=null; }
  function submitEditor(e) {
    e.preventDefault();
    const target = getNode(editorTargetId);
    if (!target) return;
    const label = $('node-label').value.trim();
    if (!label) { $('node-label').focus(); return; }
    const en = $('node-en').value.trim();
    const description = $('node-description').value.trim();
    if (editorMode==='edit') {
      target.label=label; target.en=en; target.description=description;
      toast(tr('Taxonomy node updated.', '分类节点已更新。'));
    } else {
      const created = {id:uid(), type:CHILD_TYPE[target.type], label, en, description, skills:[], children:[], custom:true};
      target.children.push(created);
      selectedId = created.id;
      if (created.type === 'scene') capacityOnly = false;
      if (target.type === 'scene') expandedScenes.add(target.id);
      if (target.type === 'workflow') {
        const path = index.get(target.id)?.path;
        if (path?.[1]) expandedScenes.add(path[1].id);
      }
      toast(tr('New taxonomy node added.', '已添加分类节点。'));
    }
    closeEditor(); save(); render();
  }
  function deleteCustom(id) {
    const record = index.get(id);
    if (!record?.node.custom) return;
    if (!record.parentId && taxonomy.length === 1) { toast(tr('Keep at least one domain in the atlas.', '请至少保留一个领域。')); return; }
    if (!window.confirm(tr(`Delete “${record.node.label}” and all descendants?`, `删除「${nodeName(record.node)}」及其所有下级节点？`))) return;
    const parent = getNode(record.parentId);
    const siblings = parent ? parent.children : taxonomy;
    const pos = siblings.findIndex(n => n.id===id);
    if (pos>=0) siblings.splice(pos,1);
    expandedScenes.delete(id);
    selectedId = parent?.id || taxonomy[0]?.id;
    selectedDomainId = index.get(selectedId)?.domainId || taxonomy[0]?.id;
    save(); render(); toast(tr('Custom node deleted.', '自定义节点已删除。'));
  }
  function exportData() {
    const data = {schema_version:DATA.SCHEMA_VERSION, exported_at:new Date().toISOString(), description:'Universal Human Physical Work Taxonomy — 4 levels', taxonomy, skill_families:DATA.SKILL_FAMILIES};
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=href; a.download='physical-work-taxonomy.json'; document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(href),1500);
    toast(tr('Taxonomy and skill labels exported as JSON.', '已导出分类、技能标签和任务状态。'));
  }
  async function importData(file) {
    if (!file) return;
    try {
      if (file.size>8*1024*1024) throw new Error(tr('File exceeds 8 MB.', '文件超过 8 MB。'));
      const parsed = JSON.parse(await file.text());
      const next = validateAndNormalize(Array.isArray(parsed)?parsed:parsed.taxonomy);
      if (!window.confirm(tr(`Replace your local workspace with ${next.length} imported domains? Export existing edits first if needed.`, `用导入的 ${next.length} 个领域替换本地工作区？如需保留现有修改，请先导出。`))) return;
      taxonomy = next;
      selectedDomainId = taxonomy[0].id;
      selectedId = selectedDomainId;
      expandedScenes.clear();
      overview=true;
      mode='explore';
      save(); render(); toast(tr('Imported taxonomy successfully.', '分类已导入。'));
    } catch(err) { window.alert(tr(`Import failed: ${err.message}`, `导入失败：${err.message}`)); }
    finally { $('import-file').value=''; }
  }
  function closeMobile() {
    $('sidebar').classList.remove('open');
    $('mobile-overlay').classList.add('hidden');
    $('mobile-menu').setAttribute('aria-expanded', 'false');
  }
  function toast(message) {
    $('toast').textContent=message;
    $('toast').classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer=window.setTimeout(()=>$('toast').classList.add('hidden'),3000);
  }

  function setSkill(taskId, skillId, allowRemoval = false) {
    const task = getNode(taskId);
    if (!task || !isPlanningTask(task) || !skillIds.has(skillId)) return false;
    const hasSkill = task.skills.includes(skillId);
    if (hasSkill && !allowRemoval) { toast(tr('This task already has that skill.', '此任务已有该技能标签。')); return false; }
    task.skills = hasSkill ? task.skills.filter(id => id !== skillId) : [...task.skills, skillId];
    task.skills_initialized = true;
    toast(hasSkill ? tr('Skill tag removed.', '技能标签已移除。') : tr('Skill tag assigned.', '技能标签已添加。'));
    save();
    render();
    return true;
  }

  function clearSkillDrag() {
    draggedSkill = null;
    document.body.classList.remove('skill-dragging');
    document.querySelectorAll('.drop-hover').forEach(target => target.classList.remove('drop-hover'));
  }

  $('overview-btn').addEventListener('click',openOverview);
  $('tab-explore').addEventListener('click',()=>switchMode('explore'));
  $('tab-skills').addEventListener('click',()=>switchMode('skills'));
  $('tab-coverage').addEventListener('click',()=>switchMode('coverage'));
  document.querySelector('.mode-tabs').addEventListener('keydown', e => {
    const tabs = ['explore', 'skills', 'coverage'];
    const current = tabs.indexOf(mode);
    const next = { ArrowRight: (current + 1) % tabs.length, ArrowLeft: (current + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    switchMode(tabs[next]);
    $(`tab-${tabs[next]}`).focus();
  });
  $('layout-map').addEventListener('click', () => { layout = 'map'; render(); });
  $('layout-tree').addEventListener('click', () => { layout = 'tree'; render(); });
  $('workflow-map').addEventListener('scroll', e => {
    if (e.target.matches('[data-map-branch]')) drawConnections();
  }, true);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(drawConnections).observe($('workflow-map'));
  else window.addEventListener('resize', drawConnections);
  const staticLabels = [...document.querySelectorAll('[data-zh]')].map(el => [el, null, el.textContent, el.dataset.zh]);
  for (const attr of ['aria-label', 'placeholder', 'title']) {
    for (const el of document.querySelectorAll(`[data-zh-${attr}]`)) {
      staticLabels.push([el, attr, el.getAttribute(attr), el.getAttribute(`data-zh-${attr}`)]);
    }
  }
  function applyLanguage() {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = tr('Physical Work Atlas · Embodied AI Taxonomy', '人类体力活动图谱 · 具身智能分类');
    $('language-zh').setAttribute('aria-pressed', String(language === 'zh'));
    $('language-en').setAttribute('aria-pressed', String(language === 'en'));
    for (const [el, attr, en, zh] of staticLabels) {
      if (attr) el.setAttribute(attr, tr(en, zh));
      else el.textContent = tr(en, zh);
    }
    const filter = $('coverage-filter');
    const previousFilter = filter.value || 'all';
    filter.innerHTML = `<option value="all">${tr('All statuses', '全部状态')}</option>` +
      Object.keys(COVERAGE_LABELS).map(id => `<option value="${id}">${coverageLabel(id)}</option>`).join('');
    filter.value = previousFilter;
  }
  for (const nextLanguage of ['zh', 'en']) {
    $(`language-${nextLanguage}`).addEventListener('click', () => {
      if (language === nextLanguage) return;
      language = nextLanguage;
      try { localStorage.setItem(LANGUAGE_KEY, language); }
      catch { /* The choice still applies for the current page. */ }
      $('toast').classList.add('hidden');
      applyLanguage();
      render();
      if (!$('search-popover').classList.contains('hidden')) showSearch();
    });
  }
  applyLanguage();
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $('theme-bright').setAttribute('aria-pressed', String(theme === 'bright'));
    $('theme-dark').setAttribute('aria-pressed', String(theme === 'dark'));
    const color = window.getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    document.querySelector('meta[name="theme-color"]').setAttribute('content', color);
    refreshHeroParticles?.();
    drawConnections();
  }
  applyTheme(document.documentElement.dataset.theme === 'bright' ? 'bright' : 'dark');
  for (const theme of ['bright', 'dark']) {
    $(`theme-${theme}`).addEventListener('click', () => {
      applyTheme(theme);
      try { localStorage.setItem(THEME_KEY, theme); }
      catch { /* The choice still applies for the current page. */ }
    });
  }
  $('coverage-filter').addEventListener('change', renderCoverage);
  $('expand-all').addEventListener('click',()=>{ visibleScenes(getDomain()).forEach(n=>expandedScenes.add(n.id));render(); });
  $('collapse-all').addEventListener('click',()=>{ visibleScenes(getDomain()).forEach(n=>expandedScenes.delete(n.id));render(); });
  $('global-search').addEventListener('input',showSearch);
  $('global-search').addEventListener('focus',showSearch);
  $('export-btn').addEventListener('click',exportData);
  $('reset-btn').addEventListener('click',()=>{
    if (!window.confirm(tr('Restore the original seed taxonomy? All locally saved edits and skill tags will be replaced. Export JSON first if you want to keep them.', '恢复初始分类体系？这会覆盖本地编辑、技能标签和任务状态。如需保留，请先导出 JSON。'))) return;
    taxonomy = DATA.seedTaxonomy();
    selectedId = selectedDomainId = 'D03';
    expandedScenes = new Set(['D03-S01','D03-S02']);
    overview = true; mode = 'explore';
    save(); render(); toast(tr('Default taxonomy restored.', '已恢复初始分类体系。'));
  });
  $('import-btn').addEventListener('click',()=>$('import-file').click());
  $('import-file').addEventListener('change',e=>importData(e.target.files[0]));
  $('node-form').addEventListener('submit',submitEditor);
  $('close-editor').addEventListener('click',closeEditor);
  $('cancel-editor').addEventListener('click',closeEditor);
  $('editor-backdrop').addEventListener('click',e=>{if(e.target===$('editor-backdrop'))closeEditor();});
  $('mobile-menu').addEventListener('click',()=>{
    $('sidebar').classList.add('open');
    $('mobile-overlay').classList.remove('hidden');
    $('mobile-menu').setAttribute('aria-expanded', 'true');
    $('overview-btn').focus();
  });
  $('mobile-overlay').addEventListener('click',closeMobile);
  document.addEventListener('click',e=>{
    const actionable = e.target.closest('[data-action]');
    if (!actionable) { if (!$('search-wrap').contains(e.target))hideSearch(); return; }
    const {action,id} = actionable.dataset;
    if (action==='select') {
      const fromMap = actionable.classList.contains('map-node');
      const type = getNode(id)?.type;
      const revealDetails = actionable.dataset.revealDetails !== undefined || type === 'task' || (!fromMap && type !== 'domain');
      select(id, { revealDetails });
      if (fromMap && (!revealDetails || window.innerWidth >= 821)) {
        const next = [...$('workflow-map').querySelectorAll('.map-node')].find(button => button.dataset.id === id);
        next?.focus({ preventScroll: true });
        if (e.detail > 0 && next && type !== 'task') {
          const lane = next.closest('.map-lane').nextElementSibling;
          const viewport = next.closest('.map-viewport');
          const outside = lane.getBoundingClientRect().right - viewport.getBoundingClientRect().right;
          if (outside > 0) viewport.scrollLeft += outside + 12;
        }
      }
    }
    else if (action === 'capacity-filter') {
      capacityOnly = id === 'existing';
      hideSearch();
      render();
    }
    else if (action==='toggle-scene') { expandedScenes.has(id)?expandedScenes.delete(id):expandedScenes.add(id);render(); }
    else if (action==='select-skill') {
      selectedSkillId=id;
      renderSkillView();
      $('skill-family-list').querySelector('.active')?.focus({ preventScroll: true });
    }
    else if (action==='toggle-tag' && setSkill(selectedId, id, true)) {
      $('details-panel').querySelector(`[data-skill="${id}"]`)?.focus({ preventScroll: true });
    }
    else if (action==='add-child') openEditor('add',id);
    else if (action==='edit') openEditor('edit',id);
    else if (action==='delete') deleteCustom(id);
  });
  $('details-panel').addEventListener('change',e=>{
    if (e.target.id !== 'task-coverage' || !Object.hasOwn(COVERAGE_LABELS, e.target.value)) return;
    const node = getNode(selectedId);
    if (!node || !isPlanningTask(node)) return;
    node.coverage = e.target.value;
    toast(tr('Collection status saved.', '采集状态已保存。'));
    save();
    render();
    $('task-coverage').focus({ preventScroll: true });
  });
  document.addEventListener('dragstart', e => {
    const card = e.target.closest('[draggable][data-skill]');
    if (!card) return;
    draggedSkill = card.dataset.skill;
    e.dataTransfer.setData(skillDragType, draggedSkill);
    e.dataTransfer.effectAllowed = 'copy';
    document.body.classList.add('skill-dragging');
  });
  document.addEventListener('dragover', e => {
    const target = e.target.closest('[data-drop-task]');
    if (!draggedSkill || !target) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    target.classList.add('drop-hover');
  });
  document.addEventListener('dragleave', e => {
    const target = e.target.closest('[data-drop-task]');
    if (target && !target.contains(e.relatedTarget)) target.classList.remove('drop-hover');
  });
  document.addEventListener('drop', e => {
    const target = e.target.closest('[data-drop-task]');
    if (!draggedSkill || !target) return;
    e.preventDefault();
    const skill = e.dataTransfer.getData(skillDragType);
    if (skill === draggedSkill) setSkill(target.dataset.dropTask, skill);
    clearSkillDrag();
  });
  document.addEventListener('dragend', clearSkillDrag);
  document.addEventListener('keydown',e=>{
    const typing = ['INPUT','TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if ((e.key==='/' || (e.key.toLowerCase()==='k'&&(e.ctrlKey||e.metaKey))) && !typing && $('editor-backdrop').classList.contains('hidden')) {
      e.preventDefault(); $('global-search').focus();
    }
    if (e.key==='Escape') { hideSearch(); if (!$('editor-backdrop').classList.contains('hidden'))closeEditor(); closeMobile(); }
  });

  rebuildIndex();
  selectedDomainId = getNode('D03')?.type === 'domain' ? 'D03' : taxonomy[0].id;
  selectedId = getDomain().children[0]?.children[0]?.children[0]?.id || selectedDomainId;
  render();
})();
