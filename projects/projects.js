import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

let allProjects = [];
let query = '';
let selectedYear = null;

const sel = {
  listContainer: () => document.querySelector('.projects'),
  title:         () => document.querySelector('.projects-title'),
  svg:           () => d3.select('#projects-pie-plot'),
  legend:        () => d3.select('.pie-legend'),   // <-- FIXED: match your HTML/CSS
  search:        () => document.querySelector('.searchBar'),
};

function getFiltered() {
  let rows = allProjects;

  if (query.trim()) {
    const q = query.toLowerCase();
    rows = rows.filter(p =>
      Object.values(p).join('\n').toLowerCase().includes(q)
    );
  }

  if (selectedYear) {
    rows = rows.filter(p => String(p.year) === String(selectedYear));
  }

  return rows;
}

function renderList() {
  const data = getFiltered();
  const container = sel.listContainer();
  if (!container) return;

  renderProjects(data, container, 'h2', document.baseURI);

  const titleEl = sel.title();
  if (titleEl) titleEl.textContent = `${data.length} Projects`;
}

function renderPie() {
  const svg = sel.svg();
  const legend = sel.legend();
  if (svg.empty()) return;

  // clear previous drawing
  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  const visible = getFiltered();
  if (!visible.length) return;

  const rolled = d3
    .rollups(visible, v => v.length, d => String(d.year))
    .sort((a, b) => d3.ascending(+a[0], +b[0]));

  const pieData = rolled.map(([year, count]) => ({ label: year, value: count }));

  const allYears = Array.from(new Set(allProjects.map(p => +p.year)));
  const minYear = d3.min(allYears);
  const maxYear = d3.max(allYears);
  const pink = d3.scaleSequential()
    .domain([minYear, maxYear])
    .interpolator(d3.interpolateRgb('#ffd6e8', '#b30059'));

  const sliceGenerator = d3.pie().value(d => d.value);
  const arcs = sliceGenerator(pieData);
  const arc = d3.arc().innerRadius(0).outerRadius(50);
  const labelArc = d3.arc().innerRadius(28).outerRadius(50);

  svg
    .selectAll('path')
    .data(arcs, d => d.data.label)
    .join('path')
    .attr('d', arc)
    .attr('fill', d => pink(+d.data.label))
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .attr('class', d =>
      selectedYear && d.data.label === String(selectedYear) ? 'selected' : null
    )
    .on('click', (_evt, d) => {
      const year = d.data.label;
      selectedYear = selectedYear === year ? null : year;
      renderAll();
    });


  legend
    .selectAll('li')
    .data(pieData, d => d.label)
    .join('li')
    .attr('style', d => `--color:${pink(+d.label)}`)
    .attr('class', d =>
      selectedYear && d.label === String(selectedYear) ? 'selected' : null
    )
    .style('cursor', 'pointer')
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
    .on('click', (_evt, d) => {
      const year = d.label;
      selectedYear = selectedYear === year ? null : year;
      renderAll();
    });
}

function renderAll() {
  renderList();
  renderPie();
}

async function init() {
  const dataURL = new URL('../lib/projects.json', import.meta.url);
  allProjects = await fetchJSON(dataURL);
  if (!Array.isArray(allProjects)) allProjects = [];

  const input = sel.search();
  if (input) {
    input.addEventListener('input', e => {
      query = e.target.value || '';
      renderAll();
    });
  }

  renderAll();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();