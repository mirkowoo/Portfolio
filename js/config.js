window.AppConfig = {
    PRAXSUITE_API_URL: "https://gateway.praxsuite.com/e0efff61-b451-46de-8dcf-e2fa8634d20a/query",
    PRAXSUITE_AUTH_URL: "https://gateway.praxsuite.com/e0efff61-b451-46de-8dcf-e2fa8634d20a/auth",
    // Endpoint de gestion (owner). La automation detras exige el rol owner
    // verificado desde el JWT; sin ese rol no escribe nada.
    PRAXSUITE_ADMIN_URL: "https://gateway.praxsuite.com/e0efff61-b451-46de-8dcf-e2fa8634d20a/endpoint/1a04e157-98ec-4646-b61b-084a969a6f93",
    // Endpoint sync para comentarios y reacciones. No lleva credencial: la
    // automation detras valida el JWT del usuario y escribe con esa identidad.
    PRAXSUITE_INTERACT_URL: "https://gateway.praxsuite.com/e0efff61-b451-46de-8dcf-e2fa8634d20a/endpoint/79f1b56a-4e90-4375-8037-4f1d7b0f038c",
    // Base de descarga de las columnas File. Ojo: exige cabecera Authorization,
    // asi que no sirve directo en un <img src>; ver Api.fileUrl.
    PRAXSUITE_FILES_URL: "https://gateway.praxsuite.com/api/v1/gateway/e0efff61-b451-46de-8dcf-e2fa8634d20a/files",
    PRAXSUITE_PUBLIC_KEY: "pk_live_22afd9439fb581330ae0da96079bf872e42b0264cbab694b633567b7e715ab24",
    TABLES: {
        Experiencia: "1984f121-6ad1-4ea2-9229-1e0ac55f88a4",
        Proyectos: "d8d01d42-5f77-44a3-920d-3e2011335442",
        ProyectosJuegos: "e6aa8e45-f2b4-4c67-b7df-55950ceea771",
        Posts: "ae16e832-0327-481c-81bc-93f14367721c",
        Comentarios: "18c9dc36-dc77-464b-9f01-10c8713994b9",
        Reacciones: "5383bd57-69a2-4f9d-bd87-4b0ed8de40d4"
    },
    REACCIONES: [
        { tipo: "like", emoji: "👍", label: "Me gusta" },
        { tipo: "fire", emoji: "🔥", label: "Buenísimo" },
        { tipo: "idea", emoji: "💡", label: "Buena idea" },
        { tipo: "wow", emoji: "🤯", label: "Wow" }
    ]
};

const PRAXSUITE_API_URL = window.AppConfig?.PRAXSUITE_API_URL;
const PRAXSUITE_PUBLIC_KEY = window.AppConfig?.PRAXSUITE_PUBLIC_KEY;
