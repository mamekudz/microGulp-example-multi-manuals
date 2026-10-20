import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { BuildManuals, ValidateConfig, CompareVersions } from '../src/Manuals.mjs';
import { ExportPdf } from '../src/Office.mjs';
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
async function Fixture() {
 const base = await mkdtemp(join(tmpdir(), 'microgulp-manuals-test-'));
 const root = join(base, 'project');
 await mkdir(root);
 await mkdir(join(root, 'fixtures'));
 await copyFile(join(ROOT, '../µGulp_LibreOffice_Word_Demo_Manual.src.docx'), join(root, '../µGulp_LibreOffice_Word_Demo_Manual.src.docx'));
 return { root, config: JSON.parse(await readFile(join(ROOT, 'manuals.json'), 'utf8')) };
}
async function Body(_path) {
 const zip = await JSZip.loadAsync(await readFile(_path));
 const xml = await zip.file('word/document.xml').async('string');
 // Cached TOC text is updated later by LibreOffice; inspect body paragraphs here.
 return xml.replace(/<w:sdt\b[\s\S]*?<\/w:sdt>/g, '').replace(/>\s+</g, '><').replace(/<[^>]+>/g, '');
}
test('numeric release comparison handles minor and patch versions', () => {
 assert.equal(CompareVersions('1.10.0', '1.5.0'), 1);
 assert.equal(CompareVersions('1.5.1', '1.5.0'), 1);
 assert.equal(CompareVersions('1.5.0', '1.5.0'), 0);
 assert.throws(() => CompareVersions('1.5-beta', '1.5.0'));
});
test('invalid variants and template traversal fail before creating output', async () => {
 const { root, config } = await Fixture();
 config.variants[0].template = '../private.docx';
 assert.throws(() => ValidateConfig(config));
 await assert.rejects(BuildManuals(root, config));
 assert.deepEqual(await readdir(root), ['fixtures']);
});
test('unknown and duplicate selections are rejected', async () => {
 const { root, config } = await Fixture();
 await assert.rejects(BuildManuals(root, config, ['unknown']));
 await assert.rejects(BuildManuals(root, config, [config.variants[0].id, config.variants[0].id]));
 assert.deepEqual(await readdir(root), ['fixtures']);
});
test('real DOCX template separates clients, platforms and releases', async () => {
 const { root, config } = await Fixture();
 const result = await BuildManuals(root, config);
 const a = await Body(join(result.directory, config.variants[0].id + '.docx'));
 const b = await Body(join(result.directory, config.variants[1].id + '.docx'));
 assert.match(a, /Company A/); assert.doesNotMatch(a, /Company B|For Mac users only|For Windows users only|New in Version 1.5|\+\+\+/);
 assert.match(b, /Company B/); assert.match(b, /For Mac users only/); assert.match(b, /New in Version 1.5/);
 assert.doesNotMatch(b, /For Windows users only|\+\+\+/);
 assert.equal(result.manifest.status, 'success');
 config.variants[1].platform = 'Windows'; config.variants[1].version = '1.10.0';
 const next = await BuildManuals(root, config, [config.variants[1].id]);
 const windows = await Body(join(next.directory, config.variants[1].id + '.docx'));
 assert.match(windows, /For Windows users only/); assert.doesNotMatch(windows, /For Mac users only/);
 assert.match(windows, /New in Version 1.5/);
 assert.notEqual(result.directory, next.directory);
 assert.equal(await Body(join(result.directory, config.variants[1].id + '.docx')), b);
});
test('missing Office executable fails instead of reporting PDF success', async () => {
 const { root, config } = await Fixture();
 const result = await BuildManuals(root, config, [config.variants[0].id]);
 await assert.rejects(ExportPdf(join(result.directory, config.variants[0].id + '.docx'), { executable: join(root, 'missing-office.exe') }));
});
