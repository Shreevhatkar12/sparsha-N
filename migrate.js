import fs from 'fs';
import path from 'path';

const filesToRename = [
  'backend/src/lib/centerScope.js',
  'backend/src/lib/errors.js',
  'backend/src/middleware/auth.middleware.js',
  'backend/src/middleware/requireRole.middleware.js',
  'backend/src/routes/auth.route.js',
  'backend/src/routes/student.route.js',
  'backend/src/services/student.dashboard.js',
];

for (const oldPath of filesToRename) {
  if (fs.existsSync(oldPath)) {
    const newPath = oldPath.replace('.js', '.ts');
    fs.renameSync(oldPath, newPath);
    console.log(`Renamed ${oldPath} to ${newPath}`);
  }
}

function updateImportsInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      updateImportsInDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.match(/from\s+['"]([^'"]+)\.js['"]/g) || content.match(/import\s+['"]([^'"]+)\.js['"]/g)) {
        content = content.replace(/from\s+(['"])([^'"]+)\.js\1/g, 'from $1$2.ts$1');
        content = content.replace(/import\s+(['"])([^'"]+)\.js\1/g, 'import $1$2.ts$1');
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

updateImportsInDir('backend/src');
console.log('Updated import extensions in backend/src');
