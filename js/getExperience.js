async function fetchExperiencia() {
    const body = {
        refs: { Experiencia: "1984f121-6ad1-4ea2-9229-1e0ac55f88a4" },
        query: { from: "Experiencia", select: ["Cargo","Empresa","Periodo","Descripcion"], limit: 25 }
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
    renderExperiencia(result);
}


function renderExperiencia(result) {
    const list = document.querySelector(".experience-list");
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
        window.addCardHeading(div, item.Cargo);
        window.addCardField(div, "Empresa", item.Empresa);
        window.addCardField(div, "Periodo", item.Periodo);
        window.addCardField(div, "Descripcion", item.Descripcion);
        window.makeCardInteractive(li, {
            type: "Experiencia",
            title: item.Cargo,
            summary: item.Descripcion,
            story: item.Historia,
            image: item.Imagen,
            profileUrl: item.LinkPerfil,
            meta: [
                { label: "Empresa", value: item.Empresa },
                { label: "Periodo", value: item.Periodo }
            ]
        });
        li.appendChild(div);
        list.appendChild(li);
    });
}


fetchExperiencia();
