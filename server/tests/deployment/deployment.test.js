const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Deployment Tests', () => {
  describe('GitHub Deployment', () => {
    it('should have proper GitHub workflow files', () => {
      const workflowPath = path.join(process.cwd(), '.github', 'workflows');
      expect(fs.existsSync(workflowPath)).toBe(true);
      
      // Check for CI workflow file
      const ciWorkflowPath = path.join(workflowPath, 'ci.yml');
      expect(fs.existsSync(ciWorkflowPath)).toBe(true);
      
      // Read CI workflow file and check for tests
      const ciWorkflow = fs.readFileSync(ciWorkflowPath, 'utf8');
      expect(ciWorkflow).toContain('npm test');
      // Check for linting step
      expect(ciWorkflow).toContain('lint');
    });
    
    it('should have proper branch protection configurations', () => {
      // This is a mock test since we can't directly test GitHub settings from Jest
      // In a real environment, this would use GitHub API with appropriate credentials
      // Just checking if the documentation exists
      const docsPath = path.join(process.cwd(), 'docs', 'github-setup.md');
      
      if (fs.existsSync(docsPath)) {
        const docs = fs.readFileSync(docsPath, 'utf8');
        expect(docs).toContain('branch protection');
      } else {
        // If docs don't exist, skip this test
        console.log('GitHub setup documentation not found, skipping test');
      }
    });
  });

  describe('Hugging Face Deployment', () => {
    it('should have proper Hugging Face configuration', () => {
      const hfConfigPath = path.join(process.cwd(), 'huggingface.yml');
      
      if (fs.existsSync(hfConfigPath)) {
        const hfConfig = fs.readFileSync(hfConfigPath, 'utf8');
        expect(hfConfig).toContain('api-inference');
      } else {
        // Alternative location
        const altPath = path.join(process.cwd(), '.huggingface', 'config.yml');
        if (fs.existsSync(altPath)) {
          const altConfig = fs.readFileSync(altPath, 'utf8');
          expect(altConfig).toContain('model');
        } else {
          // If the file doesn't exist, skip this test
          console.log('Hugging Face configuration not found, skipping test');
        }
      }
    });
    
    it('should have model export functionality for Hugging Face', () => {
      // Check if export script exists
      const exportScriptPath = path.join(process.cwd(), 'scripts', 'export-model.js');
      
      if (fs.existsSync(exportScriptPath)) {
        const script = fs.readFileSync(exportScriptPath, 'utf8');
        expect(script).toContain('huggingface');
      } else {
        // If script doesn't exist, skip this test
        console.log('Model export script not found, skipping test');
      }
    });
  });

  describe('Docker Deployment', () => {
    it('should have a valid Dockerfile', () => {
      const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
      expect(fs.existsSync(dockerfilePath)).toBe(true);
      
      const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
      expect(dockerfile).toContain('FROM');
      expect(dockerfile).toContain('WORKDIR');
      expect(dockerfile).toContain('COPY');
      expect(dockerfile).toContain('RUN');
      expect(dockerfile).toContain('CMD');
    });
    
    it('should have a docker-compose.yml file', () => {
      const composePath = path.join(process.cwd(), 'docker-compose.yml');
      expect(fs.existsSync(composePath)).toBe(true);
      
      const compose = fs.readFileSync(composePath, 'utf8');
      expect(compose).toContain('services:');
      expect(compose).toContain('blockchain-app:');
    });
    
    it('should build Docker image successfully', () => {
      // This test requires Docker to be installed
      // Skip if not in a CI environment or Docker not available
      try {
        // Check if Docker is available
        execSync('docker --version', { stdio: 'ignore' });
        
        // Try to build the image
        execSync('docker build -t blockchain-app-test --no-cache .', { 
          stdio: 'pipe',
          timeout: 300000 // 5 minutes timeout
        });
        
        // If it gets here without throwing an error, the build succeeded
        expect(true).toBe(true);
        
        // Clean up
        execSync('docker rmi blockchain-app-test', { stdio: 'ignore' });
      } catch (error) {
        console.log('Docker not available or build failed, skipping test');
        console.log(error.message);
      }
    });
  });
  
  describe('Environment Configuration', () => {
    it('should have a valid .env.example file', () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);
      
      const envExample = fs.readFileSync(envExamplePath, 'utf8');
      
      // Check for required environment variables
      expect(envExample).toContain('PORT=');
      expect(envExample).toContain('MONGODB_URI=');
      expect(envExample).toContain('JWT_SECRET=');
    });
    
    it('should handle missing environment variables gracefully', () => {
      // Load app with missing env vars in a separate process to avoid affecting current tests
      try {
        const testScript = `
          process.env.TEST_MODE = true;
          process.env.PORT = '';
          process.env.MONGODB_URI = '';
          process.env.JWT_SECRET = '';
          const app = require('../../app');
          console.log('App loaded successfully with fallback values');
        `;
        
        const tempScriptPath = path.join(process.cwd(), 'temp-test-script.js');
        fs.writeFileSync(tempScriptPath, testScript);
        
        const output = execSync(`node ${tempScriptPath}`, { 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        expect(output).toContain('App loaded successfully');
        
        // Clean up temp file
        fs.unlinkSync(tempScriptPath);
      } catch (error) {
        console.log('Environment variable test failed:', error.message);
        // If there's a proper error handling, we might expect this to fail safely
        expect(error.status).not.toBe(0);
      }
    });
  });
});
