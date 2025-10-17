console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const pages = [
  { url: "",            title: "Home" },
  { url: "projects/",   title: "Projects" },
  { url: "resume/",     title: "Resume" },
  { url: "contact/",    title: "Contact" },
  { url: "https://github.com/Miny-oung-K",                title: "GitHub" },
  { url: "https://www.linkedin.com/in/minyoungkim/",      title: "LinkedIn" },
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

  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  nav.append(a);
}
