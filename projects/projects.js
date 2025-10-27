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
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // Example data with labels
  const data = [
    { value: 1, label: 'Apples' },
    { value: 2, label: 'Oranges' },
    { value: 3, label: 'Mangos' },
    { value: 4, label: 'Pears' },
    { value: 5, label: 'Limes' },
    { value: 5, label: 'Cherries' },
  ];

  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const sliceGenerator = d3.pie().value((d) => d.value);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const arcs = sliceGenerator(data);

  svg
    .selectAll('path')
    .data(arcs)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (_d, i) => colors(i))
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5);

  // === Build Legend ===
  const legend = d3.select('.legend');
  legend.selectAll('*').remove(); // clear old entries

  data.forEach((d, i) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(i)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });

  console.log('✅ Pie chart + legend rendered');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProjects);
} else {
  loadProjects();
}
