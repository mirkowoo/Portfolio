// Router por hash sobre el mecanismo de secciones existente (showPage).
//
//   #/                        feed central del blog
//   #/experiencia             lista de experiencia
//   #/juegos                  lista de juegos
//   #/proyectos               lista de proyectos
//   #/juego/<slug>            blog dedicado de un juego
//   #/proyecto/<slug>         blog dedicado de un proyecto
//   #/post/<slug>             post individual
(function () {
    const routes = [];

    function on(pattern, handler) {
        routes.push({ pattern, handler });
    }

    function currentPath() {
        const hash = window.location.hash.replace(/^#/, "");
        if (!hash || hash === "/") return "/";
        return hash;
    }

    function match(path) {
        for (const route of routes) {
            const keys = [];
            const regex = new RegExp("^" + route.pattern.replace(/:(\w+)/g, (_, key) => {
                keys.push(key);
                return "([^/]+)";
            }) + "/?$");

            const result = path.match(regex);
            if (!result) continue;

            const params = {};
            keys.forEach((key, i) => { params[key] = decodeURIComponent(result[i + 1]); });
            return { route, params };
        }
        return null;
    }

    async function resolve() {
        const path = currentPath();
        const found = match(path);

        if (!found) {
            navigate("/");
            return;
        }

        document.body.dataset.route = path;
        highlightNav(path);

        try {
            await found.route.handler(found.params);
        } catch (error) {
            console.error("Error resolviendo la ruta", path, error);
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function navigate(path) {
        const target = `#${path}`;
        if (window.location.hash === target) {
            resolve();
            return;
        }
        window.location.hash = target;
    }

    // data-nav acepta varias raices separadas por espacio, para que el blog de un
    // proyecto (#/juego/x) marque el mismo boton que la lista (#/juegos).
    function highlightNav(path) {
        const root = "/" + (path.split("/")[1] || "");
        document.querySelectorAll("[data-nav]").forEach(link => {
            const roots = link.getAttribute("data-nav").split(/\s+/).filter(Boolean);
            link.classList.toggle("is-active", roots.includes(root));
        });
    }

    window.addEventListener("hashchange", resolve);
    window.addEventListener("DOMContentLoaded", resolve);

    window.Router = { on, navigate, resolve, currentPath };
})();
