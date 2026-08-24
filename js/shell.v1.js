// Cascaron del sitio: cabecera, pie y hoja de estilos.
//
// SUSTITUYE A js/globalComponents.js. No es una copia con cambios: aquel archivo
// ya existe en el CDN con cache inmutable de un ano y nunca se actualizaria
// (NOTAS-ARCHIVOS-Y-CDN.md, Hallazgo 2). Por eso el rediseno viaja en archivos
// nuevos y index.html — que si se revalida — apunta a estos.
//
// Al no cargar globalComponents.js tampoco se cargan base.css, colors.css ni
// blog.css, que era el objetivo: css/terminal.v1.css parte de cero en vez de
// pelear con 1.400 lineas de cascada anterior.
//
// LOS GANCHOS DEL HTML NO CAMBIAN. router.js marca .is-active sobre [data-nav],
// authUI.js escribe dentro de [data-auth-slot], i18n.js traduce [data-i18n] y
// perfil.v2.js parchea AuthUI.renderHeaderState en runtime. Todo eso sigue
// funcionando porque la cabecera nueva conserva los mismos atributos.
(function () {
    // Si por lo que sea el archivo viejo tambien se cargo, gana el primero que
    // se defina; definir dos veces lanza. Mejor no romper la pagina.
    if (customElements.get("global-head")) return;

    const BASE = window.location.pathname.includes("/pages/") ? "../" : "";

    class GlobalHead extends HTMLElement {
        connectedCallback() {
            if (document.head.dataset.shellLoaded) return;
            document.head.dataset.shellLoaded = "true";

            const enlaces = [
                { rel: "preconnect", href: "https://fonts.googleapis.com" },
                { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
                { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Share+Tech&display=swap" },
                { rel: "stylesheet", href: `${BASE}css/terminal.v1.css` }
            ];

            enlaces.forEach(attrs => {
                const link = document.createElement("link");
                Object.entries(attrs).forEach(([k, v]) => link.setAttribute(k, v));
                document.head.appendChild(link);
            });

            const esquema = document.createElement("meta");
            esquema.name = "color-scheme";
            esquema.content = "dark";
            document.head.appendChild(esquema);

            document.title = "Mirko Franichevic — Devlog y portafolio";
        }
    }

    class GlobalHeader extends HTMLElement {
        connectedCallback() {
            this.innerHTML = `
                <header class="site-header">
                    <div class="marca">
                        <span class="marca-sello" aria-hidden="true">M</span>
                        <span class="marca-nombre">FRANICHEVIC</span>
                    </div>
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
            const pintar = () => {
                toggle.textContent = window.I18n.t("lang.toggle");
                toggle.title = window.I18n.t("lang.toggleTitle");
            };
            toggle.addEventListener("click", () => window.I18n.toggle());
            window.I18n.onChange(pintar);
            pintar();

            window.I18n.apply();
        }
    }

    class GlobalFooter extends HTMLElement {
        connectedCallback() {
            this.innerHTML = `
                <footer class="site-footer">
                    <a href="#/datos" data-enlace-datos></a>
                    <span class="site-footer-sep">·</span>
                    MIRKO FRANICHEVIC · 2026
                </footer>
            `;

            // Diccionario propio de dos entradas: i18n.js vive en el CDN y no se
            // le pueden agregar claves nuevas.
            const enlace = this.querySelector("[data-enlace-datos]");
            const pintar = () => {
                enlace.textContent = window.I18n.getLang() === "en"
                    ? "How your data is handled"
                    : "Manejo de datos";
            };
            window.I18n.onChange(pintar);
            pintar();
        }
    }

    customElements.define("global-head", GlobalHead);
    customElements.define("global-header", GlobalHeader);
    customElements.define("global-footer", GlobalFooter);
})();
