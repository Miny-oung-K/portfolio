console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}


const pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "resume/", title: "Resume" },
  { url: "contact/", title: "Contact" },
  { url: "meta/",     title: "Meta" },
  { url: "https://github.com/Miny-oung-K", title: "GitHub" },
  { url: "https://www.linkedin.com/in/minyoung-kim-360189222/", title: "LinkedIn" },
];

const isLocal =
  location.hostname === "localhost" || location.hostname === "127.0.0.1";

let BASE_PATH = "/";
if (!isLocal && location.hostname.endsWith("github.io")) {
  const firstSegment = location.pathname.split("/").filter(Boolean)[0] || "";
  BASE_PATH = firstSegment ? `/${firstSegment}/` : "/";
}

const nav = document.createElement("nav");
document.body.prepend(nav);

for (const p of pages) {
  let url = p.url;

  if (!/^https?:\/\//i.test(url)) {
    url = BASE_PATH + url;
  }

  const a = document.createElement("a");
  a.href = url;
  a.textContent = p.title;

  const isExternal = a.host !== location.host;
  if (isExternal) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }

  // Highlight current page
  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  nav.append(a);
}


document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select id="color-scheme-select">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const select = document.getElementById("color-scheme-select");


function setColorScheme(value) {
  document.documentElement.style.setProperty("color-scheme", value);
}

const saved = localStorage.colorScheme;
const initial = saved ? saved : "light dark";
setColorScheme(initial);
select.value = initial;


select.addEventListener("input", (e) => {
  const value = e.target.value;
  setColorScheme(value);
  localStorage.colorScheme = value;
  console.log(`Color scheme changed to: ${value}`);
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    console.log(response); // check it in the dev console

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
    return [];
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2', baseUrl = document.baseURI) {
  containerElement.innerHTML = '';

  if (!projects || projects.length === 0) {
    containerElement.innerHTML = '<p>No projects found.</p>';
    return;
  }

  for (const project of projects) {
    // Resolve image URL
    let imgSrc = project.image || '../images/placeholder.png';
    if (!/^https?:\/\//i.test(imgSrc)) {
      try {
        imgSrc = new URL(imgSrc, baseUrl).toString();
      } catch {
        /* leave as-is */
      }
    }

    // Build project card
    const article = document.createElement('article');
    const yearLine = project.year ? `<p class="project-year">c. ${project.year}</p>` : '';

    // Add project link only if url exists
    const titleHTML = project.url
      ? `<${headingLevel}><a href="${project.url}" target="_blank" rel="noopener noreferrer">${project.title || 'Untitled Project'}</a></${headingLevel}>`
      : `<${headingLevel}>${project.title || 'Untitled Project'}</${headingLevel}>`;

    article.innerHTML = `
      ${titleHTML}
      <img src="${imgSrc}" alt="${project.title || 'Project image'}">
      <div class="project-text">
        <p>${project.description || 'No description available.'}</p>
        ${yearLine}
      </div>
    `;

    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  if (!username) return null;
  return fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}
