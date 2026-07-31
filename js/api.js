// Capa de acceso a Praxsuite.
//
// Lectura  -> POST /query con la clave publica pk_live_ (solo lectura).
// Auth     -> POST /auth/login y /auth/register, autorizados con la misma clave publica.
// Escritura-> POST a un Endpoint sync sin credencial; la Automation valida el JWT
//             del usuario y escribe con esa identidad (ver interact).
(function () {
    const cfg = window.AppConfig;

    function slugify(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    async function post(url, body, token) {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token || cfg.PRAXSUITE_PUBLIC_KEY}`
            },
            body: JSON.stringify(body)
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
            const message = payload?.message || `HTTP ${response.status} - ${response.statusText}`;
            const error = new Error(message);
            error.status = response.status;
            error.payload = payload;
            throw error;
        }

        return payload;
    }

    // Lectura publica.
    async function query(tableAlias, tableId, queryBody) {
        const result = await post(cfg.PRAXSUITE_API_URL, {
            refs: { [tableAlias]: tableId },
            query: { from: tableAlias, ...queryBody }
        });
        return result?.data ?? [];
    }

    function expiredError() {
        const error = new Error(window.I18n.t("auth.expired"));
        error.code = "TOKEN_EXPIRED";
        return error;
    }

    // El gateway devuelve la expiracion como texto de excepcion, no como codigo,
    // asi que hay que reconocerla por el mensaje (IDX10223 es el de Microsoft
    // IdentityModel para "lifetime validation failed").
    function looksExpired(message) {
        return /IDX10223|expired|lifetime validation/i.test(String(message || ""));
    }

    // Escrituras de visitantes (comentarios y reacciones).
    //
    // El navegador NO tiene credenciales de escritura: la clave publica es de solo
    // lectura. Va a un Endpoint sync sin auth de API, y la Automation detras valida
    // el JWT con ValidateEndUserToken y escribe con la identidad verificada. El
    // UsuarioId sale del token, nunca de este payload, asi que no se puede comentar
    // ni reaccionar en nombre de otro.
    async function interact(payload) {
        const token = window.Auth?.getToken();
        if (!token) throw new Error(window.I18n.t("auth.needSession"));

        // Si ya sabemos que vencio, ni siquiera se manda.
        if (window.Auth.isExpired()) throw expiredError();

        const response = await fetch(cfg.PRAXSUITE_INTERACT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, token })
        });

        const data = await response.json().catch(() => null);

        // El endpoint responde 200 con { error } cuando falla un paso interno,
        // asi que no alcanza con mirar response.ok.
        if (!response.ok || data?.error) {
            if (looksExpired(data?.error)) throw expiredError();
            throw new Error(data?.error || `HTTP ${response.status} - ${response.statusText}`);
        }

        return data;
    }

    // Escrituras de gestion (owner). Mismo patron que interact: el navegador no
    // lleva credencial, la automation valida el JWT y exige el rol owner. Si el
    // endpoint no esta configurado todavia, falla de forma reconocible para que
    // el modo owner simplemente no aparezca.
    async function admin(payload) {
        if (!cfg.PRAXSUITE_ADMIN_URL) {
            throw new Error("Admin endpoint no configurado.");
        }

        const token = window.Auth?.getToken();
        if (!token) throw new Error(window.I18n.t("auth.needSession"));
        if (window.Auth.isExpired()) throw expiredError();

        const response = await fetch(cfg.PRAXSUITE_ADMIN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, token })
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || data?.error) {
            if (looksExpired(data?.error)) throw expiredError();
            throw new Error(data?.error || `HTTP ${response.status} - ${response.statusText}`);
        }

        return data;
    }

    // ---------------------------------------------------------------- archivos
    //
    // Las columnas File vuelven como [{ Id, Name, Extension, DownloadUrl }], pero
    // esa URL responde 401 sin cabecera Authorization y un <img src> no puede
    // mandar cabeceras. Asi que se descarga con fetch (que si puede) y se expone
    // como object URL. Se cachea por id de blob para no re-descargar en cada
    // repintado (cambio de idioma, cambio de ruta).
    const objectUrls = new Map();

    function fileEntries(value) {
        return Array.isArray(value) ? value.filter(entry => entry?.Id) : [];
    }

    function firstFileId(value) {
        return fileEntries(value)[0]?.Id ?? null;
    }

    async function fileUrl(fileId) {
        if (!fileId) return null;
        if (objectUrls.has(fileId)) return objectUrls.get(fileId);

        try {
            const response = await fetch(`${cfg.PRAXSUITE_FILES_URL}/${fileId}`, {
                headers: { "Authorization": `Bearer ${cfg.PRAXSUITE_PUBLIC_KEY}` }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const url = URL.createObjectURL(await response.blob());
            objectUrls.set(fileId, url);
            return url;
        } catch (error) {
            console.warn("no se pudo cargar el archivo", fileId, error.message);
            objectUrls.set(fileId, null);
            return null;
        }
    }

    // Rellena las <img data-file="<id>"> que haya bajo root. Si un archivo no
    // carga, marca su contenedor para que el CSS muestre el placeholder.
    async function hydrateImages(root) {
        const pendientes = [...(root || document).querySelectorAll("img[data-file]:not([data-hydrated])")];
        await Promise.all(pendientes.map(async img => {
            img.dataset.hydrated = "1";
            const url = await fileUrl(img.dataset.file);
            if (url) img.src = url;
            else img.closest(".media")?.classList.add("is-empty");
        }));
    }

    async function authRequest(path, body) {
        return post(`${cfg.PRAXSUITE_AUTH_URL}/${path}`, body);
    }

    // Las columnas de relacion vuelven como [{ Id, Record }]; las de tipo Status
    // como { Id, Name, Color }. Estos helpers normalizan ambas formas.
    function relationId(value) {
        if (Array.isArray(value)) return value[0]?.Id ?? null;
        return value?.Id ?? (typeof value === "string" ? value : null);
    }

    function relationName(value) {
        if (Array.isArray(value)) return value[0]?.Record ?? null;
        return value?.Record ?? null;
    }

    function statusName(value) {
        if (value && typeof value === "object") return value.Name ?? null;
        return value ?? null;
    }

    function statusColor(value) {
        if (value && typeof value === "object" && value.Color) return `#${value.Color}`;
        return "var(--color-muted)";
    }

    window.Api = {
        query,
        interact,
        admin,
        fileEntries,
        firstFileId,
        fileUrl,
        hydrateImages,
        authRequest,
        slugify,
        relationId,
        relationName,
        statusName,
        statusColor,
        tables: cfg.TABLES
    };
})();
