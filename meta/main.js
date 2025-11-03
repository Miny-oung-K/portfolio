import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function processCommits(data) {
  const REPO = 'https://github.com/Miny-oung-K/portfolio/commit/';

  return d3
    .groups(data, (d) => d.commit)
    .map(([commitId, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;

      const commitObj = {
        id: commitId,
        url: REPO + commitId,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(commitObj, 'lines', {
        value: lines,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      return commitObj;
    });
}

const data = await loadData();
const commits = processCommits(data);

console.log('Commit objects:', commits);

const stats = document.getElementById('stats');
if (stats) {
  const uniqueAuthors = new Set(commits.map((c) => c.author));
  const totalLines = d3.sum(commits, (c) => c.totalLines);
  stats.innerHTML = `
    <h2>Repo Stats</h2>
    <p><strong>Commits:</strong> ${commits.length}</p>
    <p><strong>Authors:</strong> ${uniqueAuthors.size}</p>
    <p><strong>Lines touched:</strong> ${totalLines.toLocaleString()}</p>
  `;
}
