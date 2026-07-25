// Reacciones y comentarios de un post.
//
// Lectura: clave publica de solo lectura. Escritura: Api.interact -> Endpoint sync.
// Los comentarios entran con Aprobado=false y solo se muestran una vez aprobados.
(function () {
    const api = () => window.Api;
    const t = (key, vars) => window.I18n.t(key, vars);

    // Pinta un error en un contenedor. Si la sesion vencio agrega un boton para
    // volver a entrar, en vez de dejar al usuario con un mensaje sin salida.
    function showError(box, error) {
        box.innerHTML = "";
        box.hidden = false;

        const text = document.createElement("span");
        text.textContent = error?.message || t("comments.failed");
        box.appendChild(text);

        if (error?.code !== "TOKEN_EXPIRED") return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "auth-relogin";
        button.textContent = t("auth.signInAgain");
        button.addEventListener("click", () => {
            window.Auth.logout();
            window.AuthUI.open("login");
        });
        box.appendChild(button);
    }

    function formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString(window.I18n.locale(), {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    }

    // ------------------------------------------------------------ REACCIONES
    async function fetchReacciones(postId) {
        return api().query("Reacciones", api().tables.Reacciones, {
            select: ["ID", "Tipo", "UsuarioId", "Post"],
            limit: 500
        }).then(rows => rows.filter(row => api().relationId(row.Post) === postId));
    }

    async function renderReacciones(container, post) {
        const rows = await fetchReacciones(post.ID);
        const userId = window.Auth.getUser()?.id || null;

        const counts = {};
        const mine = {};
        rows.forEach(row => {
            const tipo = api().statusName(row.Tipo);
            if (!tipo) return;
            counts[tipo] = (counts[tipo] || 0) + 1;
            if (userId && row.UsuarioId === userId) mine[tipo] = row.ID;
        });

        container.innerHTML = `<div class="reacciones"></div>`;
        const bar = container.querySelector(".reacciones");

        window.AppConfig.REACCIONES.forEach(({ tipo, emoji, label }) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "reaccion" + (mine[tipo] ? " is-mine" : "");
            button.title = t(`reaction.${tipo}`);
            button.innerHTML = `<span class="reaccion-emoji">${emoji}</span><span class="reaccion-count">${counts[tipo] || 0}</span>`;

            button.addEventListener("click", async () => {
                if (!window.Auth.isLoggedIn()) {
                    window.AuthUI.open("login");
                    return;
                }

                button.disabled = true;
                try {
                    // El UsuarioId lo pone la automation desde el token; aca solo
                    // se dice que reaccion es y sobre que post.
                    await api().interact(mine[tipo]
                        ? { accion: "reaccion_del", postId: post.ID, tipo }
                        : {
                            accion: "reaccion_add",
                            postId: post.ID,
                            tipo,
                            clave: `${post.slug}:${tipo}`,
                            fecha: new Date().toISOString()
                        });
                    await renderReacciones(container, post);
                } catch (error) {
                    console.error("reaccion", error);
                    button.disabled = false;
                    let box = container.querySelector("[data-reaction-error]");
                    if (!box) {
                        box = document.createElement("p");
                        box.className = "auth-error";
                        box.setAttribute("data-reaction-error", "");
                        container.appendChild(box);
                    }
                    showError(box, error);
                }
            });

            bar.appendChild(button);
        });
    }

    // ----------------------------------------------------------- COMENTARIOS
    async function fetchComentarios(postId) {
        const rows = await api().query("Comentarios", api().tables.Comentarios, {
            select: ["ID", "Autor", "Contenido", "Fecha", "Aprobado", "Post"],
            orderBy: [{ field: "Fecha", dir: "asc" }],
            limit: 200
        });
        // La automation manda Aprobado como string "true" y lo convierte el ORM,
        // asi que no se asume que vuelva como booleano.
        const aprobado = value => value === true || value === "true";
        return rows.filter(row => api().relationId(row.Post) === postId && aprobado(row.Aprobado));
    }

    async function renderComentarios(container, post) {
        const rows = await fetchComentarios(post.ID);

        const listHtml = rows.length
            ? rows.map(row => `
                <li class="comentario">
                    <div class="comentario-head">
                        <strong>${window.Markdown.escapeHtml(row.Autor || t("comments.anon"))}</strong>
                        <time>${formatDate(row.Fecha)}</time>
                    </div>
                    <p>${window.Markdown.escapeHtml(row.Contenido || "")}</p>
                </li>`).join("")
            : `<li class="post-empty">${t("comments.empty")}</li>`;

        const formHtml = window.Auth.isLoggedIn()
            ? `
                <form class="comentario-form" data-comment-form>
                    <label class="auth-field">
                        <span>${window.Markdown.escapeHtml(t("comments.as", { name: window.Auth.displayName() }))}</span>
                        <textarea name="contenido" rows="4" required
                            placeholder="${t("comments.placeholder")}"></textarea>
                    </label>
                    <p class="auth-error" data-comment-error hidden></p>
                    <button type="submit">${t("comments.submit")}</button>
                </form>`
            : `
                <div class="comentario-login">
                    <p>${t("comments.loginPrompt")}</p>
                    <button type="button" data-open-login>${t("comments.loginButton")}</button>
                </div>`;

        container.innerHTML = `
            <section class="comentarios">
                <h2>${t("comments.title")}</h2>
                <ul class="comentario-list">${listHtml}</ul>
                ${formHtml}
            </section>
        `;

        container.querySelector("[data-open-login]")
            ?.addEventListener("click", () => window.AuthUI.open("login"));

        const form = container.querySelector("[data-comment-form]");
        form?.addEventListener("submit", async event => {
            event.preventDefault();
            const button = form.querySelector("button[type=submit]");
            const errorBox = form.querySelector("[data-comment-error]");
            const contenido = form.contenido.value.trim();
            if (!contenido) return;

            button.disabled = true;
            errorBox.hidden = true;

            try {
                // Aprobado, UsuarioId y UsuarioEmail los fija la automation, no
                // el navegador. Hoy aprueba automaticamente; poner Aprobado en
                // false desde el portal sigue ocultando un comentario.
                await api().interact({
                    accion: "comentario",
                    postId: post.ID,
                    autor: window.Auth.displayName(),
                    contenido,
                    fecha: new Date().toISOString()
                });

                form.reset();
                // Se aprueba solo, asi que el comentario ya deberia estar visible.
                await renderComentarios(container, post);
                const list = container.querySelector(".comentario-list");
                list?.insertAdjacentHTML("afterend",
                    `<p class="comentario-ok">${t("comments.sent")}</p>`);
            } catch (error) {
                console.error("No se pudo enviar el comentario", error);
                showError(errorBox, error);
            } finally {
                button.disabled = false;
            }
        });
    }

    async function mount(root, post) {
        const reacciones = root.querySelector("[data-reactions]");
        const comentarios = root.querySelector("[data-comments]");
        if (!reacciones || !comentarios) return;

        const refresh = async () => {
            await Promise.all([
                renderReacciones(reacciones, post),
                renderComentarios(comentarios, post)
            ]);
        };

        await refresh();

        // Si el usuario entra o sale mientras lee el post, se repinta.
        const handler = () => refresh();
        document.addEventListener("auth:changed", handler);
        root.addEventListener("blog:unmount", () => {
            document.removeEventListener("auth:changed", handler);
        }, { once: true });
    }

    window.Interactions = { mount };
})();
