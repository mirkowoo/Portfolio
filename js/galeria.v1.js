// Galeria de juegos y proyectos: posicion y visor a pantalla completa.
//
// POR QUE ES UN ARCHIVO NUEVO: blog.js pinta la galeria, pero ya existe en el
// CDN con cache inmutable y un cambio sobre el nunca llegaria al visitante
// (NOTAS-ARCHIVOS-Y-CDN.md, Hallazgo 2). Este archivo trabaja sobre el HTML que
// blog.js ya emite, sin reemplazarlo:
//
//   1. blog.js deja la galeria al fondo, despues de Retos y Aprendizajes. Aca se
//      mueve justo despues de la Historia (o al comienzo si no hay Historia).
//   2. El CSS anterior ponia cursor: zoom-in (la lupa) pero nadie escuchaba el
//      clic. Aca se abre un visor con la imagen en grande, flechas, teclado y
//      deslizamiento en movil.
//   3. mediaHtml() pinta todo como <img>, asi que un PDF o un video quedaba como
//      una miniatura rota. Aca esos archivos se muestran como una ficha con su
//      extension, y en el visor se abren con el reproductor o lector que toque.
//
// La delegacion de clics es sobre document y funciona para cualquier
// .galeria > .galeria-item, venga de donde venga.
(function () {
    const BASE = window.location.pathname.includes("/pages/") ? "../" : "";

    // i18n.js vive en el CDN y no admite claves nuevas: diccionario propio.
    const TEXTOS = {
        en: {
            abrir: "Open {name} in the viewer",
            cerrar: "Close",
            anterior: "Previous",
            siguiente: "Next",
            pestana: "Open in new tab",
            descargar: "Download",
            cargando: "Loading…",
            sinVista: "No preview available for this file.",
            error: "The file could not be loaded."
        },
        es: {
            abrir: "Abrir {name} en el visor",
            cerrar: "Cerrar",
            anterior: "Anterior",
            siguiente: "Siguiente",
            pestana: "Abrir en pestaña nueva",
            descargar: "Descargar",
            cargando: "Cargando…",
            sinVista: "Este archivo no tiene vista previa.",
            error: "No se pudo cargar el archivo."
        }
    };

    function tx(clave, vars = {}) {
        const dic = TEXTOS[window.I18n?.getLang()] || TEXTOS.en;
        return dic[clave].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
    }

    // ------------------------------------------------------------ tipos
    const TIPOS = {
        imagen: { exts: ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg", "ico"] },
        video:  { exts: ["mp4", "webm", "mov", "m4v", "ogv"] },
        audio:  { exts: ["mp3", "wav", "ogg", "oga", "m4a", "flac", "aac"] },
        pdf:    { exts: ["pdf"] }
    };

    const MIME = {
        png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
        webp: "image/webp", avif: "image/avif", bmp: "image/bmp", svg: "image/svg+xml",
        ico: "image/x-icon",
        mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", m4v: "video/mp4",
        ogv: "video/ogg",
        mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg",
        m4a: "audio/mp4", flac: "audio/flac", aac: "audio/aac",
        pdf: "application/pdf"
    };

    function extension(nombre) {
        const m = /\.([a-z0-9]+)$/i.exec(nombre || "");
        return m ? m[1].toLowerCase() : "";
    }

    // Sin extension se asume imagen: es lo que hacia blog.js hasta ahora.
    function tipoDe(ext) {
        if (!ext) return "imagen";
        return Object.keys(TIPOS).find(tipo => TIPOS[tipo].exts.includes(ext)) || "archivo";
    }

    // Api.fileUrl devuelve un object URL del blob tal como lo mando el servidor.
    // Si llega como application/octet-stream el navegador no sabe mostrar un PDF
    // o un video en linea y lo descarga. Se re-etiqueta el blob con su MIME.
    const urlsTipadas = new Map();

    async function urlTipada(item) {
        const clave = item.id;
        if (urlsTipadas.has(clave)) return urlsTipadas.get(clave);

        const cruda = await window.Api.fileUrl(item.id);
        if (!cruda) return null;

        const mime = MIME[item.ext];
        if (!mime) return cruda;

        try {
            const blob = await (await fetch(cruda)).blob();
            if (blob.type === mime) {
                urlsTipadas.set(clave, cruda);
                return cruda;
            }
            const url = URL.createObjectURL(new Blob([blob], { type: mime }));
            urlsTipadas.set(clave, url);
            return url;
        } catch {
            return cruda;
        }
    }

    // ------------------------------------------------ galeria en la pagina
    function datosDe(elemento) {
        const img = elemento.querySelector("img[data-file]");
        const id = elemento.dataset.galeriaFile || img?.dataset.file;
        const nombre = elemento.dataset.galeriaNombre ?? img?.alt ?? "";
        const ext = extension(nombre);
        return { id, nombre, ext, tipo: tipoDe(ext), elemento };
    }

    function pintarFicha(elemento, item) {
        elemento.classList.remove("is-empty");
        elemento.classList.add("galeria-ficha");
        elemento.innerHTML = `
            <span class="galeria-ficha-ext">${escape(item.ext || "?")}</span>
            <span class="galeria-ficha-nombre">${escape(item.nombre)}</span>
        `;
    }

    function prepararItem(elemento) {
        if (elemento.dataset.galeriaLista) return;
        elemento.dataset.galeriaLista = "1";

        const item = datosDe(elemento);
        if (!item.id) return;

        // Se guarda en el propio elemento para no depender del <img>, que se
        // reemplaza al pintar la ficha.
        elemento.dataset.galeriaFile = item.id;
        elemento.dataset.galeriaNombre = item.nombre;

        elemento.tabIndex = 0;
        elemento.setAttribute("role", "button");
        elemento.setAttribute("aria-label", tx("abrir", { name: item.nombre || item.ext }));

        if (item.tipo !== "imagen") {
            pintarFicha(elemento, item);
            return;
        }

        // Una "imagen" que el navegador no puede decodificar pasa a ficha.
        const img = elemento.querySelector("img");
        img?.addEventListener("error", () => pintarFicha(elemento, item), { once: true });
    }

    // Mueve la galeria justo despues de la Historia; si no hay Historia, al
    // comienzo de las secciones. Asi queda antes de Retos y Aprendizajes.
    function reubicar(raiz, seccion) {
        const contenedor = raiz.querySelector(".project-sections");
        if (!contenedor || contenedor.contains(seccion)) return;

        const tituloHistoria = window.I18n.t("field.Historia").trim().toLowerCase();
        const historia = [...contenedor.querySelectorAll(":scope > .project-section")]
            .find(s => s.querySelector("h2")?.textContent.trim().toLowerCase() === tituloHistoria);

        seccion.classList.add("project-galeria");
        if (historia) historia.after(seccion);
        else contenedor.prepend(seccion);
    }

    function procesar(raiz) {
        raiz.querySelectorAll(".galeria:not([data-galeria-v1])").forEach(galeria => {
            galeria.dataset.galeriaV1 = "1";
            const seccion = galeria.closest(".project-section");
            if (seccion) reubicar(raiz, seccion);
        });
        raiz.querySelectorAll(".galeria .galeria-item").forEach(prepararItem);
    }

    function observar() {
        const raices = document.querySelectorAll("[data-project-blog]");
        raices.forEach(raiz => {
            procesar(raiz);
            new MutationObserver(() => procesar(raiz)).observe(raiz, { childList: true, subtree: true });
        });
    }

    // ------------------------------------------------------------- visor
    let dialogo = null;
    let items = [];
    let actual = 0;
    let disparador = null;
    let turno = 0;

    function escape(texto) {
        return String(texto ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[c]);
    }

    function crearDialogo() {
        dialogo = document.createElement("dialog");
        dialogo.className = "visor";
        dialogo.innerHTML = `
            <div class="visor-barra">
                <span class="visor-contador" data-visor-contador></span>
                <span class="visor-nombre" data-visor-nombre></span>
                <a class="visor-accion" data-visor-pestana target="_blank" rel="noopener"></a>
                <a class="visor-accion" data-visor-descargar></a>
                <button type="button" class="visor-cerrar" data-visor-cerrar>&times;</button>
            </div>
            <div class="visor-escena" data-visor-escena></div>
            <button type="button" class="visor-nav visor-anterior" data-visor-anterior>&#8249;</button>
            <button type="button" class="visor-nav visor-siguiente" data-visor-siguiente>&#8250;</button>
        `;
        document.body.appendChild(dialogo);

        dialogo.querySelector("[data-visor-cerrar]").addEventListener("click", cerrar);
        dialogo.querySelector("[data-visor-anterior]").addEventListener("click", () => mover(-1));
        dialogo.querySelector("[data-visor-siguiente]").addEventListener("click", () => mover(1));

        // Clic en el fondo (fuera del contenido) cierra.
        dialogo.addEventListener("click", event => {
            if (event.target === dialogo || event.target.matches("[data-visor-escena]")) cerrar();
        });

        dialogo.addEventListener("keydown", event => {
            if (event.key === "ArrowLeft") { event.preventDefault(); mover(-1); }
            if (event.key === "ArrowRight") { event.preventDefault(); mover(1); }
        });

        dialogo.addEventListener("close", alCerrar);

        // Deslizar en movil.
        let x0 = null;
        dialogo.addEventListener("touchstart", event => {
            x0 = event.touches.length === 1 ? event.touches[0].clientX : null;
        }, { passive: true });
        dialogo.addEventListener("touchend", event => {
            if (x0 === null) return;
            const dx = event.changedTouches[0].clientX - x0;
            x0 = null;
            if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1);
        }, { passive: true });
    }

    function textosDialogo() {
        dialogo.querySelector("[data-visor-cerrar]").setAttribute("aria-label", tx("cerrar"));
        dialogo.querySelector("[data-visor-anterior]").setAttribute("aria-label", tx("anterior"));
        dialogo.querySelector("[data-visor-siguiente]").setAttribute("aria-label", tx("siguiente"));
        dialogo.querySelector("[data-visor-pestana]").textContent = tx("pestana");
        dialogo.querySelector("[data-visor-descargar]").textContent = tx("descargar");
    }

    function abrir(lista, indice, origen) {
        if (!dialogo) crearDialogo();
        items = lista;
        actual = indice;
        disparador = origen;
        textosDialogo();

        const varios = items.length > 1;
        dialogo.querySelector("[data-visor-anterior]").hidden = !varios;
        dialogo.querySelector("[data-visor-siguiente]").hidden = !varios;

        if (!dialogo.open) dialogo.showModal();
        document.documentElement.classList.add("visor-abierto");
        mostrar();
    }

    function cerrar() {
        if (dialogo?.open) dialogo.close();
    }

    function alCerrar() {
        turno++;
        // Corta videos y audios que siguieran sonando.
        dialogo.querySelector("[data-visor-escena]").innerHTML = "";
        document.documentElement.classList.remove("visor-abierto");
        disparador?.focus?.();
        disparador = null;
    }

    function mover(paso) {
        if (items.length < 2) return;
        actual = (actual + paso + items.length) % items.length;
        mostrar();
    }

    async function mostrar() {
        const miTurno = ++turno;
        const item = items[actual];
        const escena = dialogo.querySelector("[data-visor-escena]");
        const pestana = dialogo.querySelector("[data-visor-pestana]");
        const descargar = dialogo.querySelector("[data-visor-descargar]");

        dialogo.querySelector("[data-visor-contador]").textContent =
            items.length > 1 ? `${actual + 1} / ${items.length}` : "";
        dialogo.querySelector("[data-visor-nombre]").textContent = item.nombre;
        pestana.hidden = true;
        descargar.hidden = true;
        escena.innerHTML = `<p class="visor-aviso">${escape(tx("cargando"))}</p>`;

        const url = await urlTipada(item);
        if (miTurno !== turno) return; // se navego a otro mientras cargaba

        if (!url) {
            escena.innerHTML = `<p class="visor-aviso">${escape(tx("error"))}</p>`;
            return;
        }

        pestana.href = url;
        pestana.hidden = false;
        descargar.href = url;
        descargar.download = item.nombre || `archivo.${item.ext || "bin"}`;
        descargar.hidden = false;

        const alt = escape(item.nombre);
        switch (item.tipo) {
            case "imagen":
                escena.innerHTML = `<img class="visor-medio" src="${url}" alt="${alt}">`;
                escena.querySelector("img").addEventListener("error", () => {
                    escena.innerHTML = fichaVisor(item);
                }, { once: true });
                break;
            case "video":
                escena.innerHTML = `<video class="visor-medio" src="${url}" controls autoplay playsinline></video>`;
                break;
            case "audio":
                escena.innerHTML = `<div class="visor-archivo">
                        <span class="visor-archivo-ext">${escape(item.ext)}</span>
                        <audio src="${url}" controls autoplay></audio>
                    </div>`;
                break;
            case "pdf":
                escena.innerHTML = `<iframe class="visor-doc" src="${url}" title="${alt}"></iframe>`;
                break;
            default:
                escena.innerHTML = fichaVisor(item);
        }

        // Precarga la siguiente para que avanzar sea inmediato.
        if (items.length > 1) urlTipada(items[(actual + 1) % items.length]);
    }

    function fichaVisor(item) {
        return `<div class="visor-archivo">
                <span class="visor-archivo-ext">${escape(item.ext || "?")}</span>
                <span class="visor-archivo-nombre">${escape(item.nombre)}</span>
                <p class="visor-aviso">${escape(tx("sinVista"))}</p>
            </div>`;
    }

    function abrirDesde(elemento) {
        const galeria = elemento.closest(".galeria");
        const lista = [...galeria.querySelectorAll(".galeria-item")]
            .map(el => { prepararItem(el); return datosDe(el); })
            .filter(item => item.id);
        const indice = lista.findIndex(item => item.elemento === elemento);
        if (indice >= 0) abrir(lista, indice, elemento);
    }

    document.addEventListener("click", event => {
        const elemento = event.target.closest(".galeria .galeria-item");
        if (!elemento) return;
        event.preventDefault();
        abrirDesde(elemento);
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const elemento = event.target.closest?.(".galeria .galeria-item");
        if (!elemento) return;
        event.preventDefault();
        abrirDesde(elemento);
    });

    // ---------------------------------------------------------- arranque
    // La hoja se inyecta aca y no en index.html: shell.v1.js agrega
    // terminal.v1.css al <head> en tiempo de ejecucion y, si esta hoja fuera
    // antes, perderia la cascada a igual especificidad.
    function cargarEstilos() {
        if (document.querySelector("link[data-galeria-v1]")) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `${BASE}css/galeria.v1.css`;
        link.dataset.galeriaV1 = "1";
        document.head.appendChild(link);
    }

    cargarEstilos();
    observar();
})();
