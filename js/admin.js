// Modo owner: controles de edicion en linea sobre el propio sitio.
//
// IMPORTANTE sobre seguridad: nada de lo que hay aca autoriza nada. isOwner()
// solo decide si se PINTAN los botones, y eso es cosmetico: cualquiera puede
// forzarlo desde la consola. El permiso real lo comprueba la automation, que
// valida el JWT y exige el rol owner antes de escribir. Si alguien fuerza la UI,
// vera los botones y recibira 403 al usarlos.
(function () {
    const t = (key, vars) => window.I18n.t(key, vars);
    const lang = () => window.I18n.getLang();

    // null = todavia no se pregunto. Se resuelve una vez por sesion.
    let owner = null;
    let dialog = null;

    function textoLocal(valor, porDefecto = "") {
        if (!valor) return porDefecto;
        if (typeof valor === "string") return valor;
        return valor[lang()] || valor.en || porDefecto;
    }

    function etiquetaCampo(campo) {
        if (campo.etiqueta) return textoLocal(campo.etiqueta);
        const clave = `field.${campo.nombre}`;
        const traducido = t(clave);
        return traducido === clave ? campo.nombre : traducido;
    }

    // ------------------------------------------------------------------ owner
    async function resolveOwner() {
        if (owner !== null) return owner;
        if (!window.Auth.isLoggedIn() || window.Auth.isExpired()) {
            owner = false;
            return owner;
        }
        try {
            const r = await window.Api.admin({ accion: "whoami" });
            owner = Boolean(r?.owner);
        } catch (error) {
            // Si la automation de admin no existe todavia, el sitio sigue
            // funcionando como si no hubiera owner.
            console.info("modo owner no disponible:", error.message);
            owner = false;
        }
        return owner;
    }

    function isOwner() {
        return owner === true;
    }

    // ----------------------------------------------------------- editor generico
    function construirDialogo() {
        if (dialog) return dialog;
        dialog = document.createElement("dialog");
        dialog.className = "admin-dialog";
        document.body.appendChild(dialog);
        return dialog;
    }

    function inputPara(campo, nombre, valor) {
        const comun = `name="${nombre}"`;
        switch (campo.tipo) {
            case "longtext":
                return `<textarea ${comun} rows="3">${window.Markdown.escapeHtml(valor ?? "")}</textarea>`;
            case "markdown":
                return `<textarea ${comun} rows="10" class="admin-md">${window.Markdown.escapeHtml(valor ?? "")}</textarea>`;
            case "bool":
                return `<input type="checkbox" ${comun}${valor ? " checked" : ""}>`;
            case "int":
                return `<input type="number" ${comun} value="${valor ?? ""}">`;
            case "date":
                return `<input type="datetime-local" ${comun} value="${(valor || "").slice(0, 16)}">`;
            case "status":
                return `<select ${comun}>${["", ...(campo.opciones || [])].map(o =>
                    `<option value="${o}"${o === valor ? " selected" : ""}>${o || "—"}</option>`).join("")}</select>`;
            case "relation":
                return `<select ${comun} data-relation="${campo.tablaRelacionada}"></select>`;
            default:
                return `<input type="text" ${comun} value="${window.Markdown.escapeHtml(valor ?? "")}">`;
        }
    }

    // Devuelve los pares nombre-de-columna / valor que hay que pintar para un
    // campo: uno solo, o dos cuando el campo tiene variante EN.
    function columnasDe(campo, fila) {
        const base = { columna: campo.nombre, valor: fila?.[campo.nombre], sufijo: "" };
        if (!campo.i18n) return [base];
        return [
            { ...base, sufijo: " (ES)" },
            { columna: campo.nombre + "EN", valor: fila?.[campo.nombre + "EN"], sufijo: " (EN)" }
        ];
    }

    function valorRelacion(valor) {
        return window.Api.relationId(valor) || "";
    }

    async function openEditor(schemaKey, fila) {
        const schema = window.AdminSchemas[schemaKey];
        if (!schema) return;

        const d = construirDialogo();
        const esNuevo = !fila?.ID;
        const titulo = esNuevo
            ? t("admin.newOf", { entidad: textoLocal(schema.etiqueta) })
            : t("admin.editOf", { entidad: textoLocal(schema.etiqueta) });

        const filas = schema.campos.flatMap(campo =>
            columnasDe(campo, fila).map(col => {
                const valor = campo.tipo === "relation" ? valorRelacion(col.valor) : col.valor;
                return `
                <label class="admin-field admin-field-${campo.tipo}">
                    <span>${window.Markdown.escapeHtml(etiquetaCampo(campo) + col.sufijo)}${campo.requerido ? " *" : ""}</span>
                    ${inputPara(campo, col.columna, valor)}
                    ${campo.ayuda ? `<small>${window.Markdown.escapeHtml(textoLocal(campo.ayuda))}</small>` : ""}
                </label>`;
            }));

        d.innerHTML = `
            <form class="admin-form" method="dialog">
                <header class="admin-form-head">
                    <h2>${window.Markdown.escapeHtml(titulo)}</h2>
                    <button type="button" class="admin-close" aria-label="${t("admin.cancel")}">&times;</button>
                </header>
                <div class="admin-fields">${filas.join("")}</div>
                <p class="auth-error" data-admin-error hidden></p>
                <footer class="admin-actions">
                    ${esNuevo ? "" : `<button type="button" class="admin-delete">${t("admin.delete")}</button>`}
                    <span class="admin-spacer"></span>
                    <button type="button" class="admin-cancel">${t("admin.cancel")}</button>
                    <button type="submit" class="admin-save">${t("admin.save")}</button>
                </footer>
            </form>
        `;

        await llenarRelaciones(d, fila);

        const cerrar = () => d.close();
        d.querySelector(".admin-close").addEventListener("click", cerrar);
        d.querySelector(".admin-cancel").addEventListener("click", cerrar);
        d.querySelector(".admin-delete")?.addEventListener("click", () => borrar(d, schema, fila));
        d.querySelector(".admin-form").addEventListener("submit", ev => guardar(ev, d, schema, fila));

        d.showModal();
    }

    // Los selects de relacion se llenan con los proyectos y juegos ya cargados.
    async function llenarRelaciones(d, fila) {
        const selects = [...d.querySelectorAll("select[data-relation]")];
        if (!selects.length) return;

        const [juegos, proyectos] = await Promise.all([
            window.Blog.loadJuegos(), window.Blog.loadProyectos()
        ]);
        const fuentes = { ProyectosJuegos: juegos, Proyectos: proyectos };

        selects.forEach(select => {
            const filas = fuentes[select.dataset.relation] || [];
            const actual = valorRelacion(fila?.[select.name]);
            select.innerHTML = `<option value="">—</option>` + filas.map(r =>
                `<option value="${r.ID}"${r.ID === actual ? " selected" : ""}>${window.Markdown.escapeHtml(r.Titulo)}</option>`
            ).join("");
        });
    }

    function recolectar(form, schema) {
        const campos = {};
        schema.campos.forEach(campo => {
            columnasDe(campo, null).forEach(({ columna }) => {
                const input = form.elements[columna];
                if (!input) return;
                if (campo.tipo === "bool") campos[columna] = input.checked;
                else if (campo.tipo === "int") campos[columna] = input.value === "" ? null : Number(input.value);
                else if (campo.tipo === "date") campos[columna] = input.value ? new Date(input.value).toISOString() : null;
                else campos[columna] = input.value;
            });
        });
        return campos;
    }

    function mostrarError(d, error) {
        const box = d.querySelector("[data-admin-error]");
        box.textContent = error?.message || t("admin.saveFailed");
        box.hidden = false;
    }

    async function guardar(ev, d, schema, fila) {
        ev.preventDefault();
        const form = ev.target;
        const boton = form.querySelector(".admin-save");
        boton.disabled = true;

        const campos = recolectar(form, schema);
        // Slug estable: si no se escribio, se deriva del titulo.
        if (schema.tabla === "Posts" && !campos.Slug) {
            campos.Slug = window.Api.slugify(campos.Titulo);
        }

        try {
            await window.Api.admin({
                accion: fila?.ID ? "actualizar" : "crear",
                tabla: schema.tabla,
                filaId: fila?.ID || null,
                campos
            });
            d.close();
            invalidarYRefrescar();
        } catch (error) {
            console.error("admin guardar", error);
            mostrarError(d, error);
        } finally {
            boton.disabled = false;
        }
    }

    async function borrar(d, schema, fila) {
        if (!confirm(t("admin.confirmDelete"))) return;
        try {
            await window.Api.admin({ accion: "borrar", tabla: schema.tabla, filaId: fila.ID });
            d.close();
            invalidarYRefrescar();
        } catch (error) {
            console.error("admin borrar", error);
            mostrarError(d, error);
        }
    }

    function invalidarYRefrescar() {
        window.Blog.invalidateAll();
        window.Router.resolve();
    }

    // -------------------------------------------------------- controles en linea
    function boton(texto, clase, onClick) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = `admin-btn ${clase}`;
        b.textContent = texto;
        b.addEventListener("click", ev => { ev.stopPropagation(); ev.preventDefault(); onClick(); });
        return b;
    }

    // Barra "Nueva entrada" sobre el feed.
    function mountFeedControls(contenedor) {
        if (!isOwner() || !contenedor || contenedor.querySelector(".admin-bar")) return;
        const barra = document.createElement("div");
        barra.className = "admin-bar";
        barra.appendChild(boton(t("admin.newPost"), "admin-primary", () => openEditor("Posts", null)));
        contenedor.prepend(barra);
    }

    // Editar / borrar sobre una tarjeta de post del feed.
    function mountPostControls(tarjeta, post) {
        if (!isOwner()) return;
        const barra = document.createElement("div");
        barra.className = "admin-inline";
        barra.appendChild(boton(t("admin.edit"), "", () => openEditor("Posts", post)));
        if (!post.Publicado) {
            const tag = document.createElement("span");
            tag.className = "admin-tag";
            tag.textContent = t("admin.draft");
            barra.appendChild(tag);
        }
        tarjeta.appendChild(barra);
    }

    // Ocultar / borrar un comentario.
    function mountCommentControls(li, comentario, alCambiar) {
        if (!isOwner()) return;
        const barra = document.createElement("div");
        barra.className = "admin-inline";

        barra.appendChild(boton(t("admin.hide"), "", async () => {
            await window.Api.admin({ accion: "actualizar", tabla: "Comentarios",
                                     filaId: comentario.ID, campos: { Aprobado: false } });
            alCambiar();
        }));
        barra.appendChild(boton(t("admin.delete"), "admin-danger", async () => {
            if (!confirm(t("admin.confirmDelete"))) return;
            await window.Api.admin({ accion: "borrar", tabla: "Comentarios", filaId: comentario.ID });
            alCambiar();
        }));

        li.appendChild(barra);
    }

    // Editar el proyecto, juego o puesto que se esta viendo.
    function mountEntityControls(contenedor, schemaKey, fila) {
        if (!isOwner() || !contenedor) return;
        const barra = document.createElement("div");
        barra.className = "admin-bar";
        barra.appendChild(boton(t("admin.edit"), "admin-primary", () => openEditor(schemaKey, fila)));
        barra.appendChild(boton(t("admin.newPost"), "", () => openEditor("Posts", {
            [schemaKey === "ProyectosJuegos" ? "Juego" : "Proyecto"]: fila.ID
        })));
        contenedor.prepend(barra);
    }

    window.Admin = {
        resolveOwner, isOwner, openEditor,
        mountFeedControls, mountPostControls, mountCommentControls, mountEntityControls
    };

    window.addEventListener("DOMContentLoaded", () => {
        // Si resulta owner, se repinta para que aparezcan los controles.
        resolveOwner().then(esOwner => { if (esOwner) window.Router.resolve(); });
    });

    // Al cambiar la sesion hay que volver a preguntar si es owner.
    document.addEventListener("auth:changed", () => {
        owner = null;
        resolveOwner().then(() => window.Router.resolve());
    });
})();
