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
