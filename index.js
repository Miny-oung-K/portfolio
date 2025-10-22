import { fetchJSON, renderProjects } from './global.js';

async function loadLatestProjects() {
  try {
    const dataURL = new URL('./lib/projects.json', import.meta.url).toString();

    const projects = await fetchJSON(dataURL);

    const latestProjects = projects.slice(0, 3);

    const container = document.querySelector('.projects');
    if (!container) {
      console.error('Missing .projects container on the home page.');
      return;
    }

    renderProjects(latestProjects, container, 'h2', dataURL);

    const titleEl = document.querySelector('.projects-title');
    if (titleEl) titleEl.textContent = `${latestProjects.length} Projects`;

  } catch (error) {
    console.error('Error loading latest projects:', error);
    const container = document.querySelector('.projects');
    if (container) {
      container.innerHTML = '<p>Could not load latest projects.</p>';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadLatestProjects);
} else {
  loadLatestProjects();
}
