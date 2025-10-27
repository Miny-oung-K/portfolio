import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
  try {
    const dataURL = new URL('../lib/projects.json', import.meta.url).toString();
    const projects = await fetchJSON(dataURL);

    const container = document.querySelector('.projects');
    if (!container) return;

    renderProjects(projects, container, 'h2', dataURL);

    const titleEl = document.querySelector('.projects-title');
    if (titleEl) titleEl.textContent = `${projects?.length || 0} Projects`;
  } catch (err) {
    console.error('Failed to load projects:', err);
    const container = document.querySelector('.projects');
    if (container) container.innerHTML = '<p>Could not load projects.</p>';
  }

  drawPie();
}

function drawPie() {
  const svg = d3.select('#projects-pie-plot');
  if (svg.empty()) {
    console.error('SVG with id="projects-pie-plot" not found.');
    return;
  }

  svg.selectAll('*').remove();

  const data = [1, 2, 3, 4, 5, 5];

  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const sliceGenerator = d3.pie();
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const arcData = sliceGenerator(data);

  svg
    .selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (_d, i) => colors(i))
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5);

  console.log('Pie chart drawn with', data.length, 'slices');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProjects);
} else {
  loadProjects();
}