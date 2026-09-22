/**
 * Escapa un valor para CSV: envuelve en comillas y duplica comillas internas.
 */
function escapeCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * Construye un CSV a partir de un header y filas.
 * @param {string[]} headers
 * @param {Array<Array<string|number>>} rows
 * @returns {string}
 */
export function buildCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

/**
 * Descarga un CSV con BOM UTF-8 (para Excel) y lo dispara en el navegador.
 * @param {string} filename
 * @param {string} content
 */
export function downloadCsv(filename, content) {
  const blob = new Blob(['\uFEFF' + content], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Helper combinado: construye y descarga en un solo paso.
 */
export function exportToCsv(filename, headers, rows) {
  downloadCsv(filename, buildCsv(headers, rows));
}