// "Ultima vez actualizado: <fecha>" junto al titulo del blog de un
// juego/proyecto, con la fecha del devlog mas reciente de ESE juego/proyecto.
//
// ARCHIVO NUEVO por el Hallazgo 2 de NOTAS-ARCHIVOS-Y-CDN.md: blog.js ya existe
// en el CDN con cache inmutable y un cambio sobre el no llegaria al visitante.
// Este archivo trabaja sobre el HTML que blog.js ya emite, igual que
// galeria.v1.js.
//
// No se vuelve a consultar la tabla Posts: showProjectBlog ya carga los posts
// del proyecto (ordenados por Fecha desc) y los pinta en
// [data-project-feed] > .post-card, cada una con un <time class="post-fecha">
// ya formateado en el idioma activo. La primera tarjeta de esa lista es
// entonces el devlog mas reciente; se toma su fecha ya formateada en vez de
// reformatearla, para no duplicar la logica de blog.js ni desincronizarse si
// cambia.
(function () {
    const BASE = window.location.pathname.includes("/pages/") ? "../" : "";

    const TEXTOS = {
        en: "Last updated: ",
        es: "Última vez actualizado: "
    };

    function etiqueta() {
        return TEXTOS[window.I18n?.getLang()] || TEXTOS.en;
    }

    // El feed pasa por tres estados mientras carga: sin [data-project-feed]
    // (la cabecera ni se pinto), <ul> vacio (todavia esta pidiendo los posts) y
    // <ul> con .post-card o con el <li class="post-empty"> de "sin devlogs".
    // Solo en el tercer estado se sabe si hay fecha para mostrar.
    function fechaMasReciente(root) {
        const feed = root.querySelector("[data-project-feed]");
        if (!feed || !feed.children.length) return undefined; // aun cargando
        const primera = feed.querySelector(".post-card .post-fecha");
        return primera?.textContent.trim() || null; // null = no hay devlogs
    }

    function actualizar(root) {
        const h1 = root.querySelector(".project-hero h1");
        if (!h1) return;

        const fecha = fechaMasReciente(root);
        if (fecha === undefined) return; // esperar a que el feed resuelva

        let linea = h1.nextElementSibling?.matches(".project-updated")
            ? h1.nextElementSibling
            : null;

        if (!fecha) {
            linea?.remove();
            return;
        }

        // Guarda importante: escribir innerHTML aunque el contenido no cambie
        // sigue disparando el MutationObserver de mas abajo (reemplaza los
        // nodos hijos), que a su vez llama a actualizar() de nuevo -> loop
        // infinito. Por eso solo se toca el DOM cuando la fecha realmente
        // cambio.
        if (linea?.dataset.fecha === fecha) return;

        if (!linea) {
            linea = document.createElement("p");
            linea.className = "project-updated";
            h1.after(linea);
        }
        linea.dataset.fecha = fecha;
        linea.innerHTML = `${escapeHtml(etiqueta())}<time>${escapeHtml(fecha)}</time>`;
    }

    function escapeHtml(texto) {
        return String(texto ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[c]);
    }

    function observar() {
        const root = document.querySelector("[data-project-blog]");
        if (!root) return;
        actualizar(root);
        new MutationObserver(() => actualizar(root)).observe(root, { childList: true, subtree: true });
    }

    // Igual que galeria.v1.js: la hoja se inyecta aca porque shell.v1.js agrega
    // terminal.v1.css al <head> en tiempo de ejecucion.
    function cargarEstilos() {
        if (document.querySelector("link[data-actualizado-v1]")) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `${BASE}css/actualizado.v1.css`;
        link.dataset.actualizadoV1 = "1";
        document.head.appendChild(link);
    }

    cargarEstilos();
    document.addEventListener("DOMContentLoaded", observar);
    if (document.readyState !== "loading") observar();
})();
