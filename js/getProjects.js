async function fetchProjects() {
    try {
        const proyectos = await window.Blog.loadProyectos();
        renderProjects(proyectos);
    } catch (error) {
        console.error("No se pudieron cargar los proyectos", error);
        const list = document.querySelector(".projects-list");
        if (list) list.innerHTML = `<li>${window.I18n.t("list.loadError")}</li>`;
    }
}

function renderProjects(proyectos) {
    const list = document.querySelector(".projects-list");
    if (!list) return;
    list.innerHTML = "";

    if (!proyectos.length) {
        list.innerHTML = `<li>${window.I18n.t("list.empty")}</li>`;
        return;
    }

    proyectos
        .slice()
        .sort((a, b) => (a.Orden ?? 99) - (b.Orden ?? 99))
        .forEach(item => {
            const li = document.createElement("li");
            li.classList.add("card");
            if (item.Destacado) li.classList.add("featured");

            const div = document.createElement("div");
            div.classList.add("container");

            const L = window.I18n.localized;
            window.addCardHeading(div, L(item, "Titulo"));
            window.addCardField(div, window.I18n.t("field.Descripcion"), L(item, "Descripcion"));
            window.addCardField(div, window.I18n.t("field.Tecnologias"), item.Tecnologias);
            window.addCardField(div, window.I18n.t("field.Organizacion"), L(item, "Organizacion"));

            // Al hacer clic se abre el blog dedicado del proyecto, no un modal.
            window.makeCardNavigable(li, `/proyecto/${item.slug}`, L(item, "Titulo"));

            li.appendChild(div);
            list.appendChild(li);
        });
}

window.addEventListener("DOMContentLoaded", fetchProjects);
window.I18n.onChange(fetchProjects);
