/**
 * Security Audit Script
 * 
 * This script performs a basic security audit of the codebase.
 * Run with: node scripts/security-audit.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const PATTERNS = {
  hardcodedSecrets: [
    /['"](api|secret|key|token|password|credential)['"]\s*:\s*['"](\w{8,})['"]/, // JSON-like key-value pairs
    /const\s+(\w+)(api|secret|key|token|password|credential)\s*=\s*['"](\w{8,})['"]/i, // Variable declarations
    /process\.env\.(\w+)\s*\|\|\s*['"](\w{8,})['"]/ // Fallback values for env vars
  ],
  xssVulnerabilities: [
    /dangerouslySetInnerHTML/,
    /\$\{.*\}/,
    /\{\{.*\}\}/,
    /eval\(/,
    /document\.write\(/,
    /innerHTML\s*=/
  ],
  insecureFirebase: [
    /\.set\(.*\)\s*\.then\(/,
    /\.update\(.*\)\s*\.then\(/,
    /\.delete\(\)\s*\.then\(/,
    /\.add\(.*\)\s*\.then\(/,
    /firebase\.auth\(\)\.createUserWithEmailAndPassword\(/,
    /new GoogleAuthProvider\(\)/,
    /signInWithPopup\(auth,\s*provider\)/
  ],
  missingInputValidation: [
    /\<input\s+(?!.*validate)[^>]*>/,
    /\<textarea\s+(?!.*validate)[^>]*>/,
    /\<select\s+(?!.*validate)[^>]*>/
  ],
  insecureRouting: [
    /\<Route\s+(?!.*element=\{\<PrivateRoute|ProtectedRoute)[^>]*>/
  ]
};

// Results storage
const results = {
  hardcodedSecrets: [],
  xssVulnerabilities: [],
  insecureFirebase: [],
  missingInputValidation: [],
  insecureRouting: [],
  npmAuditResults: null
};

/**
 * Scans a file for security issues
 */
function scanFile(filePath) {
  // Skip node_modules
  if (filePath.includes('node_modules')) return;
  
  // Only scan JS/JSX files
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    
    // Check for hardcoded secrets
    PATTERNS.hardcodedSecrets.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        results.hardcodedSecrets.push({
          file: relativePath,
          match: matches[0]
        });
      }
    });
    
    // Check for XSS vulnerabilities
    PATTERNS.xssVulnerabilities.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        results.xssVulnerabilities.push({
          file: relativePath,
          match: matches[0]
        });
      }
    });
    
    // Check for insecure Firebase usage
    PATTERNS.insecureFirebase.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        results.insecureFirebase.push({
          file: relativePath,
          match: matches[0]
        });
      }
    });
    
    // Check for missing input validation
    PATTERNS.missingInputValidation.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        results.missingInputValidation.push({
          file: relativePath,
          match: matches[0]
        });
      }
    });
    
    // Check for insecure routing
    PATTERNS.insecureRouting.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        results.insecureRouting.push({
          file: relativePath,
          match: matches[0]
        });
      }
    });
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error.message);
  }
}

/**
 * Recursively scans a directory
 */
function scanDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      scanDirectory(filePath);
    } else {
      scanFile(filePath);
    }
  });
}

/**
 * Run npm audit
 */
function runNpmAudit() {
  try {
    const output = execSync('npm audit --json', { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    // npm audit returns non-zero exit code if vulnerabilities are found
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch (parseError) {
        return { error: 'Failed to parse npm audit output' };
      }
    }
    return { error: error.message };
  }
}

/**
 * Check for environment variables
 */
function checkEnvironmentVariables() {
  const envExample = path.join(__dirname, '..', '.env.example');
  const env = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envExample)) {
    console.warn('Warning: No .env.example file found');
    return;
  }
  
  if (!fs.existsSync(env)) {
    console.warn('Warning: No .env file found');
    return;
  }
  
  const envExampleContent = fs.readFileSync(envExample, 'utf8');
  const envContent = fs.readFileSync(env, 'utf8');
  
  const envExampleVars = envExampleContent.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=')[0]);
  
  const envVars = envContent.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=')[0]);
  
  const missingVars = envExampleVars.filter(v => !envVars.includes(v));
  
  if (missingVars.length > 0) {
    console.warn('Warning: Missing environment variables:', missingVars.join(', '));
  }
}

/**
 * Main function
 */
function main() {
  console.log('Starting security audit...');
  
  // Scan source code
  scanDirectory(SRC_DIR);
  
  // Run npm audit
  console.log('Running npm audit...');
  results.npmAuditResults = runNpmAudit();
  
  // Check environment variables
  checkEnvironmentVariables();
  
  // Print results
  console.log('\n=== Security Audit Results ===\n');
  
  console.log('Hardcoded Secrets:', results.hardcodedSecrets.length);
  results.hardcodedSecrets.forEach(item => {
    console.log(`  - ${item.file}: ${item.match}`);
  });
  
  console.log('\nPotential XSS Vulnerabilities:', results.xssVulnerabilities.length);
  results.xssVulnerabilities.forEach(item => {
    console.log(`  - ${item.file}: ${item.match}`);
  });
  
  console.log('\nInsecure Firebase Usage:', results.insecureFirebase.length);
  results.insecureFirebase.forEach(item => {
    console.log(`  - ${item.file}: ${item.match}`);
  });
  
  console.log('\nPotentially Missing Input Validation:', results.missingInputValidation.length);
  results.missingInputValidation.forEach(item => {
    console.log(`  - ${item.file}: ${item.match}`);
  });
  
  console.log('\nInsecure Routing:', results.insecureRouting.length);
  results.insecureRouting.forEach(item => {
    console.log(`  - ${item.file}: ${item.match}`);
  });
  
  console.log('\nNPM Audit Results:');
  if (results.npmAuditResults && results.npmAuditResults.metadata) {
    const { vulnerabilities } = results.npmAuditResults.metadata;
    console.log(`  - Total vulnerabilities: ${vulnerabilities.total}`);
    console.log(`  - Critical: ${vulnerabilities.critical || 0}`);
    console.log(`  - High: ${vulnerabilities.high || 0}`);
    console.log(`  - Moderate: ${vulnerabilities.moderate || 0}`);
    console.log(`  - Low: ${vulnerabilities.low || 0}`);
  } else {
    console.log('  - Failed to get npm audit results');
  }
  
  console.log('\n=== End of Security Audit ===');
}

// Run the audit
main();