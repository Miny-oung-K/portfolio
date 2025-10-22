import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
  try {
    const dataURL = new URL('../lib/projects.json', import.meta.url).toString();
    console.log('Fetching projects from:', dataURL, 'page:', location.href);

    const projects = await fetchJSON(dataURL);
    console.log('Projects data:', projects);

    const container = document.querySelector('.projects');
    if (!container) {
      console.error('Missing .projects container on this page.');
      return;
    }

    renderProjects(projects, container, 'h2');

    const titleEl = document.querySelector('.projects-title');
    if (titleEl) titleEl.textContent = `Projects (${projects?.length || 0})`;

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