async function fetchProjects() {
    const body = {
        "refs": { "Proyectos": "d8d01d42-5f77-44a3-920d-3e2011335442"},
        "query": {
            "from": "Proyectos",
            "select": ["Titulo", "Descripcion", "Tecnologias", "Organizacion", "LinkRepo", "Destacado"],
            "limit": 25
        }
    };

    const response = await fetch(PRAXSUITE_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${PRAXSUITE_PUBLIC_KEY}`,
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    const result = await response.json();
    console.log("Praxsuite response:", result);
    renderProjects(result);
}

function renderProjects(result) {
    const list = document.querySelector(".projects-list");
    if (!list) return;
    list.innerHTML = "";
    const rows = result?.data ?? [];
    if (rows.length === 0) {
        list.innerHTML = "<li>No hay datos disponibles.</li>";
        return;
    }
    rows.forEach((item, index) => {
        const li = document.createElement("li");
        li.classList.add("card");
        const div = document.createElement("div");
        div.classList.add("container");
        window.addCardHeading(div, item.Titulo);
        window.addCardField(div, "Descripcion", item.Descripcion);
        window.addCardField(div, "Tecnologias", item.Tecnologias);
        window.addCardField(div, "Organizacion", item.Organizacion);
        window.addCardLinkField(div, "LinkRepo", item.LinkRepo);
        if (item.Destacado) {
            li.classList.add("featured");
        }
        window.makeCardInteractive(li, {
            type: "Proyecto",
            title: item.Titulo,
            summary: item.Descripcion,
            story: item.Historia,
            repoUrl: item.LinkRepo,
            demoUrl: item.LinkDemo,
            image: item.Imagen,
            meta: [
                { label: "Tecnologias", value: item.Tecnologias },
                { label: "Organizacion", value: item.Organizacion },
                { label: "Destacado", value: item.Destacado ? "Si" : "" }
            ]
        });
        li.appendChild(div);
        list.appendChild(li);
    });
}

fetchProjects();
