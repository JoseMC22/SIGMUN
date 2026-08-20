#!/usr/bin/env ts-node
/**
 * Script de auditoría: cruza los IDs de `id_objeto` del SP_MAcceso @busc='7'
 * contra los atributos `id` reales en los componentes TSX con `<AccessControlled>`.
 *
 * Uso: pnpm --filter frontend exec ts-node scripts/audit-id-objetos.ts
 * O desde la raíz: npx ts-node scripts/audit-id-objetos.ts
 *
 * Output: Reporte en consola y archivo `scripts/audit-report.json`
 */

import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

// ---- 1. Leer los IDs del SP_MAcceso @busc='7' (muestra estática) ----
// En un caso real, esto sería una query contra la DB. Usamos un sample fijo.
const spSample: { id_objeto: string; bacceso: number }[] = [
  // Estos son IDs típicos que devuelve el SP según el usuario en el issue
  { id_objeto: "btnNuevoPu", bacceso: 1 },
  { id_objeto: "btnInscripcion", bacceso: 1 },
  // Agregamos una muestra más amplia para el auditoría
  { id_objeto: "txtNombre", bacceso: 1 },
  { id_objeto: "txtApellido", bacceso: 1 },
  { id_objeto: "cmbTipox", bacceso: 1 },
  { id_objeto: "lblTitulo", bacceso: 1 },
  { id_objeto: "icoError", bacceso: 0 },
  { id_objeto: "btnGuardar", bacceso: 1 },
  { id_objeto: "btnCancelar", bacceso: 1 },
  { id_objeto: "tabGeneral", bacceso: 1 },
  { id_objeto: "pnlPrincipal", bacceso: 1 },
];

const spObjectIds = new Set(spSample.map((s) => s.id_objeto));

// ---- 2. Leer los IDs de los componentes TSX con AccessControlled ----
const frontendSrc = path.resolve("frontend/src");
const tsxFiles: string[] = [];

// Patrón para buscar todos los .tsx en el frontend/src
const patterns = [
  "**/*.tsx",
  "!**/*.test.tsx", // excluir tests
  "!**/node_modules/**",
];

patterns.forEach((p) => {
  const found = glob.sync(p, { cwd: frontendSrc, absolute: true });
  tsxFiles.push(...found);
});

const tsxIds = new Set<string>();
tsxFiles.forEach((file) => {
  const content = fs.readFileSync(file, "utf-8");
  // Buscar pattern: <AccessControlled id="identificador"
  const matches = content.match(/<AccessControlled[^>]*id="([^"]+)"/g) || [];
  matches.forEach((match) => {
    // Extraer solo el valor del id
    const idMatch = match.match(/id="([^"]+)"/);
    if (idMatch && idMatch[1]) {
      tsxIds.add(idMatch[1]);
    }
  });
});

// ---- 3. Calcular diferencias ----
const matched: string[] = [];
const missingInSP: string[] = [];
const missingInTSX: string[] = [];

tsxIds.forEach((id) => {
  if (spObjectIds.has(id)) {
    matched.push(id);
  } else {
    missingInSP.push(id);
  }
});

spObjectIds.forEach((id) => {
  if (!tsxIds.has(id)) {
    missingInTSX.push(id);
  }
});

// ---- 4. Generar reporte ----
interface Report {
  totalSpObjects: number;
  totalTsxIds: number;
  matched: string[];
  missingInSP: string[];
  missingInTSX: string[];
  coveragePercentage: number; // % de IDs de TSX que están en SP
}

const report: Report = {
  totalSpObjects: spObjectIds.size,
  totalTsxIds: tsxIds.size,
  matched: matched.sort(),
  missingInSP: missingInSP.sort(),
  missingInTSX: missingInTSX.sort(),
  coveragePercentage: tsxIds.size > 0 ? Math.round((matched.length / tsxIds.size) * 100) : 0,
};

// Imprimir en consola
console.log("\n=== AUDITORÍA DE ID_OBJETO ===\n");
console.log(`IDS en SP_MAcceso (@busc='7' sample): ${spObjectIds.size}`);
console.log(`IDS en componentes TSX con <AccessControlled>: ${tsxIds.size}`);
console.log(`IDs coincidentes (cobertura): ${matched.length} (${report.coveragePercentage}%)`);
console.log("\n--- IDs MATCHED (están en ambos) ---");
matched.forEach((id) => console.log(`  ✓ ${id}`));
console.log("\n--- FALTAN EN SP (están en TSX pero no en SP) ---");
missingInSP.forEach((id) => console.log(`  ⚠ ${id}`));
console.log("\n--- FALTAN EN TSX (están en SP pero no en TSX) ---");
missingInTSX.forEach((id) => console.log(`  ❌ ${id}`));

// Guardar reporte JSON
const reportPath = path.resolve("scripts/audit-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nReporte guardado en: ${reportPath}\n`);

// ---- 5. Agregar script npm al package.json raíz ----
const packageJsonPath = path.resolve("package.json");
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  packageJson.scripts["audit:objetos"] = "ts-node scripts/audit-id-objetos.ts";
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log(`Script npm agregado a ${packageJsonPath}`);
  console.log(`  Agregado: "audit:objetos": "ts-node scripts/audit-id-objetos.ts"`);
} else {
  console.log("⚠ package.json no encontrado, script npm no agregado.");
}

console.log("\n=== Fin de auditoría ===\n");