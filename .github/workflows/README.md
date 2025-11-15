# GitHub Actions Workflows

This directory contains automated workflows for the ACPLEFF Task Tracker project.

## Workflows Overview

### 1. CI/CD Pipeline (`ci-cd.yml`)
**Triggers:** Push to main/develop, Pull Requests to main

**Jobs:**
- **Build and Test**: Tests the application on Node.js 18.x and 20.x
- **Security Audit**: Runs npm audit to check for vulnerabilities
- **Deploy Production**: Deploys to Vercel when code is pushed to main
- **Deploy Preview**: Creates preview deployments for pull requests
- **Code Quality**: Checks code formatting and unused dependencies

### 2. Dependency Updates (`dependency-update.yml`)
**Triggers:** Weekly schedule (Mondays 9 AM UTC), Manual trigger

**Features:**
- Automatically updates npm dependencies
- Applies security fixes
- Creates pull requests for review

### 3. Performance Check (`performance-check.yml`)
**Triggers:** Push to main, Pull Requests to main

**Features:**
- Runs Lighthouse performance audits
- Analyzes bundle size
- Ensures performance standards are met

### 4. Release Management (`release.yml`)
**Triggers:** Git tags matching `v*.*.*` pattern

**Features:**
- Creates GitHub releases with changelogs
- Deploys tagged versions to production
- Generates installation instructions

### 5. Issue and PR Management (`issue-management.yml`)
**Triggers:** New issues, new PRs, Daily schedule

**Features:**
- Auto-labels issues based on content
- Assigns reviewers to pull requests
- Marks stale issues and PRs for cleanup

## Required Secrets

Add these secrets in your GitHub repository settings:

### Vercel Deployment
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

### Google Sheets Integration
```
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY=your_private_key
```

## Configuration Files

### `.lighthouserc.json`
Configures Lighthouse CI performance thresholds:
- Performance: 80%
- Accessibility: 90%
- Best Practices: 90%
- SEO: 90%

## Usage

### Creating a Release
1. Create and push a git tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. The release workflow will automatically create a GitHub release and deploy to production

### Manual Dependency Updates
1. Go to Actions tab in GitHub
2. Select "Dependency Updates" workflow
3. Click "Run workflow"

### Monitoring Performance
- Performance checks run automatically on every push to main
- Check the Actions tab for Lighthouse reports
- Bundle analysis helps identify large dependencies

## Customization

### Adding New Reviewers
Edit `issue-management.yml` and update the reviewers array:
```yaml
const reviewers = ['bhikandeshmukh', 'new-reviewer'];
```

### Modifying Performance Thresholds
Edit `.lighthouserc.json` to adjust minimum scores:
```json
{
  "categories:performance": ["error", {"minScore": 0.9}]
}
```

### Changing Stale Issue Timeline
Edit `issue-management.yml`:
```yaml
days-before-stale: 30  # Mark as stale after 30 days
days-before-close: 7   # Close after 7 more days
```

## Troubleshooting

### Build Failures
1. Check if all required secrets are set
2. Verify Node.js version compatibility
3. Review error logs in Actions tab

### Deployment Issues
1. Verify Vercel token has correct permissions
2. Check if project ID and org ID are correct
3. Ensure environment variables are properly set

### Performance Failures
1. Review Lighthouse report details
2. Optimize images and reduce bundle size
3. Check for unused dependencies

## Best Practices

1. **Always test locally** before pushing to main
2. **Use feature branches** for new development
3. **Write descriptive commit messages** for better changelogs
4. **Review dependency updates** before merging
5. **Monitor performance metrics** regularly