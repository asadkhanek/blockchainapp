/**
 * Test Report Generator
 * 
 * This script generates comprehensive test reports from Jest test results.
 * It produces HTML and JSON reports for test coverage and test results.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  coverageDir: path.join(process.cwd(), 'coverage'),
  outputDir: path.join(process.cwd(), 'test-reports'),
  thresholds: {
    statements: 70,
    branches: 60,
    functions: 70,
    lines: 70
  },
  categories: [
    { name: 'User Management', pattern: 'auth|user' },
    { name: 'Blockchain Core', pattern: 'blockchain|block|mining' },
    { name: 'Cryptography', pattern: 'crypt|security' },
    { name: 'Wallet', pattern: 'wallet' },
    { name: 'Smart Contracts', pattern: 'contract' },
    { name: 'Admin Panel', pattern: 'admin' },
    { name: 'Notifications', pattern: 'notification' },
    { name: 'Performance', pattern: 'performance' },
    { name: 'Compliance', pattern: 'compliance|gdpr|ccpa' },
    { name: 'Deployment', pattern: 'deployment' }
  ]
};

/**
 * Ensure all required directories exist
 */
function ensureDirectories() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
}

/**
 * Run tests with coverage
 */
function runTestsWithCoverage() {
  console.log('Running tests with coverage...');
  try {
    execSync('npm run test:coverage', { stdio: 'inherit' });
  } catch (error) {
    console.error('Tests failed but continuing with report generation');
  }
}

/**
 * Parse Jest coverage report
 */
function parseCoverageReport() {
  console.log('Parsing coverage report...');
  
  const coverageSummaryPath = path.join(CONFIG.coverageDir, 'coverage-summary.json');
  
  if (!fs.existsSync(coverageSummaryPath)) {
    console.error('Coverage report not found. Make sure tests have been run with coverage.');
    return null;
  }
  
  try {
    const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
    return coverageSummary;
  } catch (error) {
    console.error('Failed to parse coverage report:', error);
    return null;
  }
}

/**
 * Generate report by test category
 */
function generateCategoryReport(coverageSummary) {
  console.log('Generating category-based report...');
  
  if (!coverageSummary) {
    return null;
  }
  
  const categoryResults = {};
  
  // Initialize categories
  CONFIG.categories.forEach(category => {
    categoryResults[category.name] = {
      files: [],
      statements: { covered: 0, total: 0, pct: 0 },
      branches: { covered: 0, total: 0, pct: 0 },
      functions: { covered: 0, total: 0, pct: 0 },
      lines: { covered: 0, total: 0, pct: 0 }
    };
  });
  
  // Process each file in coverage report
  Object.keys(coverageSummary).forEach(filePath => {
    if (filePath === 'total') return;
    
    const fileStats = coverageSummary[filePath];
    
    // Find matching category
    CONFIG.categories.forEach(category => {
      const regex = new RegExp(category.pattern, 'i');
      if (regex.test(filePath)) {
        const catResult = categoryResults[category.name];
        
        // Add file to category
        catResult.files.push(filePath);
        
        // Add stats
        catResult.statements.covered += fileStats.statements.covered;
        catResult.statements.total += fileStats.statements.total;
        catResult.branches.covered += fileStats.branches.covered;
        catResult.branches.total += fileStats.branches.total;
        catResult.functions.covered += fileStats.functions.covered;
        catResult.functions.total += fileStats.functions.total;
        catResult.lines.covered += fileStats.lines.covered;
        catResult.lines.total += fileStats.lines.total;
      }
    });
  });
  
  // Calculate percentages
  Object.keys(categoryResults).forEach(catName => {
    const cat = categoryResults[catName];
    cat.statements.pct = cat.statements.total ? 
      Math.round(cat.statements.covered / cat.statements.total * 100) : 0;
    cat.branches.pct = cat.branches.total ? 
      Math.round(cat.branches.covered / cat.branches.total * 100) : 0;
    cat.functions.pct = cat.functions.total ? 
      Math.round(cat.functions.covered / cat.functions.total * 100) : 0;
    cat.lines.pct = cat.lines.total ? 
      Math.round(cat.lines.covered / cat.lines.total * 100) : 0;
  });
  
  return categoryResults;
}

