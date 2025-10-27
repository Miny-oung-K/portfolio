import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

let ALL_PROJECTS = [];
let QUERY = '';
let selectedIndex = -1; // -1 means “no wedge selected”

const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.pie-legend');
const container = document.querySelector('.projects');
const titleEl = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

// Color scale for wedges/legend
const colors = d3.scaleOrdinal(d3.schemeTableau10);

// ----- helpers -----

function projectsFilteredByQuery(projects) {
  if (!QUERY) return projects;
  const q = QUERY.toLowerCase();
  return projects.filter((p) =>
    Object.values(p).join('\n').toLowerCase().includes(q)
  );
}

function projectsFilteredBySelection(projects, dataForPie) {
  if (selectedIndex === -1) return projects;
  const chosen = dataForPie[selectedIndex];
  if (!chosen) return projects;
  const year = String(chosen.label);
  return projects.filter((p) => String(p.year) === year);
}

function renderPieChart(projects) {
  const rolled = d3.rollups(
    projects,
    (v) => v.length,
    (d) => String(d.year)
  );

  rolled.sort((a, b) => a[0].localeCompare(b[0]));

  const data = rolled.map(([year, count]) => ({ label: year, value: count }));

  const arcGen = d3.arc().innerRadius(0).outerRadius(50);
  const sliceGen = d3.pie().value((d) => d.value);
  const arcData = sliceGen(data);

  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  svg
    .selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arcGen)
    .attr('fill', (_d, i) => colors(i))
    .attr('data-index', (_d, i) => i)
    .attr('class', (_d, i) => (i === selectedIndex ? 'selected' : null))
    .on('click', (_event, _d, i) => {
      const idx = +d3.select(d3.event.currentTarget).attr('data-index');
      selectedIndex = selectedIndex === idx ? -1 : idx;
      updateSelection(data);
    });

  legend
    .selectAll('li')
    .data(data)
    .join('li')
    .attr('style', (_d, i) => `--color:${colors(i)}`)
    .attr('class', (_d, i) => (i === selectedIndex ? 'selected' : null))
    .attr('role', 'button')
    .attr('tabindex', 0)
    .html((d) => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
    .on('click', (_event, _d, i) => {
      selectedIndex = selectedIndex === i ? -1 : i;
      updateSelection(data);
    })
    .on('keydown', (event, _d, i) => {
      if (event.key === 'Enter' || event.key === ' ') {
        selectedIndex = selectedIndex === i ? -1 : i;
        updateSelection(data);
      }
    });

  updateSelection(data);
}

function updateSelection(dataForPie) {
  svg
    .selectAll('path')
    .attr('class', (_d, i) => (i === selectedIndex ? 'selected' : null));

  legend
    .selectAll('li')
    .attr('class', (_d, i) => (i === selectedIndex ? 'selected' : null));

  const viaQuery = projectsFilteredByQuery(ALL_PROJECTS);
  const finalList = projectsFilteredBySelection(viaQuery, dataForPie);

  renderProjects(finalList, container, 'h2');

  if (titleEl) {
    titleEl.textContent = `${finalList.length} Projects`;
  }
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    QUERY = e.target.value || '';
    const base = projectsFilteredByQuery(ALL_PROJECTS);
    renderPieChart(base);
  });
}

async function loadProjects() {
  const dataURL = new URL('../lib/projects.json', import.meta.url).toString();
  const projects = await fetchJSON(dataURL);

  const yr = new Date().getFullYear();
  ALL_PROJECTS = (projects || []).map((p) => ({
    ...p,
    year: p.year ?? yr
  }));

  QUERY = '';
  selectedIndex = -1;

  renderPieChart(ALL_PROJECTS);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProjects);
} else {
  loadProjects();
}
