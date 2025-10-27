import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
  let projects = [];
  try {
    const dataURL = new URL('../lib/projects.json', import.meta.url).toString();
    projects = await fetchJSON(dataURL);

    const container = document.querySelector('.projects');
    if (container) renderProjects(projects, container, 'h2', dataURL);

    const titleEl = document.querySelector('.projects-title');
    if (titleEl) titleEl.textContent = `${projects?.length || 0} Projects`;
  } catch (err) {
    console.error('Failed to load projects:', err);
    const container = document.querySelector('.projects');
    if (container) container.innerHTML = '<p>Could not load projects.</p>';
  }

  drawPieFromProjects(projects);
}

function drawPieFromProjects(projects) {
  const svg = d3.select('#projects-pie-plot');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  const rolled = d3.rollups(
    projects,
    v => v.length,
    d => (d?.year ?? 'Unknown') + ''
  );

  rolled.sort((a, b) => {
    const aIsNum = /^\d+$/.test(a[0]);
    const bIsNum = /^\d+$/.test(b[0]);
    if (aIsNum && bIsNum) return Number(b[0]) - Number(a[0]);
    if (aIsNum) return -1;
    if (bIsNum) return 1;
    return a[0].localeCompare(b[0]);
  });

  const data = rolled.map(([year, count]) => ({ label: year, value: count }));

  const radius = 50;
  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  const pie = d3.pie().value(d => d.value);
  const arcs = pie(data);

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  svg
    .selectAll('path')
    .data(arcs)
    .join('path')
    .attr('d', arc)
    .attr('fill', (_d, i) => color(i))
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5);

  const legend = d3.select('.legend');
  legend.selectAll('*').remove();

  data.forEach((d, i) => {
    legend
      .append('li')
      .attr('style', `--color:${color(i)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });

  console.log('Pie by year rendered:', data);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProjects);
} else {
  loadProjects();
}
