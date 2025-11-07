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

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, width])
    .nice();

  const yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  svg
    .append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(commits)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', 4)
    .attr('fill', 'steelblue')
    .attr('opacity', 0.9);
}

const data = await loadData();
const commits = processCommits(data);
renderScatterPlot(data, commits);
