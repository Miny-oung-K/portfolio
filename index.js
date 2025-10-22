import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function loadLatestProjects() {
  try {
    const dataURL = new URL('./lib/projects.json', import.meta.url).toString();
    const projects = await fetchJSON(dataURL);
    const latestProjects = projects.slice(0, 3);

    const container = document.querySelector('.projects');
    if (!container) return;

    renderProjects(latestProjects, container, 'h2', dataURL);

    // Show "N Projects"
    const titleEl = document.querySelector('.projects-title');
    if (titleEl) titleEl.textContent = `${latestProjects.length} Projects`;
  } catch (error) {
    console.error('Error loading latest projects:', error);
    const container = document.querySelector('.projects');
    if (container) container.innerHTML = '<p>Could not load latest projects.</p>';
  }
}

async function loadGitHubStats() {
  try {
    const githubData = await fetchGitHubData('Miny-oung-K');

    const profileStats = document.querySelector('#profile-stats');
    if (!profileStats || !githubData) return;

    profileStats.innerHTML = `
      <dl class="gh-stats">
        <dt>Public Repos</dt><dd>${githubData.public_repos}</dd>
        <dt>Public Gists</dt><dd>${githubData.public_gists}</dd>
        <dt>Followers</dt><dd>${githubData.followers}</dd>
        <dt>Following</dt><dd>${githubData.following}</dd>
      </dl>
    `;
  } catch (err) {
    console.error('Error loading GitHub stats:', err);
    const profileStats = document.querySelector('#profile-stats');
    if (profileStats) profileStats.textContent = 'Could not load GitHub stats.';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadLatestProjects();
    loadGitHubStats();
  });
} else {
  loadLatestProjects();
  loadGitHubStats();
}
