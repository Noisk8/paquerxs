import { createHash } from 'crypto';
import { readCsv, parseNumber, parseDate, normalizeName } from './lib/csv.ts';
import { createPaca, ensureColectivo, getPacaBySourceId } from '../src/lib/db.ts';

const filePath = process.argv[2] || './data/Base de datos Digestario - Respuestas de formulario 1.csv';

const headers: Record<string, number> = {};

function col(row: string[], name: string): string {
  const idx = headers[name];
  return idx === undefined ? '' : row[idx] || '';
}

function parseDateTime(value: string): string | null {
  if (!value || value.trim() === '') return null;
  const [datePart, timePart] = value.trim().split(' ');
  const date = parseDate(datePart);
  if (!date) return null;
  if (!timePart) return `${date} 00:00:00`;
  const [h, m, s] = timePart.split(':').map((p) => p.padStart(2, '0'));
  return `${date} ${h || '00'}:${m || '00'}:${s || '00'}`;
}

function formatHour(value: string): string {
  const [datePart, timePart] = value.trim().split(' ');
  if (!timePart) return '';
  const [h, m] = timePart.split(':');
  return `${h || '00'}:${m || '00'}`;
}

function buildSourceId(marca: string, fecha: string, peso: string, colectivo: string): string {
  const raw = `form|${normalizeName(marca)}|${parseDate(fecha) || ''}|${parseNumber(peso)}|${normalizeName(colectivo)}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

async function main() {
  const rows = readCsv(filePath);
  if (rows.length === 0) {
    console.error('CSV vacío');
    process.exit(1);
  }

  rows[0].forEach((h, i) => {
    headers[h.trim()] = i;
  });

  const required = ['Marca temporal', 'Fecha', 'Peso en kg', 'Colectivo'];
  for (const r of required) {
    if (headers[r] === undefined) {
      console.error(`Columna requerida no encontrada: ${r}`);
      process.exit(1);
    }
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const colectivo = normalizeName(col(row, 'Colectivo'));
    const fechaRaw = col(row, 'Fecha');
    const pesoRaw = col(row, 'Peso en kg');
    const marcaRaw = col(row, 'Marca temporal');

    if (!colectivo || !fechaRaw || !pesoRaw) {
      skipped++;
      continue;
    }

    const fecha = parseDate(fechaRaw);
    if (!fecha) {
      console.warn(`Fecha inválida en fila ${i + 1}: ${fechaRaw}`);
      errors++;
      continue;
    }

    const peso = parseNumber(pesoRaw);
    if (peso === null || peso < 0) {
      console.warn(`Peso inválido en fila ${i + 1}: ${pesoRaw}`);
      errors++;
      continue;
    }

    const sourceId = buildSourceId(marcaRaw, fechaRaw, pesoRaw, colectivo);
    const existing = await getPacaBySourceId(sourceId);
    if (existing) {
      skipped++;
      continue;
    }

    const colectivoId = await ensureColectivo(colectivo);
    const hora = formatHour(marcaRaw);
    const nombre = hora ? `Paca ${colectivo} ${fecha} ${hora}` : `Paca ${colectivo} ${fecha}`;

    await createPaca({
      nombre,
      colectivo,
      colectivo_id: colectivoId,
      peso,
      fecha_inicio: fecha,
      coordenadas_lat: null,
      coordenadas_lng: null,
      participantes: null,
      informacion: null,
      source_id: sourceId,
    });

    created++;
  }

  console.log(`Pacas importadas: ${created} creadas, ${skipped} omitidas, ${errors} errores`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
