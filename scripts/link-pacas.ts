import { linkPacasToColectivos } from '../src/lib/db.ts';

async function main() {
  const updated = await linkPacasToColectivos();
  console.log(`Pacas vinculadas a colectivos: ${updated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
