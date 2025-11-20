import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


async function loadData() {
  const rows = await d3.csv('./loc.csv', (row) => ({
    ...row,
    file: row.file || row.path || row.filepath,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + (row.timezone ?? '')),
    datetime: new Date(row.datetime ?? (row.date + 'T12:00' + (row.timezone ?? ''))),
    author: row.author,
    commit: row.commit
  }));
  return rows.filter(d => d.file && Number.isFinite(d.line));
}

function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    const { author, date, datetime } = first;
    const ret = {
      id: commit,
      url: 'https://github.com/<YOUR-REPO>/commit/' + commit, // optional
      author,
      date,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length
    };
    Object.defineProperty(ret, 'lines', { value: lines, enumerable: false, writable: false });
    return ret;
  });
}

function computeSummary(data) {
  const commits = processCommits(data).length;
  const filesSet = new Set(data.map(d => d.file));
  const files = filesSet.size;
  const totalLOC = data.length;

  const maxDepth = d3.max(data, d => d.depth) ?? 0;
  const longestLine = d3.max(data, d => d.length) ?? 0;

  const linesPerFile = d3.rollup(
    data,
    v => d3.max(v, d => d.line),
    d => d.file
  );
  const maxLines = d3.max(linesPerFile.values()) ?? 0;

  return { commits, files, totalLOC, maxDepth, longestLine, maxLines };
}

function renderSummary(stats) {
  const fmt = d3.format(',');

  document.getElementById('sum-commits').textContent   = fmt(stats.commits);
  document.getElementById('sum-files').textContent     = fmt(stats.files);
  document.getElementById('sum-loc').textContent       = fmt(stats.totalLOC);
  document.getElementById('sum-depth').textContent     = fmt(stats.maxDepth);
  document.getElementById('sum-longest').textContent   = fmt(stats.longestLine);
  document.getElementById('sum-maxlines').textContent  = fmt(stats.maxLines);
}

(async function init() {
  const data = await loadData();
  const stats = computeSummary(data);
  renderSummary(stats);
})();

function renderTooltipContent(commit) {
  if (!commit || Object.keys(commit).length === 0) return;

  const time = document.getElementById('commit-time');

  link.href = commit.url || '#';
  link.textContent = commit.id || '(unknown)';

  // Date & time display
  if (commit.datetime instanceof Date && !isNaN(commit.datetime)) {
    date.textContent = commit.datetime.toLocaleString('en', { dateStyle: 'full' });
    time.textContent = commit.datetime.toLocaleString('en', {
      timeStyle: 'short'
    });
  } else {
    date.textContent = '';
    time.textContent = '';
  }

  author.textContent = commit.author ?? '';
  lines.textContent = commit.totalLines ?? '';
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  const OFFSET_X = 14;
  const OFFSET_Y = 14;
  tooltip.style.left = `${event.clientX + OFFSET_X}px`;
  tooltip.style.top  = `${event.clientY + OFFSET_Y}px`;
}

let xScaleGlobal, yScaleGlobal;

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScaleGlobal(commit.datetime);
  const y = yScaleGlobal(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection, commits) {
  const selected = selection ? commits.filter(d => isCommitSelected(selection, d)) : [];
  const el = document.getElementById('selection-count');
  if (el) el.textContent = `${selected.length || 'No'} commits selected`;
  return selected;
}

function renderLanguageBreakdown(selection, commits) {
  const container = document.getElementById('language-breakdown');
  if (!container) return;

  const selected = selection ? commits.filter(d => isCommitSelected(selection, d)) : [];
  if (selected.length === 0) {
    container.innerHTML = '';
    return;
  }
  const lines = selected.flatMap(d => d.lines ?? []);

  const breakdown = d3.rollup(
    lines,
    v => v.length,
    d => d.type
  );

  container.innerHTML = '';
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const pct = d3.format('.1~%')(proportion);
    container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${pct})</dd>`;
  }
}

function createBrushSelector(svg, commits) {
  const brush = d3.brush()
    .on('start brush end', (event) => {
      const selection = event.selection;
      d3.select(svg.node())
        .selectAll('circle')
        .classed('selected', d => isCommitSelected(selection, d));

      renderSelectionCount(selection, commits);
      renderLanguageBreakdown(selection, commits);
    });

  svg.call(brush);

  svg.selectAll('.dots, .overlay ~ *').raise();
}

export function renderScatterPlot(data, commits) {
  const width = 1000, height = 600;
  const svg = d3.select('#chart').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, width])
    .nice();
  const yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usable = {
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };
  xScale.range([usable.left, usable.right]);
  yScale.range([usable.bottom, usable.top]);

  xScaleGlobal = xScale;
  yScaleGlobal = yScale;

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usable.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usable.width));

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('transform', `translate(0, ${usable.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${usable.left}, 0)`)
    .call(yAxis);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([Math.max(1, minLines || 1), Math.max(1, maxLines || 1)])
    .range([3, 28]);

  const sorted = d3.sort(commits, d => -d.totalLines);

  // Dots
  const dots = svg.append('g').attr('class', 'dots');
  dots.selectAll('circle')
    .data(sorted, d => d.id) 
    .join('circle')
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => rScale(d.totalLines))
      .attr('fill', 'steelblue')
      .style('fill-opacity', 0.7)
      .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1);
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
      })
      .on('mousemove', (event) => {
        updateTooltipPosition(event);
      })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipVisibility(false);
      });

  createBrushSelector(svg, commits);
}

const data = await loadData();
const commits = processCommits(data);
renderScatterPlot(data, commits);

// ============ Step 1.1: Slider + time display ============

// start at 100% (show all time)
let commitProgress = 100;

// map 0–100 -> actual datetime range from commits
let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, d => d.datetime),
    d3.max(commits, d => d.datetime),
  ])
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

function onTimeSliderChange() {
  const slider = document.querySelector('#commit-progress');
  const timeEl = document.querySelector('#commit-time');
  if (!slider || !timeEl) return;

  // 1. update commitProgress
  commitProgress = +slider.value;

  // 2. convert 0–100 -> Date
  commitMaxTime = timeScale.invert(commitProgress);

  // 3. update the <time> element
  timeEl.textContent = commitMaxTime.toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

// attach listeners & initialize
const timeSlider = document.querySelector('#commit-progress');
if (timeSlider) {
  timeSlider.addEventListener('input', onTimeSliderChange);
  timeSlider.addEventListener('change', onTimeSliderChange);
  onTimeSliderChange();  // set initial text
}

