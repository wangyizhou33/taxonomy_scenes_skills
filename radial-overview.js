/* The overview aligns its domain, scene and record-photo rings by angle. */
(function () {
  'use strict';

  const center = 570;
  const turn = 2 * Math.PI;
  const start = -Math.PI / 2 + .035;
  const end = start + turn - .07;
  const domainRadius = 195;
  const sceneRadius = 282;
  const photoRadius = 421;
  const previewRadius = 45;
  const clipId = 'atlas-radial-photo-clip';
  const point = (radius, angle) => ({
    x: +(center + radius * Math.cos(angle)).toFixed(2),
    y: +(center + radius * Math.sin(angle)).toFixed(2)
  });

  function arc(radius, from, to) {
    const a = point(radius, from);
    const b = point(radius, to);
    const large = Math.abs(to - from) > Math.PI ? 1 : 0;
    return `M${a.x} ${a.y} A${radius} ${radius} 0 ${large} ${to > from ? 1 : 0} ${b.x} ${b.y}`;
  }

  function divide(items, from, to, weight) {
    const total = items.reduce((sum, item) => sum + weight(item), 0);
    let angle = from;
    return items.map(item => {
      const startAngle = angle;
      angle += (to - from) * weight(item) / total;
      return {item, from: startAngle, to: angle};
    });
  }

  const characterWidth = char => char.codePointAt(0) > 127 ? 1 : .57;
  const labelWidth = label => [...label].reduce((total, char) => total + characterWidth(char), 0);

  function clippedLabel(label, width, size) {
    let available = width;
    let result = '';
    for (const char of label) {
      available -= size * characterWidth(char);
      if (available < -.001) break;
      result += char;
    }
    if (result === label) return label;
    return result.length >= 3 ? result.trimEnd().slice(0, -1) + '…' : '';
  }

  function line(from, to) {
    return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/>`;
  }

  function connectRings(innerAngle, outerAngle) {
    const points = [0, .25, .5, .75, 1].map(progress => {
      const radius = domainRadius + 21 + (sceneRadius - 17 - domainRadius - 21) * progress;
      const eased = progress * progress * (3 - 2 * progress);
      const location = point(radius, innerAngle + (outerAngle - innerAngle) * eased);
      return `${location.x},${location.y}`;
    });
    return `<polyline points="${points.join(' ')}"/>`;
  }

  window.createAtlasRadialOverview = function (root, tr, safe) {
    let data = [];
    let domainId = '';
    let sceneId = '';
    let photos = [];

    const interactionHint = () => tr(
      'Hover to see full names or enlarge photos. Select a sector to focus the chart.',
      '悬停查看全名或放大贴图，点击扇区聚焦。'
    );
    const nameOfPhoto = record => tr(`Row ${record.row} · ${record.venueType}`, `第 ${record.row} 行 · ${record.venueType}`);
    const sceneWeight = scene => scene.photos.length ? scene.photos.length + .6 : .8;

    function segment(item, from, to, radius, kind, i) {
      const mid = (from + to) / 2;
      const gap = Math.min(kind === 'domain' ? .012 : .0045, (to - from) / 5);
      const length = (to - from - gap * 2) * radius;
      const width = Math.max(length - 6, 0);
      const size = kind === 'domain'
        ? Math.max(10, Math.min(15, width / labelWidth(item.label)))
        : Math.max(8, Math.min(12, width / labelWidth(item.label)));
      const label = clippedLabel(item.label, width, size);
      const reverse = Math.sin(mid) > 0;
      const trackId = `radial-${kind}-label-${i}`;
      return `<g class="radial-segment radial-${kind}${item.photos?.length ? ' has-photos' : ''}" tabindex="0" role="button"
          data-radial-${kind}="${safe(item.id)}" aria-label="${safe(item.label)}" style="--sector-color:${safe(item.color)}">
        <path class="radial-wedge" d="${arc(radius, from + gap, to - gap)}"/>
        ${label ? `<path id="${trackId}" fill="none" stroke="none" d="${arc(radius, reverse ? to : from, reverse ? from : to)}"/>
          <text font-size="${size}" dy=".33em" text-anchor="middle"><textPath href="#${trackId}" startOffset="50%">${safe(label)}</textPath></text>` : ''}
      </g>`;
    }

    function photoMarkup(photo, index) {
      const {x, y, radius, angle, spacing, record, file, color} = photo;
      const left = Math.cos(angle) < 0;
      const direction = angle * 180 / Math.PI + (left ? 180 : 0);
      const labelPoint = point(photoRadius + radius + 5, angle);
      const font = Math.min(12, Math.max(5.5, spacing * .8));
      const label = nameOfPhoto(record);
      const shortLabel = clippedLabel(label, 115, font) || String(record.row);
      return `<g class="radial-photo" role="button" tabindex="0" aria-haspopup="dialog" data-radial-photo="${index}" aria-label="${safe(label)}">
        <title>${safe(label)}</title>
        <circle class="radial-photo-hit" cx="${x}" cy="${y}" r="${radius + 1}"/>
        <image id="radial-thumbnail-${index}" class="radial-thumbnail" href="${safe(`assets/capacity/thumbs/${file}`)}" x="${x - radius}" y="${y - radius}"
          width="${radius * 2}" height="${radius * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>
        <circle class="radial-photo-outline" cx="${x}" cy="${y}" r="${radius}" style="--sector-color:${safe(color)}"/>
        <text class="radial-record-label" x="${labelPoint.x}" y="${labelPoint.y}" font-size="${font}" dominant-baseline="central"
          transform="rotate(${direction} ${labelPoint.x} ${labelPoint.y})" text-anchor="${left ? 'end' : 'start'}">${safe(shortLabel)}</text>
      </g>`;
    }

    function render() {
      const domain = data.find(item => item.id === domainId);
      const scene = domain?.scenes.find(item => item.id === sceneId);
      domainId = domain?.id || '';
      sceneId = scene?.id || '';
      const active = scene || domain;
      const visible = domain ? [{...domain, scenes: scene ? [scene] : domain.scenes}] : data;
      photos = [];
      const domainMarks = [];
      const sceneMarks = [];
      const spokes = [];
      // Distribute domain labels independently so domains with few photos stay legible.
      const domainParts = divide(visible, start, end, item => 3 + labelWidth(item.label));
      const sceneGroups = divide(visible, start, end,
        item => 3 + item.scenes.reduce((sum, sub) => sum + sceneWeight(sub), 0));
      for (const [i, {item: arm, from, to}] of sceneGroups.entries()) {
        const domainPart = domainParts[i];
        domainMarks.push(segment(arm, domainPart.from, domainPart.to, domainRadius, 'domain', i));
        const pad = Math.min(.017, (to - from) / 12);
        for (const part of divide(arm.scenes, from + pad, to - pad, sceneWeight)) {
          const middle = (part.from + part.to) / 2;
          const sub = part.item;
          sceneMarks.push(segment({...sub, color: arm.color}, part.from, part.to, sceneRadius, 'scene', sceneMarks.length));
          const fraction = (middle - from) / (to - from);
          const innerAngle = domainPart.from + (domainPart.to - domainPart.from) * fraction;
          spokes.push(connectRings(innerAngle, middle));
          if (!sub.photos.length) continue;
          const step = (part.to - part.from) / sub.photos.length;
          const spacing = step * photoRadius;
          sub.photos.forEach(({record, file}, i) => {
            const angle = part.from + step * (i + .5);
            const radius = Math.min(16, spacing * .42);
            const coordinates = point(photoRadius, angle);
            photos.push({...coordinates, radius, angle, spacing, record, file, color: arm.color});
            spokes.push(line(point(sceneRadius + 17, angle), point(photoRadius - radius - 2, angle)));
          });
        }
      }

      const options = (items, selected) => items.map(item =>
        `<option value="${safe(item.id)}"${item.id === selected ? ' selected' : ''}>${safe(item.label)}</option>`).join('');
      const scopeLabel = scene ? scene.label : domain?.label;
      const count = photos.length;
      const countLabel = tr(`${count} ${count === 1 ? 'photo' : 'photos'}`, `${count} 张贴图`);
      const viewport = root.querySelector('.radial-viewport');
      const oldScroll = viewport?.scrollLeft;
      root.innerHTML = `<div class="radial-toolbar">
          <div class="radial-selectors">
            <label>${tr('Domain', '领域')} <select data-radial-scope="domain"><option value="">${tr('All domains', '全部领域')}</option>${options(data, domainId)}</select></label>
            <label>${tr('Scene', '场景节点')} <select data-radial-scope="scene"${domain ? '' : ' disabled'}><option value="">${tr('All scenes', '全部场景')}</option>${options(domain?.scenes || [], sceneId)}</select></label>
          </div>
          ${active ? `<button type="button" class="action-btn secondary" data-action="select" data-id="${safe(active.id)}">${tr('Open details', '打开详情')}</button>` : ''}
        </div>
        <div class="radial-guide"><span>${tr('Domain', '领域')}</span><span>${tr('Scene', '场景节点')}</span><span>${tr('Photo', '贴图')}</span><p id="radial-hint">${interactionHint()}</p></div>
        ${visible.length ? `<div class="radial-viewport">
          <svg class="radial-chart" viewBox="0 0 1140 1140" role="group" aria-label="${tr('Scene taxonomy radial chart', '领域场景分类环形图')}">
            <defs><clipPath id="${clipId}" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath></defs>
            <g class="radial-guides" aria-hidden="true">${[domainRadius, sceneRadius, photoRadius].map(radius => `<circle cx="${center}" cy="${center}" r="${radius}"/>`).join('')}</g>
            <g class="radial-spokes" aria-hidden="true">${spokes.join('')}</g>
            ${domainMarks.join('')}
            ${sceneMarks.join('')}
            ${photos.map(photoMarkup).join('')}
            <g class="radial-center${active ? ' is-reset' : ''}"${active ? ` tabindex="0" role="button" data-radial-reset aria-label="${tr('Reset to all domains', '返回全部领域')}"` : ''}>
              <circle cx="${center}" cy="${center}" r="132"/>
              <text class="radial-center-title" x="${center}" y="${active ? 541 : 552}" text-anchor="middle">${tr('Scene taxonomy', '领域场景分类体系')}</text>
              ${active ? `<text class="radial-center-count" x="${center}" y="567" text-anchor="middle">${safe(clippedLabel(scopeLabel, 220, 14))}</text>` : ''}
              <text class="radial-center-count" x="${center}" y="${active ? 590 : 582}" text-anchor="middle">${countLabel}</text>
              ${active ? `<text class="radial-center-reset" x="${center}" y="615" text-anchor="middle">${tr('All domains', '返回全部领域')}</text>` : ''}
            </g>
            <g id="radial-photo-preview" class="radial-photo-preview" visibility="hidden" aria-hidden="true">
              <circle r="48" class="radial-preview-shadow"/>
              <use/>
              <circle r="46" class="radial-photo-outline"/>
            </g>
          </svg>
        </div>
        <div class="radial-sector-tooltip" aria-hidden="true" hidden></div>
        <dialog class="modal radial-photo-dialog" aria-labelledby="radial-photo-title">
          <div class="modal-header">
            <h2 id="radial-photo-title"></h2>
            <button type="button" class="icon-btn" data-radial-photo-close autofocus aria-label="${tr('Close photo', '关闭图片')}">✕</button>
          </div>
          <img alt="">
        </dialog>` : `<p class="skill-empty">${tr('No domains match the current filter.', '当前筛选下暂无领域。')}</p>`}`;
      const nextViewport = root.querySelector('.radial-viewport');
      if (nextViewport) nextViewport.scrollLeft = oldScroll ?? (nextViewport.scrollWidth - nextViewport.clientWidth) / 2;
    }

    function showSectorLabel(sector, event) {
      const tooltip = root.querySelector('.radial-sector-tooltip');
      if (!tooltip) return;
      tooltip.hidden = !sector;
      if (!sector) return;

      tooltip.textContent = sector.getAttribute('aria-label');
      const bounds = root.getBoundingClientRect();
      const anchor = sector.getBoundingClientRect();
      const keyboard = event.type === 'focusin';
      const x = keyboard ? anchor.left + anchor.width / 2 : event.clientX;
      const y = keyboard ? anchor.top : event.clientY;
      const width = tooltip.offsetWidth;
      const height = tooltip.offsetHeight;
      const left = Math.max(bounds.left, 0) + 8;
      const right = Math.min(bounds.right, document.documentElement.clientWidth) - 8;
      const top = Math.max(bounds.top, 0) + 8;
      const above = y - height - 12;
      tooltip.style.left = `${Math.max(left, Math.min(x - width / 2, right - width)) - bounds.left}px`;
      tooltip.style.top = `${(above >= top ? above : Math.max(top, y + 12)) - bounds.top}px`;
    }

    function showPhoto(target) {
      const photo = target && photos[Number(target.dataset.radialPhoto)];
      const preview = root.querySelector('#radial-photo-preview');
      if (!preview) return;
      preview.setAttribute('visibility', photo ? 'visible' : 'hidden');
      if (photo) {
        preview.setAttribute('transform', `translate(${photo.x} ${photo.y})`);
        // Reuse the rendered thumbnail so opening the preview does not fetch an image.
        const thumbnail = preview.querySelector('use');
        thumbnail.setAttribute('href', `#radial-thumbnail-${target.dataset.radialPhoto}`);
        thumbnail.setAttribute('transform', `scale(${previewRadius / photo.radius}) translate(${-photo.x} ${-photo.y})`);
      }
      root.querySelector('#radial-hint').textContent = photo ? nameOfPhoto(photo.record) : interactionHint();
    }

    function openPhoto(trigger) {
      const photo = photos[Number(trigger.dataset.radialPhoto)];
      const dialog = root.querySelector('.radial-photo-dialog');
      const label = nameOfPhoto(photo.record);
      dialog.querySelector('h2').textContent = label;
      const image = dialog.querySelector('img');
      image.alt = label;
      image.src = `assets/capacity/${photo.file}`;
      trigger.focus({ preventScroll: true });
      dialog.showModal();
      showPhoto(null);
    }

    function activateSector(control) {
      if (control.hasAttribute('data-radial-reset')) {
        domainId = '';
        sceneId = '';
        return;
      }
      if (control.dataset.radialDomain) {
        domainId = control.dataset.radialDomain;
        sceneId = '';
        return;
      }
      sceneId = control.dataset.radialScene;
      domainId = data.find(item => item.scenes.some(scene => scene.id === sceneId))?.id || '';
    }

    const sectors = '[data-radial-domain], [data-radial-scene], [data-radial-reset]';
    root.addEventListener('click', event => {
      if (event.target.closest('[data-radial-photo-close]')) {
        event.target.closest('dialog').close();
        return;
      }
      const photo = event.target.closest('[data-radial-photo]');
      if (photo) {
        openPhoto(photo);
        return;
      }
      const control = event.target.closest(sectors);
      if (!control) return;
      activateSector(control);
      render();
    });
    root.addEventListener('keydown', event => {
      if (event.target.closest('.radial-photo-dialog')) {
        event.stopPropagation();
        return;
      }
      if (event.key === 'Escape') showSectorLabel(null);
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const photo = event.target.closest('[data-radial-photo]');
      if (photo) {
        event.preventDefault();
        openPhoto(photo);
        return;
      }
      const control = event.target.closest(sectors);
      if (!control) return;
      event.preventDefault();
      activateSector(control);
      render();
      root.querySelector(`[data-radial-scope="${sceneId ? 'scene' : 'domain'}"]`)?.focus({preventScroll: true});
    });
    root.addEventListener('change', event => {
      const scope = event.target.dataset.radialScope;
      if (!scope) return;
      if (scope === 'domain') {
        domainId = event.target.value;
        sceneId = '';
      } else {
        sceneId = event.target.value;
      }
      render();
      root.querySelector(`[data-radial-scope="${scope}"]`)?.focus({preventScroll: true});
    });
    for (const event of ['pointerover', 'focusin']) {
      root.addEventListener(event, e => {
        const sector = e.target.closest('.radial-segment');
        if (sector && !sector.contains(e.relatedTarget)) showSectorLabel(sector, e);
        const photo = e.target.closest('[data-radial-photo]');
        if (photo && !photo.contains(e.relatedTarget)) showPhoto(photo);
      });
    }
    for (const event of ['pointerout', 'focusout']) {
      root.addEventListener(event, e => {
        const sector = e.target.closest('.radial-segment');
        if (sector && !sector.contains(e.relatedTarget)) showSectorLabel(null);
        const photo = e.target.closest('[data-radial-photo]');
        if (photo && !photo.contains(e.relatedTarget)) showPhoto(null);
      });
    }

    return function (domains) {
      data = domains.map(domain => ({
        ...domain,
        scenes: domain.scenes.map(scene => ({
          ...scene, photos: scene.records.flatMap(record => record.photos.map(file => ({record, file})))
        }))
      }));
      render();
    };
  };
})();
