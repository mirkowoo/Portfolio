// Módulo de perfil y logros — el hub de logros del workspace.
//
// Los logros son TRANSVERSALES: las tablas `Logros` y `LogrosUsuarios` no llevan
// prefijo de app. Cualquier app del workspace otorga contra el mismo endpoint y
// todas se ven reflejadas acá.
//
// ---------------------------------------------------------------------------
// POR QUÉ ESTE ARCHIVO ES AUTOCONTENIDO Y LLEVA VERSIÓN EN EL NOMBRE
//
// Ver NOTAS-ARCHIVOS-Y-CDN.md, Hallazgo 2: los assets se sirven con caché
// inmutable de un año sobre nombres SIN hash de contenido. Un archivo que ya
// existía y cambia nunca llega al visitante; uno nuevo sí.
//
// Consecuencia práctica:
//   - No se toca js/config.js  -> la config de logros vive acá abajo.
//   - No se toca js/api.js     -> la consulta con token vive acá abajo.
//   - No se toca globalComponents.js -> el enlace de nav se inyecta en runtime.
//   - index.html SÍ se puede editar: se sirve con max-age=300, no inmutable.
//
// Cuando el versionado por hash exista del lado de Praxsuite, esto se puede
// plegar dentro de los módulos normales y quitarle el `.v1` al nombre.
// ---------------------------------------------------------------------------
(function () {
    const WS = "e0efff61-b451-46de-8dcf-e2fa8634d20a";
    const GATEWAY = `https://gateway.praxsuite.com/${WS}`;

    const CFG = {
        queryUrl: `${GATEWAY}/query`,
        // Endpoint compartido: recibe solo el JWT y decide qué corresponde.
        // El cliente NUNCA nombra el logro que quiere.
        otorgarUrl: `${GATEWAY}/endpoint/a25e8ed1-ea12-4d2a-ae23-245be5a60984`,
        tablas: {
            logros: "604350b4-0935-4f9c-9592-a5cdaff276a8",
            logrosUsuarios: "1ec44297-eb1b-4d23-b432-e177db2b7fba"
        }
    };

    const T = {
        es: {
            titulo: "Mi perfil",
            entrar: "Inicia sesión para ver tu perfil y tus logros.",
            logros: "Logros",
            desbloqueados: "desbloqueados",
            secreto: "Logro secreto",
            secretoDesc: "Se revela al conseguirlo.",
            bloqueado: "Bloqueado",
            vacio: "Todavía no hay logros publicados.",
            error: "No se pudieron cargar los logros.",
            actualizar: "Buscar logros nuevos",
            buscando: "Buscando…",
            nuevos: n => (n === 1 ? "¡1 logro nuevo!" : `¡${n} logros nuevos!`),
            sinNuevos: "Nada nuevo por ahora.",
            apps: "Apps"
        },
        en: {
            titulo: "My profile",
            entrar: "Sign in to see your profile and achievements.",
            logros: "Achievements",
            desbloqueados: "unlocked",
            secreto: "Secret achievement",
            secretoDesc: "Revealed once you earn it.",
            bloqueado: "Locked",
            vacio: "No achievements published yet.",
            error: "Couldn't load achievements.",
            actualizar: "Check for new achievements",
            buscando: "Checking…",
            nuevos: n => (n === 1 ? "1 new achievement!" : `${n} new achievements!`),
            sinNuevos: "Nothing new right now.",
            apps: "Apps"
        }
    };

    const txt = () => T[window.I18n?.getLang?.() === "en" ? "en" : "es"];

    function escapar(s) {
        return String(s ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    // Consulta con el JWT del usuario. El gateway aplica el filtro por fila, así
    // que no hace falta (ni serviría) filtrar por usuario desde acá.
    async function consultarConToken(tablaId, queryBody, token) {
        const respuesta = await fetch(CFG.queryUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ refs: { t: tablaId }, query: { from: "t", ...queryBody } })
        });
        const datos = await respuesta.json().catch(() => null);
        // PraxQL responde 200 con { error: {...} } cuando rechaza: el status solo
        // no basta para saber si funcionó.
        if (!respuesta.ok || datos?.error) {
            const e = datos?.error;
            throw new Error(typeof e === "string" ? e : (e?.message || `HTTP ${respuesta.status}`));
        }
        return datos?.data ?? [];
    }

    async function pedirEvaluacion(token) {
        const respuesta = await fetch(CFG.otorgarUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, origen: "portafolio" })
        });
        const datos = await respuesta.json().catch(() => null);
        if (datos?.error) throw new Error(String(datos.error));
        let nuevos = [];
        try { nuevos = JSON.parse(datos?.nuevos || "[]"); } catch { nuevos = []; }
        return nuevos;
    }

    function tarjeta(logro, otorgado) {
        const t = txt();
        const desbloqueado = Boolean(otorgado);
        const oculto = logro.Secreto === true && !desbloqueado;

        const nombre = oculto ? t.secreto : logro.Nombre;
        const desc = oculto ? t.secretoDesc : logro.Descripcion;
        const icono = oculto ? "🔒" : (logro.Icono || "🏅");
        const app = window.Api?.statusName ? window.Api.statusName(logro.App) : "";

        const fecha = desbloqueado && otorgado.Otorgado
            ? new Date(otorgado.Otorgado).toLocaleDateString(
                window.I18n?.locale?.() || "es-CL",
                { year: "numeric", month: "short", day: "numeric" })
            : t.bloqueado;

        return `
            <li class="logro ${desbloqueado ? "is-unlocked" : "is-locked"}">
                <span class="logro-icono" aria-hidden="true">${escapar(icono)}</span>
                <div class="logro-cuerpo">
                    <h3>${escapar(nombre)}</h3>
                    <p>${escapar(desc)}</p>
                    <p class="logro-meta">
                        ${app ? `<span class="logro-app">${escapar(app)}</span>` : ""}
                        <span>${escapar(fecha)}</span>
                    </p>
                </div>
            </li>`;
    }

    async function pintar(contenedor) {
        const t = txt();

        if (!window.Auth?.isLoggedIn?.() || window.Auth.isExpired?.()) {
            contenedor.innerHTML = `
                <header class="perfil-intro"><h1>${t.titulo}</h1></header>
                <p class="perfil-vacio">${t.entrar}</p>`;
            return;
        }

        const token = window.Auth.getToken();
        const nombre = window.Auth.displayName?.() || "";

        contenedor.innerHTML = `
            <header class="perfil-intro">
                <h1>${t.titulo}</h1>
                <p class="perfil-nombre">${escapar(nombre)}</p>
            </header>
            <section class="perfil-logros">
                <div class="perfil-logros-cabecera">
                    <h2>${t.logros} <span data-conteo class="perfil-conteo"></span></h2>
                    <button type="button" class="button-header" data-refrescar>${t.actualizar}</button>
                </div>
                <p class="perfil-aviso" data-aviso hidden></p>
                <ul class="logros-grid" data-lista></ul>
            </section>`;

        const lista = contenedor.querySelector("[data-lista]");
        const conteo = contenedor.querySelector("[data-conteo]");
        const aviso = contenedor.querySelector("[data-aviso]");
        const boton = contenedor.querySelector("[data-refrescar]");

        async function recargar() {
            try {
                // El catálogo es público; lo obtenido es privado del usuario.
                const [catalogo, mios] = await Promise.all([
                    window.Api.query("l", CFG.tablas.logros, {
                        select: ["LogroId", "Nombre", "Descripcion", "Icono", "App", "Secreto", "Orden", "Publicado"],
                        orderBy: [{ field: "Orden", dir: "asc" }],
                        limit: 200
                    }),
                    consultarConToken(CFG.tablas.logrosUsuarios, {
                        select: ["Id", "LogroId", "Otorgado", "Origen"],
                        limit: 200
                    }, token)
                ]);

                const publicados = catalogo.filter(l => l.Publicado !== false);
                const porId = {};
                mios.forEach(m => { if (m.LogroId) porId[m.LogroId] = m; });

                if (!publicados.length) {
                    lista.innerHTML = `<li class="perfil-vacio">${t.vacio}</li>`;
                    conteo.textContent = "";
                    return;
                }

                // Los desbloqueados primero: la vitrina antes que la lista de tareas.
                const ordenados = publicados.slice().sort((a, b) => {
                    const da = porId[a.LogroId] ? 0 : 1;
                    const db = porId[b.LogroId] ? 0 : 1;
                    return da - db || (a.Orden ?? 0) - (b.Orden ?? 0);
                });

                lista.innerHTML = ordenados.map(l => tarjeta(l, porId[l.LogroId])).join("");
                conteo.textContent = `${mios.length}/${publicados.length} ${t.desbloqueados}`;
            } catch (error) {
                console.error("Logros:", error);
                lista.innerHTML = `<li class="perfil-vacio">${t.error} ${escapar(error.message || "")}</li>`;
            }
        }

        boton.addEventListener("click", async () => {
            boton.disabled = true;
            boton.textContent = t.buscando;
            aviso.hidden = true;
            try {
                const nuevos = await pedirEvaluacion(token);
                aviso.textContent = nuevos.length ? t.nuevos(nuevos.length) : t.sinNuevos;
                aviso.hidden = false;
                aviso.classList.toggle("es-bueno", nuevos.length > 0);
                await recargar();
            } catch (error) {
                aviso.textContent = `${t.error} ${error.message || ""}`;
                aviso.hidden = false;
                aviso.classList.remove("es-bueno");
            } finally {
                boton.disabled = false;
                boton.textContent = t.actualizar;
            }
        });

        await recargar();
    }

    // El enlace de nav se inyecta en runtime porque globalComponents.js ya existe
    // en el CDN y sus cambios no llegarían (ver cabecera de este archivo).
    function inyectarNav() {
        const lista = document.querySelector(".site-header .nav-links");
        if (!lista || lista.querySelector('[data-nav="/perfil"]')) return;
        const li = document.createElement("li");
        li.innerHTML = `<a class="button-header" data-nav="/perfil" href="#/perfil">${txt().titulo}</a>`;
        lista.appendChild(li);
    }

    function inicializar() {
        if (!window.Router || !window.Api) return;

        window.Router.on("/perfil", async () => {
            window.showPage("perfil");
            const contenedor = document.querySelector("#perfil .content");
            if (contenedor) await pintar(contenedor);
        });

        inyectarNav();
        // El header se monta como custom element, que puede llegar después.
        window.I18n?.onChange?.(inyectarNav);
        setTimeout(inyectarNav, 300);

        // Repintar al entrar o salir: el perfil depende de la sesión.
        window.Auth?.onChange?.(() => {
            if (window.Router.currentPath() !== "/perfil") return;
            const contenedor = document.querySelector("#perfil .content");
            if (contenedor) pintar(contenedor);
        });
    }

    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", inicializar);
    } else {
        inicializar();
    }
})();
