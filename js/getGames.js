async function fetchGames(){
    const body = {
        "refs": {"ProyectosJuegos": "e6aa8e45-f2b4-4c67-b7df-55950ceea771"},
        "query": {
            "from": "ProyectosJuegos",
            "select": ["Titulo", "DescripcionES","DescripcionEN", "Engine", "LinkJugar","LinkRepo"],
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

    if(!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    const result = await response.json();
    console.log("Praxsuite response:", result);
    renderGames(result);
}


function renderGames(result){
    const list = document.querySelector(".games-list");
    if(!list) return;
    list.innerHTML = "";

    const rows = result?.data ?? [];
    if(rows.length === 0){
        list.innerHTML = "<li>No hay datos disponibles.</li>";
        return;
    }
    rows.forEach((item, index) => {
        const descripcion = item.DescripcionES || item.DescripcionEN || item.Descripcion;
        const li = document.createElement("li");
        li.classList.add("card");
        const div = document.createElement("div");
        div.classList.add("container");
        window.addCardHeading(div, item.Titulo);
        window.addCardField(div, "Descripcion", descripcion);
        window.addCardField(div, "Engine", item.Engine);
        window.addCardLinkField(div, "LinkJugar", item.LinkJugar);
        window.addCardLinkField(div, "LinkRepo", item.LinkRepo);
        window.makeCardInteractive(li, {
            type: "Juego",
            title: item.Titulo,
            summary: descripcion,
            story: item.Historia,
            demoUrl: item.LinkJugar,
            repoUrl: item.LinkRepo,
            image: item.Imagen,
            meta: [
                { label: "Engine", value: item.Engine }
            ]
        });
        li.appendChild(div);
        list.appendChild(li);
    });
}

fetchGames();
