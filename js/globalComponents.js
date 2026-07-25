
//Global HEAD <global-head></global-head> component
class GlobalHead extends HTMLElement {
    connectedCallback() {
        if (document.head.dataset.globalHeadLoaded) return;
        document.head.dataset.globalHeadLoaded = "true";

        const basePath = window.location.pathname.includes("/pages/") ? "../" : "";

        const links = [
            { rel: "stylesheet", href: `${basePath}css/base.css` },
            { rel: "stylesheet", href: `${basePath}css/colors.css` },
            { rel: "stylesheet", href: `${basePath}css/blog.css` },
            { rel: "preconnect", href: "https://fonts.googleapis.com" },
            { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
            { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Share+Tech&display=swap" }
        ];

        links.forEach(attrs => {
            const link = document.createElement("link");
            Object.entries(attrs).forEach(([key, value]) => link.setAttribute(key, value));
            document.head.appendChild(link);
        });

        document.title = "Mirko Franichevic — Devlog y portafolio";
    }
}

//Global HEADER <global-header></global-header> component
class GlobalHeader extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <header class="site-header">
                <ul class="nav-links">
                    <li><a class="button-header" data-nav="/ /post" href="#/" data-i18n="nav.devlog"></a></li>
                    <li><a class="button-header" data-nav="/experiencia" href="#/experiencia" data-i18n="nav.experience"></a></li>
                    <li><a class="button-header" data-nav="/juegos /juego" href="#/juegos" data-i18n="nav.games"></a></li>
                    <li><a class="button-header" data-nav="/proyectos /proyecto" href="#/proyectos" data-i18n="nav.projects"></a></li>
                </ul>
                <div class="site-auth">
                    <button type="button" class="button-header button-lang" data-lang-toggle></button>
                    <span data-auth-slot></span>
                </div>
            </header>
        `;

        const toggle = this.querySelector("[data-lang-toggle]");
        const paint = () => {
            toggle.textContent = window.I18n.t("lang.toggle");
            toggle.title = window.I18n.t("lang.toggleTitle");
        };
        toggle.addEventListener("click", () => window.I18n.toggle());
        window.I18n.onChange(paint);
        paint();

        window.I18n.apply();
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


customElements.define('global-header', GlobalHeader);
customElements.define('global-footer', GlobalFooter);
customElements.define('global-head', GlobalHead);
customElements.define('global-script', GlobalScript);
