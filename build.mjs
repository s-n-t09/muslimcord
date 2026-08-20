import { createHash } from "crypto";
import { extname } from "path";
import { mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import { rollup } from "rollup";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import swc from "@swc/core";
import esbuild from "rollup-plugin-esbuild";

const extensions = [".js", ".jsx", ".mjs", ".ts", ".tsx", ".cts", ".mts"];
const plugins = [
  nodeResolve(),
  commonjs(),
  {
    name: "swc-typescript-jsx",
    async transform(code, id) {
      const ext = extname(id);
      if (!extensions.includes(ext)) return null;
      const isTypeScript = ext.includes("ts");
      const result = await swc.transform(code, {
        filename: id,
        jsc: {
          externalHelpers: true,
          parser: {
            syntax: isTypeScript ? "typescript" : "ecmascript",
            tsx: isTypeScript ? ext.endsWith("x") : undefined,
            jsx: !isTypeScript ? ext.endsWith("x") : undefined,
          },
        },
        env: { targets: "defaults", include: ["transform-classes", "transform-arrow-functions"] },
      });
      return { code: result.code, map: null };
    },
  },
  esbuild({ minify: true }),
];

await rm("./dist", { recursive: true, force: true });
await mkdir("./dist", { recursive: true });
for (const pluginName of await readdir("./plugins")) {
  const manifestPath = `./plugins/${pluginName}/manifest.json`;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const outDir = `./dist/${pluginName}`;
  const outPath = `${outDir}/index.js`;
  await mkdir(outDir, { recursive: true });
  const bundle = await rollup({
    input: `./plugins/${pluginName}/${manifest.main}`,
    external: (id) => id.startsWith("@vendetta") || id === "react" || id === "react-native",
    onwarn: () => {},
    plugins,
  });
  await bundle.write({
    file: outPath,
    format: "iife",
    compact: true,
    exports: "named",
    globals(id) {
      if (id.startsWith("@vendetta")) return `window.vendetta.${id.slice(1).replace(new RegExp("/", "g"), ".")}`;
      if (id === "react") return "window.React";
      if (id === "react-native") return "window.ReactNative";
      return id;
    },
  });
  await bundle.close();
  const hash = createHash("sha256").update(await readFile(outPath)).digest("hex");
  const outputManifest = { ...manifest, main: "index.js", hash };
  await writeFile(`${outDir}/manifest.json`, JSON.stringify(outputManifest, null, 2));
  console.log(`Successfully built ${manifest.name} (${hash.slice(0, 12)})`);
}
