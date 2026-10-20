import { CheckPackageVersions, GetVersionString } from './tools/RecipeRelease.mjs';
CheckPackageVersions();
import * as Api from 'gulp-mu-gulp-api';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LoadConfig, BuildManuals } from './src/Manuals.mjs';
Api.InstallStringExtensions();
const ROOT = dirname(fileURLToPath(import.meta.url));

export async function CREATE_MANUALS() {
 const config = await LoadConfig(ROOT);
 let ids = config.variants.map(_variant => _variant.id);
 if (Api.IsMicroGulp()) {
  const result = await Api.RequestForm({
   title: 'Generate manuals<context="manuals"/>'.i18xRegister(),
   information: { message: 'Each run creates a new local output directory.<context="manuals"/>'.i18xRegister() },
   cancelable: true,
   fields: [{ id: 'variants', type: 'checkbox', label: 'Variants<context="manuals"/>'.i18xRegister(), validate: { required: true, minSelected: 1 }, options: config.variants.map(_variant => ({ label: _variant.id, value: _variant.id, checked: true })) },
    { id: 'pdf', type: 'boolean', label: 'Export PDF with LibreOffice<context="manuals"/>'.i18xRegister(), default: config.features.pdf }],
  });
  if (result === null) return;
  ids = result.variants; config.features.pdf = result.pdf;
 }
 const result = await BuildManuals(ROOT, config, ids);
 Api.Log('Manuals created in <directory/><context="manuals"/>', { directory: result.directory });
}
CREATE_MANUALS.µKeyBinding = { key: 'ctrl+shift+F4', mac: 'cmd+shift+F4' };
CREATE_MANUALS.µDisplayName = 'Generate manuals V<recipeVersion/><context="µDisplayName"/>'.i18xRegister();
CREATE_MANUALS.µDescription = 'Creates client, platform and release variants from a maintained Word template.<context="µDescription"/>'.i18xRegister();
CREATE_MANUALS.µGroup = 'Documentation<context="µGroup"/>'.i18xRegister();
CREATE_MANUALS.µExecutionConcurrency = false;

export const µI18xContext = { recipeVersion: GetVersionString() };
