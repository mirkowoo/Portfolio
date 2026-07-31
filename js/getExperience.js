async function fetchExperiencia() {
    try {
        const rows = await window.Api.query("Experiencia", window.Api.tables.Experiencia, {
            select: ["Cargo", "CargoEN", "Empresa", "Periodo", "PeriodoEN",
                     "Descripcion", "DescripcionEN", "Imagen"],
            limit: 25
        });
        renderExperiencia(rows);
    } catch (error) {
        console.error("No se pudo cargar la experiencia", error);
        const list = document.querySelector(".experience-list");
        if (list) list.innerHTML = `<li>${window.I18n.t("list.loadError")}</li>`;
    }
}

function renderExperiencia(rows) {
    const list = document.querySelector(".experience-list");
    if (!list) return;
    list.innerHTML = "";

    if (!rows.length) {
        list.innerHTML = `<li>${window.I18n.t("list.empty")}</li>`;
        return;
    }

    rows.forEach(item => {
        const li = document.createElement("li");
        li.classList.add("card");

        const div = document.createElement("div");
        div.classList.add("container");

        const L = window.I18n.localized;
        const t = window.I18n.t;
        window.addCardHeading(div, L(item, "Cargo"));
        window.addCardField(div, t("field.Empresa"), item.Empresa);
        window.addCardField(div, t("field.Periodo"), L(item, "Periodo"));
        window.addCardField(div, t("field.Descripcion"), L(item, "Descripcion"));

        window.makeCardInteractive(li, {
            type: t("nav.experience"),
            title: L(item, "Cargo"),
            summary: L(item, "Descripcion"),
            story: L(item, "Historia"),
            image: item.Imagen,
            profileUrl: item.LinkPerfil,
            meta: [
                { label: t("field.Empresa"), value: item.Empresa },
                { label: t("field.Periodo"), value: L(item, "Periodo") }
            ]
        });

        li.appendChild(div);
        list.appendChild(li);
    });
}

window.addEventListener("DOMContentLoaded", fetchExperiencia);
window.I18n.onChange(fetchExperiencia);
