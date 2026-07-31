// Feed central, blogs dedicados por proyecto y vista de post individual.
(function () {
    const api = () => window.Api;
    const t = (key, vars) => window.I18n.t(key, vars);
    const L = (row, field) => window.I18n.localized(row, field);

    const cache = {
        posts: null,
        juegos: null,
        proyectos: null
    };

    const POST_FIELDS = [
        "ID", "Titulo", "TituloEN", "Slug", "Resumen", "ResumenEN",
        "Contenido", "ContenidoEN", "Fecha", "Tipo", "Version", "Etiquetas",
        "Publicado", "Destacado", "Juego", "Proyecto", "Portada"
    ];

    async function loadPosts() {
        if (cache.posts) return cache.posts;

        const rows = await api().query("Posts", api().tables.Posts, {
            select: POST_FIELDS,
            // El owner necesita ver los borradores para poder editarlos.
            where: window.Admin?.isOwner() ? [] : [{ field: "Publicado", op: "eq", value: true }],
            orderBy: [{ field: "Fecha", dir: "desc" }],
            limit: 100
        });

        cache.posts = rows.map(row => ({
            ...row,
            slug: row.Slug || api().slugify(row.Titulo),
            tipo: api().statusName(row.Tipo),
            color: api().statusColor(row.Tipo),
            juegoId: api().relationId(row.Juego),
            juegoNombre: api().relationName(row.Juego),
            proyectoId: api().relationId(row.Proyecto),
            proyectoNombre: api().relationName(row.Proyecto)
        }));

        return cache.posts;
    }

    async function loadJuegos() {
        if (cache.juegos) return cache.juegos;
        const rows = await api().query("ProyectosJuegos", api().tables.ProyectosJuegos, {
            select: ["ID", "Titulo", "TituloEN", "DescripcionES", "DescripcionEN", "Engine",
                     "LinkJugar", "LinkRepo", "Historia", "HistoriaEN", "Retos", "RetosEN",
                     "Aprendizajes", "AprendizajesEN", "Orden", "Imagen", "Galeria"],
            limit: 50
        });
        cache.juegos = rows
            .filter(row => (row.Titulo || "").trim())
            .map(row => ({ ...row, slug: api().slugify(row.Titulo), kind: "juego" }));
        return cache.juegos;
    }

    async function loadProyectos() {
        if (cache.proyectos) return cache.proyectos;
        const rows = await api().query("Proyectos", api().tables.Proyectos, {
            select: ["ID", "Titulo", "TituloEN", "Descripcion", "DescripcionEN", "Tecnologias",
                     "Organizacion", "OrganizacionEN", "LinkRepo", "LinkDemo", "Destacado",
                     "Historia", "HistoriaEN", "Retos", "RetosEN",
                     "Aprendizajes", "AprendizajesEN", "Orden", "Imagen", "Galeria"],
            limit: 50
        });
        cache.proyectos = rows
            .filter(row => (row.Titulo || "").trim())
            .map(row => ({ ...row, slug: api().slugify(row.Titulo), kind: "proyecto" }));
        return cache.proyectos;
    }

    function formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString(window.I18n.locale(),
            { year: "numeric", month: "long", day: "numeric" });
    }

    function ownerOf(post) {
        if (post.juegoId) return { kind: "juego", nombre: post.juegoNombre };
        if (post.proyectoId) return { kind: "proyecto", nombre: post.proyectoNombre };
        return null;
    }

    function tipoLabel(tipo) {
        return tipo ? t(`tipo.${tipo}`) : t("tipo.Nota");
    }

    function buildPostCard(post) {
        const item = document.createElement("li");
        item.className = "post-card";

        const esc = window.Markdown.escapeHtml;
        const owner = ownerOf(post);
        const ownerHtml = owner
            ? `<a class="post-owner" href="#/${owner.kind}/${api().slugify(owner.nombre)}">${esc(owner.nombre)}</a>`
            : `<span class="post-owner post-owner-general">${esc(t("post.portfolio"))}</span>`;

        item.innerHTML = `
            <div class="post-card-head">
                <span class="post-tipo" style="--tipo-color:${post.color}">${esc(tipoLabel(post.tipo))}</span>
                ${post.Version ? `<span class="post-version">${esc(post.Version)}</span>` : ""}
                ${ownerHtml}
                <time class="post-fecha">${formatDate(post.Fecha)}</time>
            </div>
            <h2 class="post-card-title"><a href="#/post/${post.slug}">${esc(L(post, "Titulo"))}</a></h2>
            <p class="post-card-summary">${esc(L(post, "Resumen"))}</p>
            <div class="post-card-foot">
                <a class="post-read" href="#/post/${post.slug}">${esc(t("post.read"))}</a>
                <span class="post-etiquetas">${esc(post.Etiquetas || "")}</span>
            </div>
        `;

        return item;
    }

    function renderFeed(list, posts, emptyMessage) {
        list.innerHTML = "";
        if (!posts.length) {
            const empty = document.createElement("li");
            empty.className = "post-empty";
            empty.textContent = emptyMessage;
            list.appendChild(empty);
            return;
        }
        posts.forEach(post => {
            const card = buildPostCard(post);
            window.Admin?.mountPostControls(card, post);
            list.appendChild(card);
        });
    }

    // ---------------------------------------------------------------- HOME
    async function showHome() {
        window.showPage("home");
        const list = document.querySelector("[data-feed]");
        const filters = document.querySelector("[data-feed-filters]");
        if (!list) return;

        list.innerHTML = `<li class="post-empty">${t("feed.loading")}</li>`;

        const posts = await loadPosts();
        const tipos = [...new Set(posts.map(p => p.tipo).filter(Boolean))];

        if (filters) {
            const previous = filters.querySelector(".feed-filter.is-active")?.dataset.tipo || "";
            filters.innerHTML = "";

            const makeFilter = (tipo, label) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "feed-filter" + (tipo === previous ? " is-active" : "");
                button.dataset.tipo = tipo;
                button.textContent = label;
                button.addEventListener("click", () => {
                    filters.querySelectorAll(".feed-filter")
                        .forEach(b => b.classList.toggle("is-active", b === button));
                    const filtered = tipo ? posts.filter(p => p.tipo === tipo) : posts;
                    renderFeed(list, filtered, t("feed.emptyFiltered"));
                });
                filters.appendChild(button);
                return button;
            };

            const all = makeFilter("", t("feed.all"));
            tipos.forEach(tipo => makeFilter(tipo, tipoLabel(tipo)));
            if (!filters.querySelector(".is-active")) all.classList.add("is-active");
        }

        const active = filters?.querySelector(".feed-filter.is-active")?.dataset.tipo || "";
        window.Admin?.mountFeedControls(document.querySelector("#home .content"));
        renderFeed(list, active ? posts.filter(p => p.tipo === active) : posts, t("feed.empty"));
    }

    // -------------------------------------------------------- BLOG DE PROYECTO
    async function showProjectBlog(kind, slug) {
        window.showPage("projectblog");

        const items = kind === "juego" ? await loadJuegos() : await loadProyectos();
        const subject = items.find(item => item.slug === slug);
        const root = document.querySelector("[data-project-blog]");
        if (!root) return;

        if (!subject) {
            root.innerHTML = `<p class="post-empty">${t("project.notFound")}</p>`;
            return;
        }

        const esc = window.Markdown.escapeHtml;
        // Sirve para ambas tablas: en Juegos resuelve DescripcionES/EN, en
        // Proyectos DescripcionEN o la columna base Descripcion.
        const descripcion = L(subject, "Descripcion");
        const meta = kind === "juego"
            ? [[t("field.Engine"), subject.Engine]]
            : [[t("field.Tecnologias"), subject.Tecnologias],
               [t("field.Organizacion"), L(subject, "Organizacion")]];

        const links = [
            [t("project.play"), subject.LinkJugar],
            [t("project.demo"), subject.LinkDemo],
            [t("project.repo"), subject.LinkRepo]
        ].filter(([, url]) => url);

        const galeria = api().fileEntries(subject.Galeria);
        const sections = ["Historia", "Retos", "Aprendizajes"]
            .map(key => ({ key, value: L(subject, key) }))
            .filter(section => section.value);

        root.innerHTML = `
            <header class="project-hero">
                <a class="project-back" href="#/${kind === "juego" ? "juegos" : "proyectos"}">${esc(t("project.back"))}</a>
                ${window.mediaHtml(subject.Imagen, L(subject, "Titulo"), "project-media")}
                <p class="project-kicker">${esc(kind === "juego" ? t("project.game") : t("project.project"))}</p>
                <h1>${esc(L(subject, "Titulo"))}</h1>
                <p class="project-summary">${esc(descripcion)}</p>
                <div class="project-meta">
                    ${meta.filter(([, v]) => v).map(([k, v]) =>
                        `<span><strong>${esc(k)}:</strong> ${esc(v)}</span>`).join("")}
                </div>
                <div class="project-links">
                    ${links.map(([label, url]) =>
                        `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`).join("")}
                </div>
            </header>

            <div class="project-sections">
                ${sections.map(section => `
                    <section class="project-section">
                        <h2>${esc(t(`field.${section.key}`))}</h2>
                        <div class="md">${window.Markdown.render(section.value)}</div>
                    </section>
                `).join("")}
            </div>

            ${galeria.length ? `
            <section class="project-section">
                <h2>${esc(t("project.gallery"))}</h2>
                <div class="galeria">
                    ${galeria.map(entry =>
                        window.mediaHtml([entry], entry.Name || "", "galeria-item")).join("")}
                </div>
            </section>` : ""}

            <section class="project-devlog">
                <h2>${esc(t("project.devlog"))}</h2>
                <ul class="post-feed" data-project-feed></ul>
            </section>
        `;

        window.Api.hydrateImages(root);

        window.Admin?.mountEntityControls(root,
            kind === "juego" ? "ProyectosJuegos" : "Proyectos", subject);

        const posts = await loadPosts();
        const own = posts.filter(post =>
            kind === "juego" ? post.juegoId === subject.ID : post.proyectoId === subject.ID);

        renderFeed(root.querySelector("[data-project-feed]"), own, t("project.devlogEmpty"));
    }

    // ------------------------------------------------------------- POST UNICO
    async function showPost(slug) {
        window.showPage("post");
        const root = document.querySelector("[data-post-view]");
        if (!root) return;

        root.innerHTML = `<p class="post-empty">${t("feed.loading")}</p>`;

        const posts = await loadPosts();
        const post = posts.find(item => item.slug === slug);
        const esc = window.Markdown.escapeHtml;

        if (!post) {
            root.innerHTML = `<p class="post-empty">${t("post.notFound")}
                <a href="#/">${t("post.backHome")}</a></p>`;
            return;
        }

        const owner = ownerOf(post);
        const backHref = owner ? `#/${owner.kind}/${api().slugify(owner.nombre)}` : "#/";
        const backLabel = owner ? t("post.backTo", { name: owner.nombre }) : t("post.backToFeed");
        const resumen = L(post, "Resumen");

        root.innerHTML = `
            <article class="post-article">
                <a class="project-back" href="${backHref}">${esc(backLabel)}</a>

                <header class="post-header">
                    <div class="post-card-head">
                        <span class="post-tipo" style="--tipo-color:${post.color}">${esc(tipoLabel(post.tipo))}</span>
                        ${post.Version ? `<span class="post-version">${esc(post.Version)}</span>` : ""}
                        <time class="post-fecha">${formatDate(post.Fecha)}</time>
                    </div>
                    <h1>${esc(L(post, "Titulo"))}</h1>
                    ${resumen ? `<p class="post-lead">${esc(resumen)}</p>` : ""}
                </header>

                ${api().firstFileId(post.Portada)
                    ? window.mediaHtml(post.Portada, L(post, "Titulo"), "post-media")
                    : ""}

                <div class="md post-body">${window.Markdown.render(L(post, "Contenido"))}</div>

                <div data-reactions></div>
                <div data-comments></div>
            </article>
        `;

        window.Api.hydrateImages(root);
        window.Interactions?.mount(root, post);
    }

    // ------------------------------------------------------------------ RUTAS
    window.Blog = {
        loadJuegos,
        loadProyectos,
        invalidatePosts: () => { cache.posts = null; },
        invalidateAll: () => { cache.posts = null; cache.juegos = null; cache.proyectos = null; }
    };

    window.Router.on("/", showHome);
    window.Router.on("/experiencia", () => window.showPage("experience"));
    window.Router.on("/juegos", () => window.showPage("games"));
    window.Router.on("/proyectos", () => window.showPage("projects"));
    window.Router.on("/juego/:slug", ({ slug }) => showProjectBlog("juego", slug));
    window.Router.on("/proyecto/:slug", ({ slug }) => showProjectBlog("proyecto", slug));
    window.Router.on("/post/:slug", ({ slug }) => showPost(slug));

    // Al cambiar de idioma se repinta la vista actual.
    window.I18n.onChange(() => window.Router.resolve());
})();
