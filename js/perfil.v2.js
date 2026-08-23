// Perfil del workspace: identidad editable + logros transversales.
//
// Sustituye a js/logros.v1.js, que queda en el CDN sin referenciar (borrarlo
// rompería a quien tenga el index.html anterior en caché durante ~5 minutos).
//
// ---------------------------------------------------------------------------
// POR QUÉ ESTE ARCHIVO ES AUTOCONTENIDO Y LLEVA VERSIÓN EN EL NOMBRE
//
// NOTAS-ARCHIVOS-Y-CDN.md, Hallazgo 2: los assets se sirven con caché inmutable
// de un año sobre nombres SIN hash. Un archivo existente que cambia nunca llega
// al visitante; uno nuevo sí. Por eso:
//   - No se toca config.js, api.js ni authUI.js.
//   - El menú de usuario se instala parcheando AuthUI.renderHeaderState en
//     runtime, en vez de editar authUI.js.
//   - index.html sí se puede editar: se sirve con max-age=300.
//
// EL PERFIL NO VIVE EN UNA TABLA. Vive en la cuenta del end-user del workspace,
// y se edita con el JWT del propio usuario contra /profile/me — sin credenciales
// de admin y sin automatización de por medio. Así es el mismo perfil en todas
// las apps del workspace.
// ---------------------------------------------------------------------------
(function () {
    const WS = "e0efff61-b451-46de-8dcf-e2fa8634d20a";
    const GATEWAY = `https://gateway.praxsuite.com/${WS}`;

    const CFG = {
        perfilUrl: `${GATEWAY}/profile/me`,
        subirUrl: `${GATEWAY}/files/upload`,
        urlDeArchivo: (id, min) => `${GATEWAY}/files/${id}/url?expiresMinutes=${min}`,
        queryUrl: `${GATEWAY}/query`,
        otorgarUrl: `${GATEWAY}/endpoint/a25e8ed1-ea12-4d2a-ae23-245be5a60984`,
        tablas: {
            logros: "604350b4-0935-4f9c-9592-a5cdaff276a8",
            logrosUsuarios: "1ec44297-eb1b-4d23-b432-e177db2b7fba"
        }
    };

    // El avatar se guarda a 256px: suficiente para cualquier lugar donde se
    // muestre y evita subir una foto de 4 MB para un círculo de 40 píxeles.
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
            noEsImagen: "That file isn't an image.",
            perfil: "Profile", desconectarse: "Sign out"
        }
    };
    const txt = () => T[window.I18n?.getLang?.() === "en" ? "en" : "es"];

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

    async function consultar(tablaId, query) {
        return conToken(CFG.queryUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refs: { t: tablaId }, query: { from: "t", ...query } })
        }).then(d => d?.data ?? []);
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
                window.PerfilWorkspace?.refrescarCabecera?.();
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
                window.PerfilWorkspace?.refrescarCabecera?.();
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
                window.PerfilWorkspace?.refrescarCabecera?.();
            } catch (e) {
                aviso($("[data-aviso]"), `${t.errorPerfil} ${e.message || ""}`);
            }
        });

        // --- logros ---
        async function recargarLogros() {
            const lista = $("[data-lista]"), conteo = $("[data-conteo]");
            try {
                const [catalogo, mios] = await Promise.all([
                    window.Api.query("l", CFG.tablas.logros, {
                        select: ["LogroId", "Nombre", "Descripcion", "Icono", "App", "Secreto", "Orden", "Publicado"],
                        orderBy: [{ field: "Orden", dir: "asc" }], limit: 200
                    }),
                    consultar(CFG.tablas.logrosUsuarios, {
                        select: ["Id", "LogroId", "Otorgado"], limit: 200
                    })
                ]);
                const publicados = catalogo.filter(l => l.Publicado !== false);
                const porId = {};
                mios.forEach(m => { if (m.LogroId) porId[m.LogroId] = m; });
                if (!publicados.length) {
                    lista.innerHTML = `<li class="perfil-vacio">${t.vacio}</li>`;
                    conteo.textContent = ""; return;
                }
                // Desbloqueados primero: la vitrina antes que la lista de tareas.
                const orden = publicados.slice().sort((a, b) =>
                    (porId[a.LogroId] ? 0 : 1) - (porId[b.LogroId] ? 0 : 1)
                    || (a.Orden ?? 0) - (b.Orden ?? 0));
                lista.innerHTML = orden.map(l => tarjetaLogro(l, porId[l.LogroId])).join("");
                conteo.textContent = `${mios.length}/${publicados.length} ${t.desbloqueados}`;
            } catch (e) {
                lista.innerHTML = `<li class="perfil-vacio">${t.error} ${esc(e.message || "")}</li>`;
            }
        }

        $("[data-refrescar]").addEventListener("click", async () => {
            const boton = $("[data-refrescar]");
            boton.disabled = true; boton.textContent = t.buscando;
            try {
                const r = await fetch(CFG.otorgarUrl, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: window.Auth.getToken(), origen: "portafolio" })
                }).then(x => x.json());
                if (r?.error) throw new Error(String(r.error));
                let nuevos = []; try { nuevos = JSON.parse(r?.nuevos || "[]"); } catch { /* vacío */ }
                aviso($("[data-avisoLogros]"), nuevos.length ? t.nuevos(nuevos.length) : t.sinNuevos, nuevos.length > 0);
                await recargarLogros();
            } catch (e) {
                aviso($("[data-avisoLogros]"), `${t.error} ${e.message || ""}`);
            } finally {
                boton.disabled = false; boton.textContent = t.actualizar;
            }
        });

        await recargarLogros();
    }

    // ─── Menú de usuario en la cabecera ──────────────────────────────────────

    let perfilCache = null;

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
        const alternar = abrir => {
            lista.hidden = !abrir;
            boton.setAttribute("aria-expanded", String(abrir));
        };
        boton.addEventListener("click", e => { e.stopPropagation(); alternar(lista.hidden); });
        // Cerrar al hacer clic fuera o con Escape: un menú pegado tapando la
        // interfaz es peor que no tenerlo.
        document.addEventListener("click", () => alternar(false));
        document.addEventListener("keydown", e => { if (e.key === "Escape") alternar(false); });
        slot.querySelector("[data-ir-perfil]").addEventListener("click", () => {
            alternar(false);
            window.Router.navigate("/perfil");
        });
        slot.querySelector("[data-salir]").addEventListener("click", () => {
            alternar(false);
            perfilCache = null;
            window.Auth.logout();
        });
    }

    function inyectarNav() {
        const lista = document.querySelector(".site-header .nav-links");
        if (!lista || lista.querySelector('[data-nav="/perfil"]')) return;
        const li = document.createElement("li");
        li.innerHTML = `<a class="button-header" data-nav="/perfil" href="#/perfil">${txt().titulo}</a>`;
        lista.appendChild(li);
    }

    function inicializar() {
        if (!window.Router || !window.Api || !window.AuthUI) return;

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

        window.Auth?.onChange?.(() => {
            perfilCache = null;
            pintarCabecera();
            if (window.Router.currentPath() === "/perfil") {
                const cont = document.querySelector("#perfil .content");
                if (cont) pintar(cont);
            }
        });

        inyectarNav();
        window.I18n?.onChange?.(inyectarNav);
        setTimeout(() => { inyectarNav(); pintarCabecera(); }, 300);
    }

    window.PerfilWorkspace = {
        refrescarCabecera: () => { perfilCache = null; pintarCabecera(); }
    };

    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", inicializar);
    } else {
        inicializar();
    }
})();
