import { defineConfig, type Options } from 'tsup';
import { Plugin } from 'esbuild';
import fs from 'fs';

interface BundleOptions {
  dev?: boolean;
  node?: boolean;
}

function options({ dev, node }: BundleOptions): Options {
  const plugin: Plugin = {
    name: 'remove-console-warn',
    setup(build) {
      if (dev) return;
      const filter = /\.[jt]sx?$/;
      build.onLoad({ filter }, async (args) => {
        try {
          let source = await fs.promises.readFile(args.path, 'utf8');
          // Remove console.warn statements and replace const/var with let
          source = source.replace(/console\.warn\s*\(\s*(?:[^)(]|\([^)(]*\))*\)\s*;?/g, '').replace(/\b(var|const)\b/g, 'let');
          return {
            contents: source,
            loader: args.path.endsWith('.tsx') ? 'tsx' : args.path.endsWith('.jsx') ? 'jsx' : args.path.endsWith('.ts') ? 'ts' : 'js'
          };
        } catch (error) {
          return { errors: [{ text: `Failed to process ${args.path}: ${error}` }] };
        }
      });
    }
  };

  let outDir = 'dist';

  return {
    bundle: true,
    clean: true,
    entry: {
      [node ? 'van-reactive-element' : dev ? 'van-reactive-element.dev' : 'van-reactive-element']: 'src/index.ts'
    },
    outExtension({ format }) {
      return {
        js: format === 'iife' ? `.js` : format === 'esm' ? `.module.js` : `.cjs`
      };
    },
    external: [],
    format: node ? 'cjs' : ['esm', 'iife'],
    globalName: node ? undefined : 'vanRE',
    outDir,
    treeshake: true,
    minify: dev ? false : true,
    define: {
      __DEV__: dev ? 'true' : 'false',
      __TEST__: 'false'
    },
    platform: node ? 'node' : 'browser',
    target: node ? 'node16' : 'esnext',
    esbuildOptions(opts) {
      opts.mangleProps = !dev ? /^_/ : undefined;
    },
    esbuildPlugins: [plugin]
  };
}

export default defineConfig([
  // Dev build
  options({ dev: true }),

  // Prod build
  options({ dev: false }),

  // Node build
  options({ node: true })
]);
