async function fetchGames() {
    try {
        const juegos = await window.Blog.loadJuegos();
        renderGames(juegos);
    } catch (error) {
        console.error("No se pudieron cargar los juegos", error);
        const list = document.querySelector(".games-list");
        if (list) list.innerHTML = `<li>${window.I18n.t("list.loadError")}</li>`;
    }
}

function renderGames(juegos) {
    const list = document.querySelector(".games-list");
    if (!list) return;
    list.innerHTML = "";

    if (!juegos.length) {
        list.innerHTML = `<li>${window.I18n.t("list.empty")}</li>`;
        return;
    }

    juegos
        .slice()
        .sort((a, b) => (a.Orden ?? 99) - (b.Orden ?? 99))
        .forEach(item => {
            const descripcion = window.I18n.localized(item, "Descripcion");

            const li = document.createElement("li");
            li.classList.add("card");

            const div = document.createElement("div");
            div.classList.add("container");

            window.addCardHeading(div, window.I18n.localized(item, "Titulo"));
            window.addCardField(div, window.I18n.t("field.Descripcion"), descripcion);
            window.addCardField(div, window.I18n.t("field.Engine"), item.Engine);

            // Al hacer clic se abre el blog dedicado del juego, no un modal.
            window.makeCardNavigable(li, `/juego/${item.slug}`, window.I18n.localized(item, "Titulo"));

            li.appendChild(div);
            list.appendChild(li);
        });
}

window.addEventListener("DOMContentLoaded", fetchGames);
window.I18n.onChange(fetchGames);
