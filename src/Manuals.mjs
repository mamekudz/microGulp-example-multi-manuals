import { GetVersionString } from '../tools/RecipeRelease.mjs';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import Docx from 'docx-templates';
import { ExportPdf } from './Office.mjs';

export const CANONICAL_TEMPLATE = '../µGulp_LibreOffice_Word_Demo_Manual.src.docx';
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const VERSION = /^\d+\.\d+\.\d+$/;
export function CompareVersions(_left, _right) {
 if (!VERSION.test(_left) || !VERSION.test(_right)) throw new Error('Use major.minor.patch versions.');
 const left = _left.split('.').map(Number), right = _right.split('.').map(Number);
 for (let index = 0; index < 3; index++) {
  if (!Number.isSafeInteger(left[index]) || !Number.isSafeInteger(right[index])) throw new Error('Version component too large.');
  if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
 }
 return 0;
}
export function ValidateConfig(_config) {
 if (!_config || _config.schemaVersion !== 1 || !Array.isArray(_config.variants) || !_config.variants.length || typeof _config.features?.pdf !== 'boolean') throw new Error('Invalid manuals configuration.');
 const ids = new Set();
 if (Object.keys(_config).some(_key => !['schemaVersion', 'features', 'variants'].includes(_key)) || Object.keys(_config.features).some(_key => _key !== 'pdf')) throw new Error('Unknown configuration property.');
 for (const variant of _config.variants) {
  if (!variant || Object.keys(variant).some(_key => !['id', 'client', 'clientName', 'platform', 'version', 'template'].includes(_key))) throw new Error('Unknown variant property.');
  if (!ID.test(variant.id || '') || ids.has(variant.id) || !['MyClientCompanyA', 'MyClientCompanyB'].includes(variant.client)
   || !['Windows', 'MacOS'].includes(variant.platform) || typeof variant.clientName !== 'string' || !variant.clientName.trim()
   || typeof variant.template !== 'string' || (variant.template !== CANONICAL_TEMPLATE && !/^fixtures\/[A-Za-z0-9_.-]+\.docx$/.test(variant.template))) throw new Error('Invalid or duplicate manual variant.');
  CompareVersions(variant.version, '0.0.0');
  ids.add(variant.id);
 }
 return _config;
}
export function BuildData(_variant) {
 let appendix = 0;
 return {
  CLIENT: _variant.client, CLIENT_STR: _variant.clientName, PLATFORM: _variant.platform,
  VERSION: _variant.version, IS_MANUAL: true,
  AppendixReset: () => { appendix = 0; return ''; },
  AppendixNext: () => String.fromCharCode(65 + appendix++),
  VERSION_AT_LEAST: _version => CompareVersions(_variant.version, _version) >= 0,
 };
}
export async function LoadConfig(_root, _name = 'manuals.json') {
 return ValidateConfig(JSON.parse(await readFile(resolve(_root, _name), 'utf8')));
}
export async function BuildManuals(_root, _config, _ids = _config.variants.map(_variant => _variant.id)) {
 ValidateConfig(_config);
 if (!Array.isArray(_ids) || !_ids.length || new Set(_ids).size !== _ids.length || _ids.some(_id => !_config.variants.some(_variant => _variant.id === _id))) throw new Error('Select known, unique variants.');
 const root = await realpath(_root);
 const selected = _config.variants.filter(_variant => _ids.includes(_variant.id));
 const templates = new Map();
 for (const variant of selected) {
  const path = await realpath(resolve(root, variant.template));
  const rel = relative(root, path);
  const canonical = variant.template === CANONICAL_TEMPLATE && path === resolve(root, CANONICAL_TEMPLATE);
  if (!canonical && (rel.startsWith('..') || isAbsolute(rel))) throw new Error('Template escapes project.');
  templates.set(variant.id, await readFile(path));
 }
 const output = join(root, 'dist');
 await mkdir(output, { recursive: true });
 if (await realpath(output) !== output) throw new Error('Output directory must not be a symlink.');
 const run = join(output, randomUUID());
 await mkdir(run);
 const manifest = { schemaVersion: 1, recipeVersion: GetVersionString(), startedAt: new Date().toISOString(), status: 'running', documents: [] };
 async function Save() { await writeFile(join(run, 'manifest.json'), JSON.stringify(manifest, null, 2)); }
 await Save();
 try {
  for (const variant of selected) {
   const template = templates.get(variant.id);
   const buffer = await Docx.createReport({ template, data: BuildData(variant), cmdDelimiter: '+++', rejectNullish: true, failFast: true });
   const file = join(run, variant.id + '.docx');
   await writeFile(file, buffer, { flag: 'wx' });
   const record = { id: variant.id, version: variant.version, client: variant.client, platform: variant.platform, docx: variant.id + '.docx', templateSha256: createHash('sha256').update(template).digest('hex') };
   if (_config.features.pdf) record.pdf = await ExportPdf(file, { executable: process.env.LIBREOFFICE_PATH });
   record.sha256 = createHash('sha256').update(await readFile(file)).digest('hex');
   manifest.documents.push(record);
   await Save();
  }
  manifest.status = 'success';
  manifest.finishedAt = new Date().toISOString();
  await Save();
  return { directory: run, manifest };
 } catch (_error) {
  manifest.status = 'failed'; manifest.error = _error.message;
  await Save();
  throw new Error('Manual generation failed; inspect ' + join(run, 'manifest.json'), { cause: _error });
 }
}
