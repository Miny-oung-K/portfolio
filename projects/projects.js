import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
  try {
    const dataURL = new URL('../lib/projects.json', import.meta.url).toString();
    const projects = await fetchJSON(dataURL);

    const container = document.querySelector('.projects');
    if (!container) return;

    // Pass dataURL so images resolve correctly
    renderProjects(projects, container, 'h2', dataURL);

    const titleEl = document.querySelector('.projects-title');
    if (titleEl) titleEl.textContent = `${projects?.length || 0} Projects`;
  } catch (err) {
    console.error('Failed to load projects:', err);
    const container = document.querySelector('.projects');
    if (container) container.innerHTML = '<p>Could not load projects.</p>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProjects);
} else {
  loadProjects();
}