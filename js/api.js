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

    // Unico punto de escritura del front.
    //
    // El navegador NO tiene credenciales de escritura: la clave publica es de solo
    // lectura. Las escrituras van a un Endpoint sync sin auth de API, y la
    // Automation detras valida el JWT con ValidateEndUserToken y escribe usando la
    // identidad verificada. El UsuarioId nunca sale de este payload, sale del token,
    // asi que no se puede comentar ni reaccionar en nombre de otro.
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
        authRequest,
        slugify,
        relationId,
        relationName,
        statusName,
        statusColor,
        tables: cfg.TABLES
    };
})();
