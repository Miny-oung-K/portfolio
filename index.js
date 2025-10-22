import { fetchJSON, renderProjects } from './global.js';

async function loadLatestProjects() {
  try {
    // Load project data from lib/projects.json
    const dataURL = new URL('./lib/projects.json', import.meta.url).toString();
    const projects = await fetchJSON(dataURL);

    // Keep only the first 3 projects
    const latestProjects = projects.slice(0, 3);

    // Find the .projects container on the home page
    const container = document.querySelector('.projects');
    if (!container) {
      console.error('Missing .projects container on the home page.');
      return;
    }

    // Render them dynamically
    renderProjects(latestProjects, container, 'h2');

    // Update the title if needed (optional)
    const titleEl = document.querySelector('.projects-title');
    if (titleEl) titleEl.textContent = `${latestProjects.length} Projects`;

  } catch (error) {
    console.error('Error loading latest projects:', error);
    const container = document.querySelector('.projects');
    if (container)
      container.innerHTML = '<p>Could not load latest projects.</p>';
  }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadLatestProjects);
} else {
  loadLatestProjects();
}