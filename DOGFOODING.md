# 🐕 Dogfooding Guide - Secure PR Review Action

This guide walks you through the process of testing the Secure PR Review Action on itself - the ultimate quality assurance test.

## 📋 Prerequisites

Before you start, ensure you have:
- [ ] GitHub repository with Actions enabled
- [ ] Node.js 20+ installed locally
- [ ] Git configured with your GitHub account
- [ ] Access to repository secrets settings

## 🚀 Step-by-Step Dogfooding Process

### Step 1: Initial Setup

1. **Navigate to your repository**
   ```bash
   cd /Users/code/Documents/trae_projects/Research/Interesting-Stuff/sandbox/sessions/opencode-gh-pr
   ```

2. **Initialize Git repository (if not already done)**
   ```bash
   git init
   git remote add origin https://github.com/your-username/secure-pr-review-action.git
   ```

3. **Create a new branch for testing**
   ```bash
   git checkout -b feature/dogfood-testing
   ```

### Step 2: Set Up Repository Secrets

1. **Go to GitHub Repository Settings**
   - Navigate to: `Settings` → `Secrets and variables` → `Actions`

2. **Add Required Secrets**
   - Click `New repository secret`
   - **Secret name**: `OPENCODE_API_KEY`
   - **Secret value**: Your OpenCode AI API key (or use a test key)
   - Click `Add secret`

3. **Add Optional Secrets**
   - `AI_API_KEY`: Alternative AI service API key
   - `GITHUB_TOKEN`: This is automatically provided by GitHub Actions

### Step 3: Build and Test Locally

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the build process**
   ```bash
   npm run build
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Run linting**
   ```bash
   npm run lint
   ```

5. **Run type checking**
   ```bash
   npm run typecheck
   ```

### Step 4: Commit Your Changes

1. **Stage all files**
   ```bash
   git add .
   ```

2. **Commit with a descriptive message**
   ```bash
   git commit -m "feat: add secure PR review action with dogfooding workflow

   - Implement professional TypeScript action with clean architecture
   - Add comprehensive security measures and input sanitization
   - Include dogfooding workflow for self-testing
   - Add extensive documentation and configuration options
   - Implement proper testing framework with Jest and ESLint"
   ```

3. **Push to GitHub**
   ```bash
   git push origin feature/dogfood-testing
   ```

### Step 5: Create the Pull Request

1. **Go to GitHub and create a PR**
   - Navigate to your repository on GitHub
   - Click `Compare & pull request`
   - Title: `🐕 Dogfood: Add Secure PR Review Action`
   - Description: Include details about the security improvements and features

2. **Watch the magic happen**
   - The dogfooding workflow will automatically trigger
   - Your action will review its own code
   - Check the Actions tab to see the results

### Step 6: Analyze the Results

1. **Check the Actions tab**
   - Go to `Actions` → `Dogfood - Secure PR Review Action`
   - Click on your workflow run
   - Review the logs and results

2. **Check the PR comments**
   - Look for review comments posted by your action
   - Verify the security analysis and AI review
   - Check the labels applied to your PR

3. **Verify check runs**
   - Check the GitHub checks section in your PR
   - Ensure the `Secure AI Code Review` check passed

### Step 7: Iterate and Improve

1. **Review the feedback**
   - If the action finds issues, address them
   - Make improvements based on the AI review

2. **Push additional commits**
   ```bash
   # Make your changes
   git add .
   git commit -m "fix: address review feedback from dogfooding"
   git push origin feature/dogfood-testing
   ```

3. **Watch the updated results**
   - The workflow will run again on your new commits
   - Compare results with the previous run

## 📊 Expected Results

### ✅ Success Indicators
- All checks pass in the GitHub Actions workflow
- AI review provides constructive feedback
- Security scan completes without critical issues
- Performance analysis runs successfully
- Documentation check passes

### ⚠️ Warning Indicators
- AI review finds minor issues (this is expected and good!)
- Security scan flags some files for review
- Performance analysis suggests improvements

### ❌ Failure Indicators
- Build or test failures
- Critical security vulnerabilities detected
- Action crashes or times out
- Missing required secrets

## 🛠️ Troubleshooting

### Common Issues

1. **Missing Secrets**
   - Error: `Input required and not supplied: ai-api-key`
   - Solution: Add the `OPENCODE_API_KEY` secret in repository settings

2. **Build Failures**
   - Error: `npm run build` fails
   - Solution: Check Node.js version (requires 20+) and run `npm install`

3. **Permission Errors**
   - Error: `Resource not accessible by integration`
   - Solution: Ensure the workflow has `pull-requests: write` permission

4. **AI API Failures**
   - Error: `AI API error: 401`
   - Solution: Verify your AI API key is correct and has proper permissions

### Debug Mode

To enable debug logging, add this to your workflow:
```yaml
env:
  ACTIONS_STEP_DEBUG: true
```

## 📈 Advanced Dogfooding

### Testing Different Scenarios

1. **Large PR Test**
   - Create a PR with many files/lines
   - Verify size limits and performance

2. **Security-Sensitive PR**
   - Add files with names like `auth.js`, `secrets.json`
   - Verify security scanning catches them

3. **Documentation-Only PR**
   - Only modify `.md` files
   - Verify documentation check behavior

4. **Performance-Impacting PR**
   - Add large dependencies
   - Verify bundle size analysis

### Performance Benchmarking

Monitor these metrics during dogfooding:
- **Execution time**: Should be under 2 minutes for typical PRs
- **API calls**: Minimize GitHub API usage
- **Resource usage**: Monitor memory and CPU consumption
- **Success rate**: Aim for >95% success rate

## 🎉 Success Criteria

Your dogfooding is successful when:
- [ ] Action runs without errors on your test PR
- [ ] AI review provides meaningful feedback
- [ ] Security analysis identifies relevant issues
- [ ] Performance analysis completes successfully
- [ ] All workflow jobs pass
- [ ] Comments are posted professionally
- [ ] Labels are applied correctly
- [ ] You're confident in the action's reliability

## 🚀 Next Steps

After successful dogfooding:
1. **Merge the PR** to your main branch
2. **Create a release** using the provided release script
3. **Document the release** in your repository
4. **Share your success** with the community
5. **Monitor production usage** for any issues

---

**Happy Dogfooding! 🐕** Your action is now eating its own dog food and proving its worth.