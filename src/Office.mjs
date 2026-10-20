import { mkdtemp, mkdir, writeFile, readFile, copyFile, stat } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

export async function ExportPdf(_docx, _options = {}) {
 const executable = _options.executable || (process.platform === 'win32' ? 'C:/Program Files/LibreOffice/program/soffice.com' : process.platform === 'darwin' ? '/Applications/LibreOffice.app/Contents/MacOS/soffice' : '/usr/bin/soffice');
 const profile = await mkdtemp(join(dirname(_docx), '.office-'));
 await _RunOffice(executable, profile, ['--terminate_after_init'], _options.timeoutMs);
 const basic = join(profile, 'user/basic');
 const library = join(basic, 'RecipeManuals');
 await mkdir(library, { recursive: true });
 await copyFile(fileURLToPath(new URL('../libreoffice/RecipeManuals.xba', import.meta.url)), join(library, 'RecipeManuals.xba'));
 const catalog = await readFile(join(basic, 'script.xlc'), 'utf8');
 if (!catalog.includes('</library:libraries>')) throw new Error('Invalid isolated Basic catalog.');
 await writeFile(join(basic, 'script.xlc'), catalog.replace('</library:libraries>', '<library:library library:name="RecipeManuals" library:link="false"/></library:libraries>'));
 await writeFile(join(library, 'script.xlb'), '<?xml version="1.0"?><library:library xmlns:library="http://openoffice.org/2000/library" library:name="RecipeManuals" library:readonly="false" library:passwordprotected="false"><library:element library:name="RecipeManuals"/></library:library>');
 const pdf = _docx.replace(/\.docx$/i, '.pdf');
 const marker = join(profile, 'result.txt');
 const args = [_docx, pdf, marker].map(_path => pathToFileURL(_path).href);
 const macro = 'macro:///RecipeManuals.RecipeManuals.ExportManual(' + args.map(_value => '"' + _value + '"').join(',') + ')';
 await _RunOffice(executable, profile, [macro], _options.timeoutMs);
 const result = (await readFile(marker, 'utf8')).trim();
 if (result !== 'ok') throw new Error('LibreOffice macro: ' + result);
 if (!(await stat(pdf)).size || (await readFile(pdf)).subarray(0, 5).toString() !== '%PDF-') throw new Error('LibreOffice did not produce a PDF.');
 return basename(pdf);
}

async function _RunOffice(_executable, _profile, _args, _timeoutMs = 120000) {
 return new Promise((_resolve, _reject) => {
  const child = spawn(_executable, ['-env:UserInstallation=' + pathToFileURL(_profile).href, '--headless', '--norestore', '--nodefault', ..._args], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let errors = '';
  child.stdout.on('data', () => {});
  child.stderr.on('data', _chunk => { errors = (errors + _chunk).slice(-4096); });
  const timeout = setTimeout(() => {
   // Target only this invocation's process tree, never all Office processes.
   if (process.platform === 'win32' && child.pid) {
    const stop = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    stop.once('error', () => child.kill());
   } else child.kill();
   _reject(new Error('LibreOffice timeout; isolated profile: ' + _profile));
  }, _timeoutMs);
  child.once('error', _error => { clearTimeout(timeout); _reject(_error); });
  child.once('close', _code => { clearTimeout(timeout); _code === 0 ? _resolve() : _reject(new Error('LibreOffice failed (' + _code + '): ' + errors)); });
 });
}
