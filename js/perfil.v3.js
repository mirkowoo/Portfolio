// Perfil del espacio de trabajo: identidad editable + logros transversales.
//
// SUSTITUYE A js/perfil.v2.js, que deja de cargarse desde index.html. Tres
// razones para reemplazarlo entero en vez de seguir parchándolo desde afuera:
//
// 1. LOS LOGROS NO SE PODÍAN LEER. v2 consultaba la tabla LogrosUsuarios con el
//    JWT del usuario y el gateway respondía "No access to table 't'". No es un
//    permiso mal puesto — los dos roles tienen el scope configurado — sino que
//    los JWT de usuario final NO tienen acceso a tablas: los roles del gateway
//    son etiquetas para el frontend, no ACLs (NOTAS-ARCHIVOS-Y-CDN.md, apéndice).
//    Ahora la lista viene en la respuesta del endpoint de logros, que ya la
//    consultaba de todos modos para no otorgar duplicados.
//
// 2. EL MENÚ FILTRABA OYENTES. v2 registraba un click y un keydown sobre
//    document en cada repintado de la cabecera, sin quitar los anteriores. Acá
//    se instalan una sola vez.
//
// 3. La pestaña "Mi perfil" de la barra ya no se inyecta. Al perfil se entra
//    por el menú de usuario; tenerlo en dos sitios de la misma cabecera sobra.
//
// Archivo nuevo por lo de siempre: los que ya existen no se propagan por el CDN
// (NOTAS-ARCHIVOS-Y-CDN.md, Hallazgo 2). index.html sí se revalida.
//
// EL PERFIL NO VIVE EN UNA TABLA. Vive en la cuenta del end-user y se edita con
// su JWT contra /profile/me — sin credenciales de admin y sin automatización de
// por medio. Por eso es el mismo perfil en todas las apps del espacio.
(function () {
    const WS = "e0efff61-b451-46de-8dcf-e2fa8634d20a";
    const GATEWAY = `https://gateway.praxsuite.com/${WS}`;

    const CFG = {
        perfilUrl: `${GATEWAY}/profile/me`,
        subirUrl: `${GATEWAY}/files/upload`,
        urlDeArchivo: (id, min) => `${GATEWAY}/files/${id}/url?expiresMinutes=${min}`,
        otorgarUrl: `${GATEWAY}/endpoint/a25e8ed1-ea12-4d2a-ae23-245be5a60984`,
        tablas: { logros: "604350b4-0935-4f9c-9592-a5cdaff276a8" }
    };

    // El avatar se guarda a 256px: suficiente para cualquier lugar donde se
    // muestre y evita subir 4 MB para un círculo de 40 píxeles.
    const LADO_AVATAR = 256;
    const DIAS_SAS = 365 * 24 * 60; // la URL firmada caduca; ver refrescarAvatar()

    const T = {
        es: {
            titulo: "Mi perfil", entrar: "Inicia sesión para ver tu perfil y tus logros.",
            logros: "Logros", desbloqueados: "desbloqueados",
            secreto: "Logro secreto", secretoDesc: "Se revela al conseguirlo.",
            bloqueado: "Bloqueado", vacio: "Todavía no hay logros publicados.",
            error: "No se pudieron cargar los logros.",
            actualizar: "Buscar logros nuevos", buscando: "Buscando…",
            nuevos: n => (n === 1 ? "¡1 logro nuevo!" : `¡${n} logros nuevos!`),
            sinNuevos: "Nada nuevo por ahora.",
            nombre: "Nombre visible", guardar: "Guardar", guardando: "Guardando…",
            guardado: "Perfil actualizado.", cambiarFoto: "Cambiar foto",
            quitarFoto: "Quitar", errorPerfil: "No se pudo guardar el perfil.",
            noEsImagen: "Ese archivo no es una imagen.",
            perfil: "Perfil", desconectarse: "Desconectarse"
        },
        en: {
            titulo: "My profile", entrar: "Sign in to see your profile and achievements.",
            logros: "Achievements", desbloqueados: "unlocked",
            secreto: "Secret achievement", secretoDesc: "Revealed once you earn it.",
            bloqueado: "Locked", vacio: "No achievements published yet.",
            error: "Couldn't load achievements.",
            actualizar: "Check for new achievements", buscando: "Checking…",
            nuevos: n => (n === 1 ? "1 new achievement!" : `${n} new achievements!`),
            sinNuevos: "Nothing new right now.",
            nombre: "Display name", guardar: "Save", guardando: "Saving…",
            guardado: "Profile updated.", cambiarFoto: "Change photo",
            quitarFoto: "Remove", errorPerfil: "Couldn't save the profile.",
            noEsImagen: "That file is not an image.",
            perfil: "Profile", desconectarse: "Sign out"
        }
    };

    const txt = () => T[window.I18n?.getLang?.()] || T.es;
    const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    // ─── API con el JWT del usuario ──────────────────────────────────────────

    async function conToken(url, opciones = {}) {
        const token = window.Auth?.getToken();
        if (!token) throw new Error("sin sesión");
        const res = await fetch(url, {
            ...opciones,
            headers: { ...(opciones.headers || {}), Authorization: `Bearer ${token}` }
        });
        const datos = await res.json().catch(() => null);
        if (!res.ok || datos?.error) {
            const e = datos?.error;
            throw new Error(typeof e === "string" ? e : (e?.message || `HTTP ${res.status}`));
        }
        return datos;
    }

    const leerPerfil = () => conToken(CFG.perfilUrl);

    const guardarPerfil = payload => conToken(CFG.perfilUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    async function subirArchivo(file) {
        const form = new FormData();
        form.append("file", file);
        // Sin Content-Type: el navegador tiene que fijar el boundary del multipart.
        return conToken(CFG.subirUrl, { method: "POST", body: form });
    }

    const urlFirmada = id => conToken(CFG.urlDeArchivo(id, DIAS_SAS)).then(d => d.url);

    /**
     * Evalúa y otorga logros, y devuelve TODOS los del usuario.
     *
     * No lleva credencial de API: la automation valida el JWT del cuerpo y
     * decide con la identidad verificada. El cliente nunca nombra el logro que
     * quiere — solo manda su token.
     */
    async function evaluarLogros(origen) {
        const res = await fetch(CFG.otorgarUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: window.Auth.getToken(), origen })
        });
        const datos = await res.json().catch(() => null);
        // Estos endpoints responden 200 con { error } adentro: el status no basta.
        if (!res.ok || datos?.error) {
            const e = datos?.error;
            throw new Error(typeof e === "string" ? e : (e?.message || `HTTP ${res.status}`));
        }
        const leer = v => { try { return JSON.parse(v || "[]"); } catch { return []; } };
        return {
            nuevos: Array.isArray(datos?.nuevos) ? datos.nuevos : leer(datos?.nuevos),
            mios: Array.isArray(datos?.mios) ? datos.mios : leer(datos?.mios)
        };
    }

    // ─── Avatar ──────────────────────────────────────────────────────────────

    /**
     * Recorta al cuadrado central y reescala a 256px antes de subir.
     * Se hace en el cliente para no mandar 4 MB por una miniatura, y el recorte
     * cuadrado evita que un retrato vertical salga deformado en un círculo.
     */
    function prepararImagen(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                const lado = Math.min(img.width, img.height);
                const lienzo = document.createElement("canvas");
                lienzo.width = lienzo.height = LADO_AVATAR;
                const ctx = lienzo.getContext("2d");
                ctx.drawImage(img,
                    (img.width - lado) / 2, (img.height - lado) / 2, lado, lado,
                    0, 0, LADO_AVATAR, LADO_AVATAR);
                lienzo.toBlob(
                    b => b ? resolve(new File([b], "avatar.jpg", { type: "image/jpeg" }))
                           : reject(new Error("no se pudo procesar la imagen")),
                    "image/jpeg", 0.85);
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagen inválida")); };
            img.src = url;
        });
    }

    /**
     * La URL firmada CADUCA. Por eso se guarda también el id del blob en
     * settings.avatarBlobId: si la URL guardada ya no sirve, se pide una nueva
     * en vez de mostrar una foto rota, que es un fallo silencioso y molesto.
     */
    async function refrescarAvatar(perfil) {
        const id = perfil?.settings?.avatarBlobId;
        if (!id || !perfil.profileImageUrl) return perfil;
        try {
            const ok = await fetch(perfil.profileImageUrl, { method: "HEAD" });
            if (ok.ok) return perfil;
        } catch { /* cae abajo y re-firma */ }
        try {
            const nueva = await urlFirmada(id);
            return await guardarPerfil({ profileImageUrl: nueva });
        } catch {
            return perfil;
        }
    }

    // ─── Vista ───────────────────────────────────────────────────────────────

    function tarjetaLogro(logro, otorgado) {
        const t = txt();
        const abierto = Boolean(otorgado);
        const oculto = logro.Secreto === true && !abierto;
        const app = window.Api?.statusName ? window.Api.statusName(logro.App) : "";
        const fecha = abierto && otorgado.Otorgado
            ? new Date(otorgado.Otorgado).toLocaleDateString(
                window.I18n?.locale?.() || "es-CL", { year: "numeric", month: "short", day: "numeric" })
            : t.bloqueado;
        return `
            <li class="logro ${abierto ? "is-unlocked" : "is-locked"}">
                <span class="logro-icono" aria-hidden="true">${esc(oculto ? "🔒" : (logro.Icono || "🏅"))}</span>
                <div class="logro-cuerpo">
                    <h3>${esc(oculto ? t.secreto : logro.Nombre)}</h3>
                    <p>${esc(oculto ? t.secretoDesc : logro.Descripcion)}</p>
                    <p class="logro-meta">
                        ${app ? `<span class="logro-app">${esc(app)}</span>` : ""}
                        <span>${esc(fecha)}</span>
                    </p>
                </div>
            </li>`;
    }

    async function pintar(cont) {
        const t = txt();

        if (!window.Auth?.isLoggedIn?.() || window.Auth.isExpired?.()) {
            cont.innerHTML = `<header class="perfil-intro"><h1>${t.titulo}</h1></header>
                <p class="perfil-vacio">${t.entrar}</p>`;
            return;
        }

        cont.innerHTML = `<header class="perfil-intro"><h1>${t.titulo}</h1></header>
            <p class="perfil-vacio" data-cargando>…</p>`;

        let perfil;
        try {
            perfil = await refrescarAvatar(await leerPerfil());
        } catch (e) {
            cont.querySelector("[data-cargando]").textContent = `${t.errorPerfil} ${e.message || ""}`;
            return;
        }

        const inicial = (perfil.username || perfil.email || "?").trim().charAt(0).toUpperCase();
        cont.innerHTML = `
            <header class="perfil-intro"><h1>${t.titulo}</h1></header>

            <section class="perfil-identidad">
                <div class="perfil-foto">
                    ${perfil.profileImageUrl
                        ? `<img src="${esc(perfil.profileImageUrl)}" alt="" data-foto>`
                        : `<span class="perfil-inicial" data-foto>${esc(inicial)}</span>`}
                    <div class="perfil-foto-acciones">
                        <label class="button-header">
                            ${t.cambiarFoto}
                            <input type="file" accept="image/*" hidden data-archivo>
                        </label>
                        ${perfil.profileImageUrl
                            ? `<button type="button" class="button-header button-ghost" data-quitar>${t.quitarFoto}</button>`
                            : ""}
                    </div>
                </div>
                <div class="perfil-campos">
                    <label>${t.nombre}
                        <input type="text" maxlength="40" data-nombre value="${esc(perfil.username || "")}">
                    </label>
                    <p class="perfil-correo">${esc(perfil.email || "")}</p>
                    <button type="button" class="button-header" data-guardar>${t.guardar}</button>
                    <p class="perfil-aviso" data-aviso hidden></p>
                </div>
            </section>

            <section class="perfil-logros">
                <div class="perfil-logros-cabecera">
                    <h2>${t.logros} <span data-conteo class="perfil-conteo"></span></h2>
                    <button type="button" class="button-header" data-refrescar>${t.actualizar}</button>
                </div>
                <p class="perfil-aviso" data-avisoLogros hidden></p>
                <ul class="logros-grid" data-lista></ul>
            </section>`;

        const $ = s => cont.querySelector(s);
        const aviso = (el, texto, bueno) => {
            el.textContent = texto; el.hidden = false;
            el.classList.toggle("es-bueno", Boolean(bueno));
        };

        // --- identidad ---
        $("[data-guardar]").addEventListener("click", async () => {
            const boton = $("[data-guardar]");
            boton.disabled = true; boton.textContent = t.guardando;
            try {
                await guardarPerfil({ username: $("[data-nombre]").value.trim() });
                aviso($("[data-aviso]"), t.guardado, true);
                refrescarCabecera();
            } catch (e) {
                aviso($("[data-aviso]"), `${t.errorPerfil} ${e.message || ""}`);
            } finally {
                boton.disabled = false; boton.textContent = t.guardar;
            }
        });

        $("[data-archivo]").addEventListener("change", async ev => {
            const file = ev.target.files?.[0];
            if (!file) return;
            if (!file.type.startsWith("image/")) {
                aviso($("[data-aviso]"), t.noEsImagen);
                return;
            }
            aviso($("[data-aviso]"), t.guardando);
            try {
                const subido = await subirArchivo(await prepararImagen(file));
                const url = await urlFirmada(subido.id);
                await guardarPerfil({
                    profileImageUrl: url,
                    // El id se conserva para poder re-firmar cuando la URL caduque.
                    settings: { ...(perfil.settings || {}), avatarBlobId: subido.id }
                });
                await pintar(cont);
                refrescarCabecera();
            } catch (e) {
                aviso($("[data-aviso]"), `${t.errorPerfil} ${e.message || ""}`);
            }
        });

        $("[data-quitar]")?.addEventListener("click", async () => {
            try {
                const s = { ...(perfil.settings || {}) };
                delete s.avatarBlobId;
                await guardarPerfil({ profileImageUrl: "", settings: s });
                await pintar(cont);
                refrescarCabecera();
            } catch (e) {
                aviso($("[data-aviso]"), `${t.errorPerfil} ${e.message || ""}`);
            }
        });

        // --- logros ---
        //
        // Dos fuentes distintas a propósito: el CATÁLOGO es público y se lee con
        // la clave pública; LO QUE TIENES es privado y viene del endpoint, que
        // lo resuelve desde el token. El navegador no puede consultar esa tabla.
        async function recargarLogros(origen) {
            const lista = $("[data-lista]"), conteo = $("[data-conteo]");
            try {
                const [catalogo, resultado] = await Promise.all([
                    window.Api.query("l", CFG.tablas.logros, {
                        select: ["LogroId", "Nombre", "Descripcion", "Icono", "App", "Secreto", "Orden", "Publicado"],
                        orderBy: [{ field: "Orden", dir: "asc" }], limit: 200
                    }),
                    evaluarLogros(origen || "portafolio")
                ]);

                const publicados = catalogo.filter(l => l.Publicado !== false);
                const porId = {};
                resultado.mios.forEach(m => { if (m.LogroId) porId[m.LogroId] = m; });

                if (!publicados.length) {
                    lista.innerHTML = `<li class="perfil-vacio">${t.vacio}</li>`;
                    conteo.textContent = "";
                    return resultado;
                }
                // Desbloqueados primero: la vitrina antes que la lista de tareas.
                const orden = publicados.slice().sort((a, b) =>
                    (porId[a.LogroId] ? 0 : 1) - (porId[b.LogroId] ? 0 : 1)
                    || (a.Orden ?? 0) - (b.Orden ?? 0));
                lista.innerHTML = orden.map(l => tarjetaLogro(l, porId[l.LogroId])).join("");
                conteo.textContent = `${resultado.mios.length}/${publicados.length} ${t.desbloqueados}`;
                return resultado;
            } catch (e) {
                lista.innerHTML = `<li class="perfil-vacio">${t.error} ${esc(e.message || "")}</li>`;
                return null;
            }
        }

        $("[data-refrescar]").addEventListener("click", async () => {
            const boton = $("[data-refrescar]");
            boton.disabled = true; boton.textContent = t.buscando;
            try {
                const r = await recargarLogros("portafolio");
                if (r) {
                    aviso($("[data-avisoLogros]"),
                        r.nuevos.length ? t.nuevos(r.nuevos.length) : t.sinNuevos,
                        r.nuevos.length > 0);
                }
            } finally {
                boton.disabled = false; boton.textContent = t.actualizar;
            }
        });

        await recargarLogros("portafolio");
    }

    // ─── Menú de usuario en la cabecera ──────────────────────────────────────

    let perfilCache = null;

    function cerrarMenus() {
        document.querySelectorAll(".menu-usuario-lista").forEach(l => { l.hidden = true; });
        document.querySelectorAll("[data-menu]").forEach(b => b.setAttribute("aria-expanded", "false"));
    }

    // Se instalan UNA vez, no en cada repintado: v2 los registraba cada vez que
    // pintaba la cabecera y los viejos nunca se quitaban.
    function instalarCierreDeMenus() {
        document.addEventListener("click", cerrarMenus);
        document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarMenus(); });
    }

    async function pintarCabecera() {
        const slot = document.querySelector("[data-auth-slot]");
        if (!slot || !window.Auth?.isLoggedIn?.()) return;

        const t = txt();
        if (!perfilCache) {
            try { perfilCache = await leerPerfil(); } catch { perfilCache = null; }
        }
        const nombre = perfilCache?.username || window.Auth.displayName();
        const foto = perfilCache?.profileImageUrl;
        const inicial = (nombre || "?").trim().charAt(0).toUpperCase();

        slot.innerHTML = `
            <div class="menu-usuario">
                <button type="button" class="button-header" data-menu aria-haspopup="menu" aria-expanded="false">
                    ${foto ? `<img class="menu-usuario-avatar" src="${esc(foto)}" alt="">`
                           : `<span class="menu-usuario-avatar">${esc(inicial)}</span>`}
                    <span>${esc(nombre)}</span>
                </button>
                <div class="menu-usuario-lista" role="menu" hidden>
                    <button type="button" role="menuitem" data-ir-perfil>${t.perfil}</button>
                    <div class="separador"></div>
                    <button type="button" role="menuitem" data-salir>${t.desconectarse}</button>
                </div>
            </div>`;

        const boton = slot.querySelector("[data-menu]");
        const lista = slot.querySelector(".menu-usuario-lista");

        boton.addEventListener("click", e => {
            e.stopPropagation();
            const abrir = lista.hidden;
            cerrarMenus();
            lista.hidden = !abrir;
            boton.setAttribute("aria-expanded", String(abrir));
        });

        // El clic dentro del menú no debe cerrarlo antes de que el botón actúe.
        lista.addEventListener("click", e => e.stopPropagation());

        slot.querySelector("[data-ir-perfil]").addEventListener("click", () => {
            cerrarMenus();
            window.Router.navigate("/perfil");
        });

        slot.querySelector("[data-salir]").addEventListener("click", () => {
            cerrarMenus();
            perfilCache = null;
            window.Auth.logout();
        });
    }

    function refrescarCabecera() {
        perfilCache = null;
        pintarCabecera();
    }

    // ─── Arranque ────────────────────────────────────────────────────────────

    function inicializar() {
        if (!window.Router || !window.Api || !window.AuthUI) return;

        instalarCierreDeMenus();

        window.Router.on("/perfil", async () => {
            window.showPage("perfil");
            const cont = document.querySelector("#perfil .content");
            if (cont) await pintar(cont);
        });

        // Se parchea en vez de editar authUI.js, que no propagaría por la caché.
        const original = window.AuthUI.renderHeaderState;
        window.AuthUI.renderHeaderState = function () {
            original.apply(this, arguments);
            pintarCabecera();
        };

        // authUI.js repinta la cabecera al cambiar de idioma llamando a su
        // función LOCAL, saltándose el parche de arriba: el menú desaparecía y
        // solo volvía recargando. Este oyente se registra después que el suyo,
        // así que repone el menú justo detrás.
        window.I18n?.onChange?.(() => window.AuthUI.renderHeaderState());

        window.Auth?.onChange?.(() => {
            perfilCache = null;
            pintarCabecera();
            if (window.Router.currentPath() === "/perfil") {
                const cont = document.querySelector("#perfil .content");
                if (cont) pintar(cont);
            }
        });

        // La cabecera la pinta AuthUI cuando resuelve la sesión; este empujón es
        // para el primer render, que puede llegar antes que el token.
        setTimeout(pintarCabecera, 300);
    }

    window.PerfilWorkspace = { refrescarCabecera };

    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", inicializar);
    } else {
        inicializar();
    }
})();
