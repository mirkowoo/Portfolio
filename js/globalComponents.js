
//Global HEAD <global-head></global-head> component
class GlobalHead extends HTMLElement {
    connectedCallback() {
        if (document.head.dataset.globalHeadLoaded) return;
        document.head.dataset.globalHeadLoaded = "true";

        const basePath = window.location.pathname.includes("/pages/") ? "../" : "";

        const links = [
            { rel: "stylesheet", href: `${basePath}css/base.css` },
            { rel: "stylesheet", href: `${basePath}css/colors.css` },
            { rel: "preconnect", href: "https://fonts.googleapis.com" },
            { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
            { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Share+Tech&display=swap" }
        ];

        links.forEach(attrs => {
            const link = document.createElement("link");
            Object.entries(attrs).forEach(([key, value]) => link.setAttribute(key, value));
            document.head.appendChild(link);
        });

        document.title = "Document";
    }
}

//Global HEADER <global-header></global-header> component
class GlobalHeader extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <header class="site-header">
                <ul class="nav-links">
                    <li><button class="button-header" id="go-to-home" onclick="buttonClick('home', this)">Go to Home</button></li>
                    <li><button class="button-header" id="go-to-experience" onclick="buttonClick('experience', this)">Go to Experience</button></li>
                    <li><button class="button-header" id="go-to-games" onclick="buttonClick('games', this)">Go to Games</button></li>
                    <li><button class="button-header" id="go-to-projects" onclick="buttonClick('projects', this)">Go to Projects</button></li>
                </ul>
            </header>
        `
    }
}

//Global FOOTER <global-footer></global-footer> component
class GlobalFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <footer class="site-footer" align="center">
                <p>&copy; 2026 My Portfolio. Pretty cool no?.</p>
            </footer>
        `
    }
}

//Global SCRIPT <global-script></global-script> component
class GlobalScript extends HTMLElement {
    connectedCallback() {
        const basePath = window.location.pathname.includes("/pages/") ? "../" : "";
        this.innerHTML = `
            <script src="${basePath}js/config.js" defer></script>
            <script src="${basePath}js/main.js" defer></script>
        `
    }
}


//Navigation button click
function buttonClick(id, button) {
    activatePage(id, button);
    clearButtonStyles(id);
}
//Function to navigate to a specific section
function activatePage(id, button) {
  window.showPage(id);

  if (button) {
    button.setAttribute("style", "background-color: var(--color5); color: var(--color10);");
  }
}
//Clear button styles except the clicked one
function clearButtonStyles(id) {
  document.querySelectorAll(".button-header").forEach(button => {
    if (button.id !== `go-to-${id}`) {
      button.setAttribute("style", "background-color: var(--color1); color: var(--color10);");
    }
  });
}

function goTo(id) {
  const isInPagesFolder = window.location.pathname.includes("/pages/");
  const basePath = isInPagesFolder ? "" : "pages/";
  window.location.href = `${basePath}${id}.html`;
}

customElements.define('global-header', GlobalHeader);
customElements.define('global-footer', GlobalFooter);
customElements.define('global-head', GlobalHead);
customElements.define('global-script', GlobalScript);
