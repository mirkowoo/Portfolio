// Hub de aplicaciones del espacio de trabajo.
//
// Que es: la banda de la portada con las apps y juegos que comparten la cuenta
// de Praxsuite. No es una tabla nueva — son las mismas filas de Proyectos y
// ProyectosJuegos marcadas con la columna booleana `Hub`.
//
// POR QUE NO HAY COLUMNA DE ORDEN NI DE ESTADO
//
// El hub muestra unas pocas filas elegidas a mano, asi que ordenarlas no aporta:
// se listan juegos primero y proyectos despues, alfabetico dentro de cada grupo.
//
// El "estado" tampoco es una columna: se DERIVA de si la fila tiene un enlace
// donde abrirla (LinkJugar en juegos, LinkDemo en proyectos). Con enlace esta
// disponible; sin enlace, en desarrollo. Preferible a inventar un campo que
// habria que mantener sincronizado a mano con la realidad.
//
// Archivo nuevo a proposito: los existentes no se propagan por el CDN
// (NOTAS-ARCHIVOS-Y-CDN.md, Hallazgo 2).
(function () {
    const T = {
        es: {
            titulo: "//_espacio_de_trabajo_",
            cuenta: "CUENTA COMPARTIDA",
            apps: "APLICACIONES",
            disponibles: "DISPONIBLES AHORA",
            sesion: "SESIÓN",
            activa: "ACTIVA",
            invitado: "INVITADO",
            disponible: "DISPONIBLE",
            enDesarrollo: "EN DESARROLLO",
            juego: "JUEGO",
            proyecto: "PROYECTO",
            abrir: "ABRIR",
            vacio: "Todavía no hay aplicaciones en el hub. Marca la casilla «Hub» en una fila de Juegos o Proyectos para que aparezca acá.",
            error: "No se pudo cargar el hub."
        },
        en: {
            titulo: "//_workspace_",
            cuenta: "SHARED ACCOUNT",
            apps: "APPLICATIONS",
            disponibles: "AVAILABLE NOW",
            sesion: "SESSION",
            activa: "ACTIVE",
            invitado: "GUEST",
            disponible: "AVAILABLE",
            enDesarrollo: "IN DEVELOPMENT",
            juego: "GAME",
            proyecto: "PROJECT",
            abrir: "OPEN",
            vacio: "No applications in the hub yet. Tick the \"Hub\" box on a Game or Project row to make it show up here.",
            error: "Couldn't load the hub."
        }
    };

    // Dos glifos, uno por tipo de fila. Sin columna de icono: dibujarlos aca es
    // mas honesto que pedirle al owner que suba un SVG por app.
    const GLIFOS = {
        juego: "M12 3v18M3 12h18M6 6l12 12M18 6L6 18",
        proyecto: "M4 6h16v12H4zM4 10h16"
    };

    // Se memoriza la PROMESA, no el resultado. pintar() se dispara desde tres
    // sitios (carga, cambio de idioma, cambio de sesion) y los tres pueden
    // arrancar antes de que el primero responda: guardando solo el resultado se
    // lanzaban tres consultas identicas. Con la promesa compartida hay una sola,
    // y si falla — lo normal mientras la columna Hub no exista — el rechazo
    // tambien se comparte y no se reintenta.
    let peticion = null;

    function t(clave) {
        const lang = window.I18n.getLang();
        return (T[lang] || T.es)[clave];
    }

    function esc(valor) {
        return window.Markdown.escapeHtml(String(valor ?? ""));
    }

    function cargar() {
        if (!peticion) peticion = consultar();
        return peticion;
    }

    async function consultar() {
        const api = window.Api;

        const [juegos, proyectos] = await Promise.all([
            api.query("ProyectosJuegos", api.tables.ProyectosJuegos, {
                select: ["ID", "Titulo", "TituloEN", "DescripcionES", "DescripcionEN",
                         "Engine", "LinkJugar", "Hub"],
                where: [{ field: "Hub", op: "eq", value: true }],
                limit: 20
            }),
            api.query("Proyectos", api.tables.Proyectos, {
                select: ["ID", "Titulo", "TituloEN", "Descripcion", "DescripcionEN",
                         "Tecnologias", "LinkDemo", "LinkRepo", "Hub"],
                where: [{ field: "Hub", op: "eq", value: true }],
                limit: 20
            })
        ]);

        const normaliza = (row, kind) => ({
            ...row,
            kind,
            slug: window.Api.slugify(row.Titulo),
            // El enlace donde se abre la app, si existe. De aca sale el estado.
            enlace: (kind === "juego" ? row.LinkJugar : row.LinkDemo) || "",
            tecnica: (kind === "juego" ? row.Engine : row.Tecnologias) || ""
        });

        return [
            ...juegos.filter(r => (r.Titulo || "").trim()).map(r => normaliza(r, "juego")),
            ...proyectos.filter(r => (r.Titulo || "").trim()).map(r => normaliza(r, "proyecto"))
        ].sort((a, b) => {
            if (a.kind !== b.kind) return a.kind === "juego" ? -1 : 1;
            return String(a.Titulo).localeCompare(String(b.Titulo), "es");
        });
    }

    function tarjeta(item) {
        const titulo = window.I18n.localized(item, "Titulo");
        const descripcion = window.I18n.localized(item, "Descripcion");
        const disponible = Boolean(item.enlace);
        const estado = disponible ? t("disponible") : t("enDesarrollo");
        const clase = disponible ? "" : " es-pendiente";
        const ruta = `#/${item.kind}/${item.slug}`;

        return `
            <a class="hub-card panel" href="${ruta}">
                <div class="hub-card-head">
                    <span class="hub-tipo">${esc(item.kind === "juego" ? t("juego") : t("proyecto"))}</span>
                    <span class="hub-estado${clase}">${esc(estado)}</span>
                </div>

                <div class="hub-card-cuerpo">
                    <span class="hub-icono${clase}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="1.4" stroke-linecap="square" aria-hidden="true">
                            <path d="${GLIFOS[item.kind]}"></path>
                        </svg>
                    </span>
                    <div>
                        <h3>${esc(titulo)}</h3>
                        ${item.tecnica ? `<span class="hub-tipo">${esc(item.tecnica)}</span>` : ""}
                    </div>
                </div>

                ${descripcion ? `<p>${esc(descripcion)}</p>` : ""}

                <div class="post-card-foot">
                    <span class="post-read">${esc(t("abrir"))} &#8594;</span>
                </div>
            </a>
        `;
    }

    function cuenta(items) {
        const conectado = Boolean(window.Auth?.isLoggedIn?.());
        const disponibles = items.filter(i => i.enlace).length;

        const datos = [
            { valor: String(items.length).padStart(2, "0"), rotulo: t("apps") },
            { valor: String(disponibles).padStart(2, "0"), rotulo: t("disponibles") },
            { valor: conectado ? t("activa") : t("invitado"), rotulo: t("sesion") }
        ];

        return `
            <div class="hub-cuenta panel">
                <span class="hub-cuenta-titulo">${esc(t("cuenta"))}</span>
                ${datos.map(d => `
                    <span class="hub-dato">
                        <b>${esc(d.valor)}</b>
                        <span>${esc(d.rotulo)}</span>
                    </span>
                `).join("")}
            </div>
        `;
    }

    async function pintar() {
        const raiz = document.querySelector("[data-hub]");
        if (!raiz) return;

        let items;
        try {
            items = await cargar();
        } catch (error) {
            // El caso mas probable: la columna Hub todavia no existe en la tabla.
            // Ocultar la banda es mejor que dejar un error a la vista.
            console.warn("Hub no disponible:", error);
            raiz.innerHTML = "";
            raiz.hidden = true;
            return;
        }

        raiz.hidden = false;

        const cabecera = `
            <div class="hub-cabecera">
                <span class="rotulo">${esc(t("titulo"))}</span>
            </div>
        `;

        if (!items.length) {
            // Un panel vacio con instrucciones no le sirve a un visitante: solo
            // el owner puede marcar la casilla. Para el resto, la banda no existe.
            if (!window.Admin?.isOwner?.()) {
                raiz.innerHTML = "";
                raiz.hidden = true;
                return;
            }
            raiz.innerHTML = `${cabecera}<div class="hub-vacio panel">${esc(t("vacio"))}</div>`;
            return;
        }

        raiz.innerHTML = `
            ${cabecera}
            <div class="hub-tablero">
                <div class="hub-grid">${items.map(tarjeta).join("")}</div>
                ${cuenta(items)}
            </div>
        `;
    }

    window.addEventListener("DOMContentLoaded", pintar);
    window.I18n.onChange(pintar);
    // El contador de sesion cambia al entrar o salir.
    document.addEventListener("auth:changed", pintar);
})();
