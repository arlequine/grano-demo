// Convierte docs/catalogo.csv al formato de src/data/catalog.json.

export type CatalogProduct = {
  id: string;
  name: string;
  region: string;
  process: string;
  roast: string;
  notes: string[];
  priceCents: number;
  grams: number;
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function catalogFromCsv(csv: string): CatalogProduct[] {
  const [header, ...rows] = csv.split(/\r?\n/).filter((line) => line.trim() !== '');
  const columns = parseCsvLine(header);
  return rows.map((row) => {
    const values = parseCsvLine(row);
    const record = Object.fromEntries(columns.map((column, i) => [column, values[i] ?? '']));
    return {
      id: slugify(record.nombre),
      name: record.nombre,
      region: record.region,
      process: record.proceso,
      roast: record.tueste,
      notes: record.notas.split(';').map((note) => note.trim()).filter(Boolean),
      priceCents: Math.round(Number(record.precio_mxn) * 100),
      grams: Number(record.gramos),
    };
  });
}
