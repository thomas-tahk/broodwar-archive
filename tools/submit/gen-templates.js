#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { FORMS, templateYaml } from './forms.js';

const DIR = '.github/ISSUE_TEMPLATE';
for (const form of Object.values(FORMS)) {
  fs.writeFileSync(path.join(DIR, form.file), templateYaml(form));
  console.log(`wrote ${path.join(DIR, form.file)}`);
}
