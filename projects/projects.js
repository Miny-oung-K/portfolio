import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

let allProjects = [];
let query = '';

async function loadProjects() {
  try {
    const dataURL = new URL('../lib/projects.json', import.meta.url).toString();
    allProjects = await fetchJSON(dataURL);

    // Initial render
    renderProjects(allProjects, document.querySelector('.projects'), 'h2', dataURL);
    updateTitle(allProjects);
    renderPieChart(allProjects);

    // Activate search
    setupSearch();
  } catch (err) {
    console.error('Failed to load projects:', err);
    document.querySelector('.projects').innerHTML = '<p>Could not load projects.</p>';
  }
}

function updateTitle(projects) {
  const titleEl = document.querySelector('.projects-title');
  if (titleEl) titleEl.textContent = `${projects.length} Projects`;
}

/* === PIE CHART FUNCTION === */
function renderPieChart(projects) {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');
  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  if (!projects.length) return;

  // Group projects by year
  const rolled = d3.rollups(
    projects,
    v => v.length,
    d => d.year ?? 'Unknown'
  );

  const data = rolled.map(([year, count]) => ({ label: year, value: count }));

  const arcGen = d3.arc().innerRadius(0).outerRadius(50);
  const pieGen = d3.pie().value(d => d.value);
  const color = d3.scaleOrdinal(d3.schemeTableau10);
  const arcs = pieGen(data);

  svg
    .selectAll('path')
    .data(arcs)
    .join('path')
    .attr('d', arcGen)
    .attr('fill', (_, i) => color(i))
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5);

  // Build legend
  data.forEach((d, i) => {
    legend
      .append('li')
      .attr('style', `--color:${color(i)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

/* === SEARCH FUNCTIONALITY === */
function setupSearch() {
  const input = document.querySelector('.searchBar');
  const container = document.querySelector('.projects');

  input.addEventListener('input', e => {
    query = e.target.value.toLowerCase();

    const filtered = allProjects.filter(proj => {
      const values = Object.values(proj).join('\n').toLowerCase();
      return values.includes(query);
    });

    renderProjects(filtered, container, 'h2');
    updateTitle(filtered);
    renderPieChart(filtered);
  });
}

/* === INITIALIZE === */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProjects);
} else {
  loadProjects();
}
