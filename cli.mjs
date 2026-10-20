import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LoadConfig, BuildManuals } from './src/Manuals.mjs';
const root = dirname(fileURLToPath(import.meta.url));
try {
 const args = process.argv.slice(2);
 if (args.some(_arg => !_arg.startsWith('--variants=') && _arg !== '--pdf')) throw new Error('Usage: npm run manuals -- [--variants=id,id] [--pdf]');
 const config = await LoadConfig(root);
 if (args.includes('--pdf')) config.features.pdf = true;
 const ids = args.find(_arg => _arg.startsWith('--variants='))?.slice(11).split(',');
 console.log((await BuildManuals(root, config, ids)).directory);
} catch (_error) { console.error(_error, _error.cause || ''); process.exitCode = 1; }
