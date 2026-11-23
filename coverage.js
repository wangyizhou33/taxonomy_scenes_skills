(function () {
  'use strict';

  // Source volumes are stored in hundredths and scaled by 20 before aggregation.
  // A path records the deepest ideal node supported by the source category.
  const sources = [
    { zh: '工业制造', en: 'Industrial manufacturing', raw: 224013, path: ['D03'] },
    { zh: '商业零售', en: 'Commercial retail', raw: 58907, path: ['D08'] },
    { zh: '居家服务', en: 'Home services', raw: 52892, path: ['D11'] },
    { zh: '空间步态', en: 'Spatial gait', raw: 31513, path: [], skill: 'locomotion' },
    { zh: '手工艺制作', en: 'Handicraft production', raw: 25254, path: ['D18'], provisional: true },
    { zh: '生活服务', en: 'Daily living services', raw: 18303, path: ['D19'], provisional: true },
    { zh: '仓储物流', en: 'Warehousing and logistics', raw: 15561, path: ['D07'] },
    { zh: '酒店文旅', en: 'Hospitality and cultural tourism', raw: 13970, path: ['D10'] },
    { zh: '办公场景', en: 'Office settings', raw: 12835, path: ['D14'] },
    { zh: '农业生产', en: 'Agricultural production', raw: 10835, path: ['D01'] },
    { zh: '教育培训', en: 'Education and training', raw: 7785, path: ['D13'] },
    { zh: '餐饮服务', en: 'Food service', raw: 6550, path: ['D09'] },
    { zh: '其他', en: 'Other', raw: 5936, path: [] },
    { zh: '公共与城市服务', en: 'Public and urban services', raw: 1, path: ['D16'], provisional: true }
  ].map(row => ({ ...row, amount: row.raw * 20 }));

  const totalAmount = sources.reduce((sum, row) => sum + row.amount, 0);
  const mappedAmount = sources.reduce((sum, row) => sum + (row.path.length ? row.amount : 0), 0);
  const palette = ['#9be7c1', '#ad98ff', '#78bcf0', '#eeb977', '#e68baa', '#65ceca', '#888fe9',
    '#d7a3e7', '#abd781', '#e9917c', '#80bacf', '#cfc37b', '#a9afc3', '#e0b9a2', '#779adf', '#75c9ae', '#edac9a', '#cb8fdc', '#c9d697', '#b8a4d5'];
  const unresolvedColor = '#75788c';

  window.createAtlasCoverage = function (root, idealTaxonomy, tr, name, safe) {
    let layer = 1;
    let scope = [];
    let mode = 'actual';
    let selected = null;
    let displayed = [];
    let displayedTotal = 0;
    const index = new Map();

    function addNodes(nodes) {
      for (const node of nodes) {
        index.set(node.id, node);
        addNodes(node.children);
      }
    }
    addNodes(idealTaxonomy);

    const layerNames = () => [
      tr('Domain', '领域'), tr('Scene', '场景'), tr('Workflow', '流程'), tr('Task', '任务')
    ];
    const numbers = [0, 2].map(precision => new Intl.NumberFormat('en-US', {
      minimumFractionDigits: precision, maximumFractionDigits: precision
    }));
    const format = value => numbers[0].format(value);
    const decimal = value => numbers[1].format(value);
    const volume = amount => decimal(amount / 100);
    const percent = (value, total) => `${decimal(total ? value / total * 100 : 0)}%`;
    const sourceName = row => tr(row.en, row.zh);
    const nodeName = id => name(index.get(id));
    const inScope = row => scope.every((id, i) => row.path[i] === id);

    function actualSlices() {
      const grouped = new Map();
      for (const row of sources.filter(inScope)) {
        const nodeId = row.path[scope.length];
        const id = nodeId || (row.skill ? 'skill' : row.path.length ? 'unresolved' : 'other');
        if (!grouped.has(id)) grouped.set(id, { id, nodeId, amount: 0, rows: [] });
        const item = grouped.get(id);
        item.amount += row.amount;
        item.rows.push(row);
      }
      return [...grouped.values()].map(item => ({
        ...item,
        unresolved: !item.rows.some(row => row.path.length >= layer),
        label: item.nodeId ? nodeName(item.nodeId) : {
          skill: tr('Cross-domain skill', '跨领域技能'),
          other: tr('Unmapped', '未映射'),
          unresolved: tr('Undistributed at this layer', '尚未细分到本层')
        }[item.id]
      }));
    }

    function idealSlices() {
      const children = scope.length ? index.get(scope.at(-1)).children : idealTaxonomy;
      function countAtDepth(node, remaining) {
        if (remaining === 0) return 1;
        return node.children.reduce((sum, child) => sum + countAtDepth(child, remaining - 1), 0);
      }
      return children.map(node => ({
        id: node.id, nodeId: node.id, label: name(node), amount: countAtDepth(node, layer - scope.length - 1)
      })).filter(item => item.amount);
    }

    function reportMapping(row) {
      if (row.skill) return tr('Skill ontology · Locomotion & posture', '技能本体 · 移动与姿态');
      if (!row.path.length) return tr('Unmapped', '未映射');
      return row.path.map(nodeName).join(' / ');
    }

    function reportNote(row) {
      if (row.skill) return tr('The source gives no domain breakdown.', '来源数据没有提供所属领域的拆分。');
      if (!row.path.length) return tr('The source combines unspecified categories.', '来源汇总了未注明的类别。');
      if (row.provisional) {
        return {
          D18: tr('Provisional. Craft can also occur in manufacturing.', '暂按艺术工艺归类，也可能包含制造作坊。'),
          D19: tr('Provisional. The scope of daily living services is unspecified.', '暂归个人服务，生活服务的具体范围待确认。'),
          D16: tr('Provisional. Public services may span other domains.', '暂归城市服务，公共服务也可能涉及其他领域。')
        }[row.path[0]];
      }
      return tr('Mapped at L1.', '映射至 L1。');
    }

    function renderMapping() {
      return `<details class="coverage-panel mapping-panel">
        <summary>${tr('Source-to-taxonomy mapping', '真实分类与理想分类的映射')}</summary>
        <p class="coverage-copy">${tr('Each source volume is multiplied by 20. Shares use the full dataset.', '来源数据量统一乘以 20，占比按全量数据计算。')}</p>
        <div class="mapping-table-wrap" tabindex="0" role="region" aria-label="${tr('Coverage mapping table', '覆盖映射表')}"><table class="mapping-table">
          <thead><tr>${[tr('Source category', '真实分类'), tr('Scaled volume', '折算数据量'), tr('Share', '占比'),
            tr('Ideal taxonomy', '理想分类'), tr('Mapping notes', '映射说明')].map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead>
          <tbody>${sources.map(row => `<tr><th scope="row">${sourceName(row)}</th><td>${volume(row.amount)}</td>
            <td>${percent(row.amount, totalAmount)}</td><td>${safe(reportMapping(row))}</td><td>${reportNote(row)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><th scope="row">${tr('Total', '合计')}</th><td>${volume(totalAmount)}</td><td>100.00%</td><td colspan="2"></td></tr></tfoot>
        </table></div>
      </details>`;
    }

    function render() {
      const actual = mode === 'actual';
      const names = layerNames();
      displayed = (actual ? actualSlices() : idealSlices()).sort((a, b) => b.amount - a.amount);
      displayedTotal = displayed.reduce((sum, item) => sum + item.amount, 0);
      const current = displayed.find(item => item.id === selected);
      let end = 0;
      const stops = displayed.map((item, i) => {
        item.color = item.nodeId ? palette[(scope.length ? i : Number(item.nodeId.slice(1, 3)) - 1) % palette.length]
          : item.id === 'skill' ? '#837caa' : unresolvedColor;
        const start = end;
        end += item.amount / displayedTotal * 100;
        const color = current && current !== item ? `color-mix(in srgb, ${item.color} 48%, var(--surface))` : item.color;
        return `${color} ${start}% ${end}%`;
      });
      const canDrill = current?.nodeId && scope.length < 3 && (layer < 4 || !actual);
      const number = actual ? volume : format;
      const chartCaption = actual && layer > 1
        ? tr('The source totals are aggregated at L1. Slices show the known domain, or a volume pending allocation. Switch to Ideal taxonomy to see the finer structure.',
          '来源汇总到 L1。扇区显示已知领域或待分配的数据量。切换到「理想分类」可查看更细的分类结构。')
        : actual
          ? tr('Scaled data volume by mapped domain. Select a slice to inspect its source and open the next layer.', '按映射领域查看折算数据量。点击扇区可查看来源，并打开下一层。')
          : tr('Slice size reflects the number of nodes at the selected layer in the Atlas seed taxonomy.', '扇区大小表示 Atlas 初始分类在所选层级的节点数。');
      const mappingOpen = root.querySelector('.mapping-panel')?.open;
      root.innerHTML = `
        <div class="coverage-report-totals metric-strip">
          ${[
            [tr('Total data volume', '总数据量'), volume(totalAmount), tr('Source volume × 20', '来源数据量 × 20')],
            [tr('Mapped to an L1 domain', '已映射至 L1 领域'), volume(mappedAmount), percent(mappedAmount, totalAmount)],
            [tr('Awaiting domain mapping', '待映射领域'), volume(totalAmount - mappedAmount), percent(totalAmount - mappedAmount, totalAmount)]
          ].map(([label, value, sub]) => `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-sub">${sub}</div></div>`).join('')}
        </div>
        <section class="coverage-panel coverage-pie-panel" aria-labelledby="coverage-pie-title">
          <div class="panel-title-row">
            <div><h2 id="coverage-pie-title">${tr('Coverage by layer', '按层级查看覆盖')}</h2><p>${chartCaption}</p></div>
            <div class="layout-toggle" role="group" aria-label="${tr('Chart measure', '统计口径')}">
              <button type="button" data-report-mode="actual" aria-pressed="${actual}">${tr('Actual volume', '真实数据量')}</button>
              <button type="button" data-report-mode="ideal" aria-pressed="${!actual}">${tr('Ideal taxonomy', '理想分类')}</button>
            </div>
          </div>
          <div class="coverage-pie-controls">
            <div class="coverage-layers layout-toggle" role="group" aria-label="${tr('Taxonomy layer', '分类层级')}">
              ${names.map((label, i) => `<button type="button" data-report-layer="${i + 1}" aria-pressed="${layer === i + 1}">L${i + 1} · ${label}</button>`).join('')}
            </div>
            ${scope.length ? `<div class="coverage-scope">
              <button type="button" class="text-btn" data-report-scope="${scope.length - 1}">${tr('Back', '返回')}</button>
              ${[tr('All domains', '全部领域'), ...scope.map(nodeName)].map(safe).join(' / ')}
              </div>` : ''}
          </div>
          <div class="coverage-pie-layout">
            <div class="coverage-pie-graphic">
              <div class="coverage-pie" aria-hidden="true" style="--pie-fill:${stops.length ? `conic-gradient(${stops.join(',')})` : 'var(--border)'}">
                <div class="coverage-pie-center"><strong>${number(current?.amount ?? displayedTotal)}</strong>
                  <span>${current ? percent(current.amount, displayedTotal) : actual ? tr('Scaled volume', '折算数据量') : tr('Taxonomy nodes', '分类节点')}</span>
                </div>
              </div>
              <div class="coverage-pie-selection" aria-live="polite">
                ${current ? `<strong>${safe(current.label)}</strong>
                  ${actual ? `<p>${tr('Source', '来源')} · ${current.rows.map(sourceName).join(' / ')}</p>` : ''}
                  ${current.unresolved ? `<p>${tr('No source volume was allocated at this layer.', '来源数据尚未分配到此层。')}</p>` : ''}
                  ${canDrill
                    ? `<button type="button" class="action-btn secondary" data-report-drill>${tr('Open next level', '查看下一级')}</button>` : ''}
                  ${actual && current.nodeId && current.unresolved
                    ? `<button type="button" class="text-btn" data-report-mode="ideal" data-report-branch>${tr('View ideal structure', '查看理想结构')}</button>` : ''}` :
                  `<p>${tr('Choose a slice or category to see details.', '选择扇区或分类查看详情。')}</p>`}
              </div>
            </div>
            <div class="coverage-pie-legend">
              <div class="coverage-legend-heading"><span>${tr('Category', '分类')}</span><span>${actual ? tr('Volume', '数据量') : tr('Nodes', '节点数')}</span><span>${tr('Share', '占比')}</span></div>
              ${displayed.map((item, i) => `<button type="button" class="coverage-legend-row" data-report-item="${i}" aria-pressed="${selected === item.id}">
                <span><i style="--slice-color:${item.color}"></i><span>${safe(item.label)}
                  ${item.unresolved && item.nodeId ? `<small>${tr('Pending allocation at this layer', '待分配至本层')}</small>` : ''}</span></span>
                <span>${number(item.amount)}</span><span>${percent(item.amount, displayedTotal)}</span></button>`).join('')}
              ${displayed.length ? '' : `<p class="coverage-copy">${tr('No entries in this scope.', '此范围暂无条目。')}</p>`}
            </div>
          </div>
        </section>
        ${renderMapping()}`;
      root.querySelector('.mapping-panel').open = Boolean(mappingOpen);
    }

    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      let focus = '.coverage-legend-row[aria-pressed="true"]';
      if (button?.hasAttribute('data-report-mode')) {
        mode = button.dataset.reportMode;
        if (button.hasAttribute('data-report-branch') && displayed.find(item => item.id === selected)?.nodeId) {
          scope.push(selected);
          layer = Math.max(layer, scope.length + 1);
        }
        selected = null;
        focus = `.panel-title-row [data-report-mode="${mode}"]`;
      } else if (button?.hasAttribute('data-report-layer')) {
        layer = Number(button.dataset.reportLayer);
        scope = scope.slice(0, layer - 1);
        selected = null;
        focus = `[data-report-layer="${layer}"]`;
      } else if (button?.hasAttribute('data-report-scope')) {
        scope.pop();
        selected = null;
        focus = `[data-report-layer="${layer}"]`;
      } else if (button?.hasAttribute('data-report-drill')) {
        const item = displayed.find(item => item.id === selected);
        if (!item?.nodeId) return;
        scope.push(item.nodeId);
        layer = Math.max(layer, scope.length + 1);
        selected = null;
        focus = `[data-report-layer="${layer}"]`;
      } else if (button?.hasAttribute('data-report-item')) {
        const id = displayed[Number(button.dataset.reportItem)].id;
        selected = selected === id ? null : id;
        focus = `[data-report-item="${button.dataset.reportItem}"]`;
      } else {
        const pie = event.target.closest('.coverage-pie');
        if (!pie || !displayedTotal) return;
        const box = pie.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - .5;
        const y = (event.clientY - box.top) / box.height - .5;
        const radius = Math.hypot(x, y);
        if (radius > .5 || radius < .325) return;
        const offset = ((Math.atan2(x, -y) / (2 * Math.PI) + 1) % 1) * displayedTotal;
        let boundary = 0;
        const item = displayed.find(item => (boundary += item.amount) > offset);
        selected = selected === item?.id ? null : item?.id;
      }
      render();
      root.querySelector(focus)?.focus({ preventScroll: true });
    });

    return render;
  };
})();
