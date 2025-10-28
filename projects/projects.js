import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

let allProjects = [];
let query = '';
let selectedYear = null;

const sel = {
  listContainer: () => document.querySelector('.projects'),
  title:         () => document.querySelector('.projects-title'),
  svg:           () => d3.select('#projects-pie-plot'),
  legend:        () => d3.select('.legend'),
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

  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  const visible = getFiltered();
  if (!visible.length) return;

  const rolled = d3
    .rollups(visible, v => v.length, d => String(d.year))
    .sort((a, b) => d3.ascending(a[0], b[0]));
  const pieData = rolled.map(([year, count]) => ({ label: year, value: count }));

  const slice = d3.pie().value(d => d.value)(pieData);
  const arc   = d3.arc().innerRadius(0).outerRadius(50);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  svg
    .selectAll('path')
    .data(slice)
    .join('path')
    .attr('d', arc)
    .attr('fill', (_d, i) => colors(i))
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .attr('class', (d, i) =>
      selectedYear && pieData[i].label === String(selectedYear) ? 'selected' : null
    )
    .on('click', (_evt, d) => {
      const year = d.data.label;
      selectedYear = selectedYear === year ? null : year; // toggle
      renderAll();
    });

  legend
    .selectAll('li')
    .data(pieData)
    .join('li')
    .attr('style', (_d, i) => `--color:${colors(i)}`)
    .attr('class', d =>
      selectedYear && d.label === String(selectedYear) ? 'selected' : null
    )
    .style('cursor', 'pointer')
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
    .on('click', (_evt, d) => {
      const year = d.label;
      selectedYear = selectedYear === year ? null : year; // toggle
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
