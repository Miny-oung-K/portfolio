import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

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
  const commits = d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    const { author, date, datetime } = first;
    const ret = {
      id: commit,
      url: 'https://github.com/portfolio/commit/' + commit,
      author,
      date,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length
    };
    Object.defineProperty(ret, 'lines', { value: lines, enumerable: false, writable: false });
    return ret;
  });
  commits.sort((a, b) => a.datetime - b.datetime);
  return commits;
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

function renderTooltipContent(commit) {
  if (!commit || Object.keys(commit).length === 0) return;

  const link = document.getElementById('commit-link');
  const dateEl = document.getElementById('commit-date');
  const timeEl = document.getElementById('commit-time-tooltip'); // tooltip time
  const authorEl = document.getElementById('commit-author');
  const linesEl = document.getElementById('commit-lines');

  link.href = commit.url || '#';
  link.textContent = commit.id || '(unknown)';

  if (commit.datetime instanceof Date && !isNaN(commit.datetime)) {
    dateEl.textContent = commit.datetime.toLocaleString('en', { dateStyle: 'full' });
    timeEl.textContent = commit.datetime.toLocaleString('en', { timeStyle: 'short' });
  } else {
    dateEl.textContent = '';
    timeEl.textContent = '';
  }

  authorEl.textContent = commit.author ?? '';
  linesEl.textContent = commit.totalLines ?? '';
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

// Global scales so updateScatterPlot can reuse them
let xScale;
let yScale;

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
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

  // set the global scales
  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, width])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height, 0]);

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

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usable.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usable.width));

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('transform', `translate(0, ${usable.bottom})`)
    .attr('class', 'x-axis')
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${usable.left}, 0)`)
    .attr('class', 'y-axis')
    .call(yAxis);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([Math.max(1, minLines || 1), Math.max(1, maxLines || 1)])
    .range([3, 28]);

  const sorted = d3.sort(commits, d => -d.totalLines);

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

function updateScatterPlot(data, commits) {
  if (!commits || commits.length === 0) {
    return;
  }

  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usable = {
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  // update x-scale domain
  xScale.domain(d3.extent(commits, d => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([Math.max(1, minLines || 1), Math.max(1, maxLines || 1)])
    .range([3, 28]);

  const xAxis = d3.axisBottom(xScale);

  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commits, d => -d.totalLines);

  dots
    .selectAll('circle')
    .data(sortedCommits, d => d.id) 
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
}

function updateFileDisplay(filteredCommits) {
  // 1. All lines from visible commits
  const lines = filteredCommits.flatMap(d => d.lines ?? []);

  // 2. Group by file, then sort by line count DESC
  const files = d3
    .groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);  // 🔥 sort largest file first

  // 3. Color scale mapping technology → color
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // 4. Bind files to <dl id="files">
  const filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(
      enter =>
        enter.append('div').call(div => {
          div.append('dt');
          div.append('dd');
        })
    );

  // 5. Write filename + line count
  filesContainer
    .select('dt')
    .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);

  // 6. Create one dot per line with per-line COLOR via CSS variable
  filesContainer
    .select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', d => `--color: ${colors(d.type)}`);  // 🔥 important
}




// ---------- Main entry point: load data & set up slider ----------

(async function main() {
  const data = await loadData();
  const commits = processCommits(data);
  const stats = computeSummary(data);
  renderSummary(stats);
  renderScatterPlot(data, commits);

  // ---------- Slider + filtering state ----------
  let commitProgress = 100;

  const timeScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, 100]);

  let commitMaxTime = timeScale.invert(commitProgress);
  let filteredCommits = commits;

  function onTimeSliderChange() {
    const slider = document.querySelector('#commit-progress');
    const timeEl = document.querySelector('#commit-time');
    if (!slider || !timeEl) return;

    commitProgress = +slider.value;
    commitMaxTime = timeScale.invert(commitProgress);

    timeEl.textContent = commitMaxTime.toLocaleString(undefined, {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

    updateScatterPlot(data, filteredCommits);
    updateFileDisplay(filteredCommits);
  }

  const timeSlider = document.querySelector('#commit-progress');
  if (timeSlider) {
    timeSlider.addEventListener('input', onTimeSliderChange);
    timeSlider.addEventListener('change', onTimeSliderChange);
    onTimeSliderChange(); // initialize slider, plot, and file viz
  }

  // ---------- Scrollytelling: create .step blocks ----------
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => `
      <p>
        On ${d.datetime.toLocaleString('en', {
          dateStyle: 'full',
          timeStyle: 'short',
        })},
        I made
        <a href="${d.url}" target="_blank">
          ${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
        </a>.
      </p>
      <p>
        I edited ${d.totalLines} lines across ${
          d3.rollups(
            d.lines,
            D => D.length,
            dd => dd.file,
          ).length
        } files.
      </p>
      <p>Then I looked over all I had made, and I saw that it was very good.</p>
    `);

  // Optional: space steps out a bit using CSS instead
  // .step { padding-bottom: 60vh; }

  // ---------- Scrollama setup ----------
  function onStepEnter(response) {
    const commit = response.element.__data__;
    if (!commit) return;

    // 1. Set max time to this commit's datetime
    commitMaxTime = commit.datetime;

    // 2. Sync slider position to this commit
    commitProgress = timeScale(commitMaxTime);
    const slider = document.querySelector('#commit-progress');
    const timeEl = document.querySelector('#commit-time');
    if (slider) slider.value = commitProgress;
    if (timeEl) {
      timeEl.textContent = commitMaxTime.toLocaleString(undefined, {
        dateStyle: 'long',
        timeStyle: 'short',
      });
    }

    // 3. Filter commits up to this moment
    filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

    // 4. Update scatter plot and file unit viz
    updateScatterPlot(data, filteredCommits);
    updateFileDisplay(filteredCommits);
  }

  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
      // you can add offset: 0.5 if you want exact center trigger
    })
    .onStepEnter(onStepEnter);

  window.addEventListener('resize', scroller.resize);
})();