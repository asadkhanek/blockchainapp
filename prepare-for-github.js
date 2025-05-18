// Prepare project for GitHub Pages deployment
const fs = require('fs');
const path = require('path');

console.log('Preparing blockchain project for GitHub...');

// Copy GitHub README
try {
  const githubReadme = fs.readFileSync(
    path.join(__dirname, 'GITHUB_README.md'),
    'utf8'
  );
  fs.writeFileSync(path.join(__dirname, 'README.md'), githubReadme);
  console.log('✓ Updated README.md for GitHub');
} catch (err) {
  console.error('Error updating README.md:', err);
}

// Update client package.json with GitHub homepage
try {
  const githubPackage = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'client', 'package-github.json'), 'utf8')
  );
  const clientPackagePath = path.join(__dirname, 'client', 'package.json');
  const clientPackage = JSON.parse(fs.readFileSync(clientPackagePath, 'utf8'));
  
  // Merge in the homepage property
  clientPackage.homepage = githubPackage.homepage;
  
  // Add GitHub Pages specific scripts
  clientPackage.scripts = {
    ...clientPackage.scripts,
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  };
  
  fs.writeFileSync(clientPackagePath, JSON.stringify(clientPackage, null, 2));
  console.log('✓ Updated client package.json with GitHub Pages config');
} catch (err) {
  console.error('Error updating client package.json:', err);
}

// Create .gitignore if it doesn't exist
try {
  const gitignorePath = path.join(__dirname, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    const gitignoreContent = `# dependencies
/node_modules
/client/node_modules
/.pnp
.pnp.js

# testing
/coverage
/client/coverage

# production
/client/build

# misc
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*
`;
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log('✓ Created .gitignore file');
  }
} catch (err) {
  console.error('Error creating .gitignore:', err);
}

// Install gh-pages package if needed
console.log('\nSetup complete! Next steps:');
console.log('1. Install gh-pages package:');
console.log('   cd client && npm install gh-pages --save-dev');
console.log('2. GitHub username has been set to "asadkhanek" in the README and client/package.json');
console.log('3. Initialize git repository and push to GitHub:');
console.log('   git init');
console.log('   git add .');
console.log('   git commit -m "Initial commit"');
console.log('   git branch -M main');
console.log('   git remote add origin https://github.com/asadkhanek/blockchainapp.git');
console.log('   git push -u origin main');
console.log('\nAfter pushing to GitHub, the GitHub Actions workflow will automatically deploy your client to GitHub Pages.\n');
