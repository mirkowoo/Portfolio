// Renderizador de Markdown minimo, sin dependencias externas.
//
// El contenido se escapa SIEMPRE antes de aplicar formato: los comentarios son
// texto de terceros y no puede inyectarse HTML desde ahi.
(function () {
    function escapeHtml(text) {
        return String(text ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function inline(text) {
        return text
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
                '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    }

    function parseRow(line) {
        return line.replace(/^\||\|$/g, "").split("|").map(cell => cell.trim());
    }

    function render(markdown) {
        const source = escapeHtml(markdown).replace(/\r\n/g, "\n");
        const lines = source.split("\n");
        const html = [];
        let index = 0;

        while (index < lines.length) {
            const line = lines[index];

            // Bloque de codigo con ```
            if (/^```/.test(line)) {
                const language = line.slice(3).trim();
                const buffer = [];
                index += 1;
                while (index < lines.length && !/^```/.test(lines[index])) {
                    buffer.push(lines[index]);
                    index += 1;
                }
                index += 1;
                const cls = language ? ` class="lang-${language}"` : "";
                html.push(`<pre${cls}><code>${buffer.join("\n")}</code></pre>`);
                continue;
            }

            // Tabla
            if (line.includes("|") && /^\s*\|?[-:\s|]+\|[-:\s|]+$/.test(lines[index + 1] || "")) {
                const headers = parseRow(line);
                index += 2;
                const body = [];
                while (index < lines.length && lines[index].includes("|")) {
                    body.push(parseRow(lines[index]));
                    index += 1;
                }
                const head = headers.map(cell => `<th>${inline(cell)}</th>`).join("");
                const rows = body
                    .map(cells => `<tr>${cells.map(cell => `<td>${inline(cell)}</td>`).join("")}</tr>`)
                    .join("");
                html.push(`<div class="md-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`);
                continue;
            }

            // Encabezados
            const heading = line.match(/^(#{1,4})\s+(.*)$/);
            if (heading) {
                const level = heading[1].length + 1;
                html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
                index += 1;
                continue;
            }

            // Separador
            if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
                html.push("<hr>");
                index += 1;
                continue;
            }

            // Cita
            if (/^&gt;\s?/.test(line)) {
                const buffer = [];
                while (index < lines.length && /^&gt;\s?/.test(lines[index])) {
                    buffer.push(lines[index].replace(/^&gt;\s?/, ""));
                    index += 1;
                }
                html.push(`<blockquote>${inline(buffer.join(" "))}</blockquote>`);
                continue;
            }

            // Lista de tareas o lista sin orden
            if (/^\s*[-*]\s+/.test(line)) {
                const items = [];
                while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
                    let item = lines[index].replace(/^\s*[-*]\s+/, "");
                    const task = item.match(/^\[( |x|X)\]\s+(.*)$/);
                    if (task) {
                        const checked = task[1].toLowerCase() === "x";
                        items.push(
                            `<li class="md-task"><input type="checkbox" disabled${checked ? " checked" : ""}> ${inline(task[2])}</li>`
                        );
                    } else {
                        items.push(`<li>${inline(item)}</li>`);
                    }
                    index += 1;
                }
                html.push(`<ul>${items.join("")}</ul>`);
                continue;
            }

            // Lista ordenada
            if (/^\s*\d+\.\s+/.test(line)) {
                const items = [];
                while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
                    items.push(`<li>${inline(lines[index].replace(/^\s*\d+\.\s+/, ""))}</li>`);
                    index += 1;
                }
                html.push(`<ol>${items.join("")}</ol>`);
                continue;
            }

            // Linea en blanco
            if (!line.trim()) {
                index += 1;
                continue;
            }

            // Parrafo
            const paragraph = [];
            while (index < lines.length && lines[index].trim() &&
                   !/^(```|#{1,4}\s|&gt;|\s*[-*]\s|\s*\d+\.\s)/.test(lines[index]) &&
                   !/^\s*(---|\*\*\*)\s*$/.test(lines[index])) {
                paragraph.push(lines[index]);
                index += 1;
            }
            if (paragraph.length) html.push(`<p>${inline(paragraph.join(" "))}</p>`);
        }

        return html.join("\n");
    }

    window.Markdown = { render, escapeHtml };
})();
