export function csvText(headers: string[], rows: string[][]) {
  const quote = (value: string) => {
    // Keep numeric signs intact, but prevent spreadsheet formula execution.
    const safe = /^[\s]*[=+@-]/.test(value) && !Number.isFinite(Number(value)) ? "'" + value : value;
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  return [headers, ...rows].map(r => r.map(quote).join(',')).join('\r\n');
}
export function downloadText(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type })), link = document.createElement('a');
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