/**
 * Generate HTML report
 */
function generateHtmlReport(coverageSummary, categoryResults) {
  console.log('Generating HTML report...');
  
  if (!coverageSummary || !categoryResults) {
    return;
  }
  
  const totalCoverage = coverageSummary.total;
  const timestamp = new Date().toISOString();
  
  // Function to determine color based on coverage percentage
  const getColor = (pct) => {
    if (pct >= 80) return 'green';
    if (pct >= 60) return 'orange';
    return 'red';
  };

  // Generate HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blockchain App Test Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .summary {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .category {
      margin-bottom: 30px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #eee;
      padding: 8px 0;
    }
    .green { color: #28a745; }
    .orange { color: #fd7e14; }
    .red { color: #dc3545; }
    .progress-bar {
      height: 20px;
      background-color: #e9ecef;
      border-radius: 5px;
      margin-top: 5px;
      overflow: hidden;
    }
    .progress-bar div {
      height: 100%;
      border-radius: 5px;
    }
    .file-list {
      font-size: 0.9em;
      margin-top: 10px;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #eee;
      padding: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
    }
  </style>
</head>
<body>
  <h1>Blockchain App Test Report</h1>
  <p>Generated on: ${new Date(timestamp).toLocaleString()}</p>
  
  <div class="summary">
    <h2>Overall Coverage</h2>
    <div class="metric">
      <span>Statements:</span>
      <span class="${getColor(totalCoverage.statements.pct)}">${totalCoverage.statements.pct}% (${totalCoverage.statements.covered}/${totalCoverage.statements.total})</span>
    </div>
    <div class="progress-bar">
      <div style="width: ${totalCoverage.statements.pct}%; background-color: ${getColor(totalCoverage.statements.pct)};"></div>
    </div>
    
    <div class="metric">
      <span>Branches:</span>
      <span class="${getColor(totalCoverage.branches.pct)}">${totalCoverage.branches.pct}% (${totalCoverage.branches.covered}/${totalCoverage.branches.total})</span>
    </div>
    <div class="progress-bar">
      <div style="width: ${totalCoverage.branches.pct}%; background-color: ${getColor(totalCoverage.branches.pct)};"></div>
    </div>
    
    <div class="metric">
      <span>Functions:</span>
      <span class="${getColor(totalCoverage.functions.pct)}">${totalCoverage.functions.pct}% (${totalCoverage.functions.covered}/${totalCoverage.functions.total})</span>
    </div>
    <div class="progress-bar">
      <div style="width: ${totalCoverage.functions.pct}%; background-color: ${getColor(totalCoverage.functions.pct)};"></div>
    </div>
    
    <div class="metric">
      <span>Lines:</span>
      <span class="${getColor(totalCoverage.lines.pct)}">${totalCoverage.lines.pct}% (${totalCoverage.lines.covered}/${totalCoverage.lines.total})</span>
    </div>
    <div class="progress-bar">
      <div style="width: ${totalCoverage.lines.pct}%; background-color: ${getColor(totalCoverage.lines.pct)};"></div>
    </div>
  </div>
  
  <h2>Coverage by Category</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Files</th>
        <th>Statements</th>
        <th>Branches</th>
        <th>Functions</th>
        <th>Lines</th>
      </tr>
    </thead>
    <tbody>
      ${Object.keys(categoryResults).map(catName => {
        const cat = categoryResults[catName];
        return `
          <tr>
            <td>${catName}</td>
            <td>${cat.files.length}</td>
            <td class="${getColor(cat.statements.pct)}">${cat.statements.pct}%</td>
            <td class="${getColor(cat.branches.pct)}">${cat.branches.pct}%</td>
            <td class="${getColor(cat.functions.pct)}">${cat.functions.pct}%</td>
            <td class="${getColor(cat.lines.pct)}">${cat.lines.pct}%</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>
  
  <h2>Detailed Coverage by Category</h2>
  ${Object.keys(categoryResults).map(catName => {
    const cat = categoryResults[catName];
    return `
      <div class="category">
        <h3>${catName} (${cat.files.length} files)</h3>
        
        <div class="metric">
          <span>Statements:</span>
          <span class="${getColor(cat.statements.pct)}">${cat.statements.pct}% (${cat.statements.covered}/${cat.statements.total})</span>
        </div>
        <div class="progress-bar">
          <div style="width: ${cat.statements.pct}%; background-color: ${getColor(cat.statements.pct)};"></div>
        </div>
        
        <div class="metric">
          <span>Branches:</span>
          <span class="${getColor(cat.branches.pct)}">${cat.branches.pct}% (${cat.branches.covered}/${cat.branches.total})</span>
        </div>
        <div class="progress-bar">
          <div style="width: ${cat.branches.pct}%; background-color: ${getColor(cat.branches.pct)};"></div>
        </div>
        
        <div class="metric">
          <span>Functions:</span>
          <span class="${getColor(cat.functions.pct)}">${cat.functions.pct}% (${cat.functions.covered}/${cat.functions.total})</span>
        </div>
        <div class="progress-bar">
          <div style="width: ${cat.functions.pct}%; background-color: ${getColor(cat.functions.pct)};"></div>
        </div>
        
        <div class="metric">
          <span>Lines:</span>
          <span class="${getColor(cat.lines.pct)}">${cat.lines.pct}% (${cat.lines.covered}/${cat.lines.total})</span>
        </div>
        <div class="progress-bar">
          <div style="width: ${cat.lines.pct}%; background-color: ${getColor(cat.lines.pct)};"></div>
        </div>
        
        <h4>Files:</h4>
        <div class="file-list">
          <ul>
            ${cat.files.map(file => `<li>${file}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }).join('')}
  
  <div>
    <h2>Test Thresholds</h2>
    <p>The following coverage thresholds are configured:</p>
    <ul>
      <li>Statements: ${CONFIG.thresholds.statements}%</li>
      <li>Branches: ${CONFIG.thresholds.branches}%</li>
      <li>Functions: ${CONFIG.thresholds.functions}%</li>
      <li>Lines: ${CONFIG.thresholds.lines}%</li>
    </ul>
    
    <h3>Status:</h3>
    <p>
      ${totalCoverage.statements.pct >= CONFIG.thresholds.statements &&
        totalCoverage.branches.pct >= CONFIG.thresholds.branches &&
        totalCoverage.functions.pct >= CONFIG.thresholds.functions &&
        totalCoverage.lines.pct >= CONFIG.thresholds.lines ?
        '<span class="green">✓ All thresholds met!</span>' :
        '<span class="red">✗ Some thresholds not met!</span>'}
    </p>
  </div>
  
  <footer>
    <p>Generated by Blockchain App Test Report Generator</p>
  </footer>
</body>
</html>
  `;
  
  // Write HTML report
  fs.writeFileSync(path.join(CONFIG.outputDir, 'test-report.html'), html);
  
  // Write JSON report for programmatic use
  const jsonReport = {
    timestamp,
    overall: totalCoverage,
    categories: categoryResults,
    thresholds: CONFIG.thresholds,
    thresholdsMet: (
      totalCoverage.statements.pct >= CONFIG.thresholds.statements &&
      totalCoverage.branches.pct >= CONFIG.thresholds.branches &&
      totalCoverage.functions.pct >= CONFIG.thresholds.functions &&
      totalCoverage.lines.pct >= CONFIG.thresholds.lines
    )
  };
  
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'test-report.json'),
    JSON.stringify(jsonReport, null, 2)
  );
  
  console.log(`Report generated at: ${CONFIG.outputDir}`);
  console.log(`HTML report: ${path.join(CONFIG.outputDir, 'test-report.html')}`);
  console.log(`JSON report: ${path.join(CONFIG.outputDir, 'test-report.json')}`);
}

/**
 * Main execution function
 */
function main() {
  ensureDirectories();
  runTestsWithCoverage();
  const coverageSummary = parseCoverageReport();
  const categoryResults = generateCategoryReport(coverageSummary);
  generateHtmlReport(coverageSummary, categoryResults);
}

// Execute when run directly
if (require.main === module) {
  main();
}

module.exports = {
  generateReport: main
};
