import ts from 'typescript';
import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
async function files(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((d) =>
        d.isDirectory() ? files(path.join(dir, d.name)) : path.join(dir, d.name),
      ),
    )
  ).flat();
}
const errors = [];
let count = 0;
for (const file of (await files('client/src')).filter((f) => f.endsWith('.ts'))) {
  const source = ts.createSourceFile(
    file,
    await readFile(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  for (const error of source.parseDiagnostics)
    errors.push(file + ': ' + ts.flattenDiagnosticMessageText(error.messageText, ' '));
  for (const node of source.statements) {
    if (!ts.isClassDeclaration(node)) continue;
    for (const decorator of ts.getDecorators(node) ?? []) {
      if (decorator.expression.expression?.getText(source) !== 'Component') continue;
      count++;
      if (!file.endsWith('.component.ts')) errors.push(file + ': use a .component.ts filename');
      const props = decorator.expression.arguments[0].properties;
      for (const key of ['template', 'styles'])
        if (props.some((p) => p.name?.text === key))
          errors.push(file + ': inline ' + key + ' is not allowed');
      for (const key of ['templateUrl', 'styleUrl']) {
        const p = props.find((p) => p.name?.text === key);
        if (!p || !ts.isStringLiteralLike(p.initializer)) {
          errors.push(file + ': missing ' + key);
          continue;
        }
        try {
          await access(path.resolve(path.dirname(file), p.initializer.text));
        } catch {
          errors.push(file + ': missing ' + p.initializer.text);
        }
      }
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Architecture lint passed: ${count} standalone components have separate TypeScript, HTML and SCSS files.`,
  );
