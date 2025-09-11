// script to read all IDL files from constants and generate types using codama
// currently disabled because it generates too many types
// also will fail and need to update variable names in idl json files for it to work
// uncomment, install packages, and add script back to package.json to use
// ----
// Keeping in repo for now. May be useful when migration to solanakit is completed.

// import { rootNodeFromAnchor } from "@codama/nodes-from-anchor";
// import { renderVisitor } from "@codama/renderers-js";
// import { createFromRoot } from "codama";
// import fs from "fs";
// import path from "path";

// const IDL_DIRS = ["constants/idl", "constants/idl_devnet"];
// const OUTPUT_DIR = "types/generated";

// // Find all IDL files
// const idlFiles: { name: string; path: string }[] = [];

// for (const dir of IDL_DIRS) {
//   if (fs.existsSync(dir)) {
//     const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
//     for (const file of files) {
//       idlFiles.push({
//         name: path.basename(file, ".json"),
//         path: path.join(dir, file),
//       });
//     }
//   }
// }

// // Generate types for each IDL
// for (const idlFile of idlFiles) {
//   console.log(`Generating types for ${idlFile.name}...`);

//   const anchorIdl = JSON.parse(fs.readFileSync(idlFile.path, "utf8"));
//   const codama = createFromRoot(rootNodeFromAnchor(anchorIdl));

//   // Include source directory in output path
//   const sourceDir = path.dirname(idlFile.path).replace("constants/", "");
//   const outputPath = path.join(OUTPUT_DIR, sourceDir, idlFile.name);

//   fs.mkdirSync(outputPath, { recursive: true });

//   const visitor = renderVisitor(outputPath);
//   codama.accept(visitor);

//   console.log(`✅ Generated ${sourceDir}/${idlFile.name}`);
// }

// console.log("Done!");
