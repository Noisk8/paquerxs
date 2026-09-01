import { readCsv, parseNumber, parseInteger, parseDate, normalizeName } from './lib/csv.ts';
import { createColectivo, getColectivoByName } from '../src/lib/db.ts';
import type { Colectivo } from '../src/lib/types.ts';

const filePath = process.argv[2] || './data/Base de datos Digestario - Colectivos.csv';

const headers: Record<string, number> = {};

function col(row: string[], name: string): string {
  const idx = headers[name];
  return idx === undefined ? '' : row[idx] || '';
}

function buildColectivo(row: string[]): Omit<Colectivo, 'id' | 'created_at' | 'updated_at'> {
  return {
    nombre: normalizeName(col(row, 'Colectivo')),
    tipo: col(row, 'Tipo') || null,
    tecnica: col(row, 'Tecnica') || null,
    localidad: col(row, 'Localidad / municipio') || null,
    ciudad: col(row, 'Ciudad') || null,
    departamento: col(row, 'Departamento') || null,
    red_social: col(row, 'Link red social') || null,
    horario: col(row, 'Horario de trabajo') || null,
    alcance: parseInteger(col(row, 'Alcance personas/colectivo')),
    organicos_kg: parseNumber(col(row, 'Orgánicos Kg')),
    organicos_secos_kg: parseNumber(col(row, 'Orgánicos secos Kg')),
    total_organicos_kg: parseNumber(col(row, 'Total orgánicos Kg')),
    organicos_procesados_t: parseNumber(col(row, 'Orgánicos procesados t')),
    metano_evitado_t: parseNumber(col(row, 'Metano evitado t')),
    co2e_evitado_t: parseNumber(col(row, 'CO2e evitado t (VERs)')),
    abono_producido_t: parseNumber(col(row, 'Abono producido t')),
    humedad: parseNumber(col(row, 'Humedad L/t')),
    ph: parseNumber(col(row, 'pH')),
    conductividad: parseNumber(col(row, 'Conductividad dS/m')),
    retencion_humedad: parseNumber(col(row, '% retención de humedad')),
    cenizas_kg_t: parseNumber(col(row, 'Cenizas Kg/t')),
    perdidas_volatizacion_kg_t: parseNumber(col(row, 'Perdidas por volatización Kg/t')),
    cationico_cic: parseNumber(col(row, 'Cap inter catiónico-CIC cmol/kg')),
    densidad: parseNumber(col(row, 'Densidad g/cm³')),
    carbono_organico_kg_t: parseNumber(col(row, 'Carbono orgánico Kg/t')),
    relacion_c_n: col(row, 'Relación Carbono/Nitógeno') || null,
    nitrogeno_kg_t: parseNumber(col(row, 'Nitrógeno Kg/t')),
    primer_registro: parseDate(col(row, 'Primer registro')),
    ultimo_registro: parseDate(col(row, 'Último registro')),
  };
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

  const required = ['Colectivo'];
  for (const r of required) {
    if (headers[r] === undefined) {
      console.error(`Columna requerida no encontrada: ${r}`);
      process.exit(1);
    }
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nombre = normalizeName(col(row, 'Colectivo'));
    if (!nombre) {
      skipped++;
      continue;
    }

    const existing = await getColectivoByName(nombre);
    const data = buildColectivo(row);

    if (existing?.id) {
      // Sobrescribir datos existentes con la información del CSV
      const { updateColectivo } = await import('../src/lib/db.ts');
      await updateColectivo(existing.id, data);
      updated++;
    } else {
      await createColectivo(data);
      created++;
    }
  }

  console.log(`Colectivos importados: ${created} creados, ${updated} actualizados, ${skipped} omitidos`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
