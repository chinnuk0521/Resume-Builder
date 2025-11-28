# Branch Organization Strategy

## Current Branches

### Main Branches
- **`main`** - Production-ready code, stable releases
- **`feature/exact-resume-template`** - Feature branch for ATS-friendly resume template and PDF import functionality

### Feature Branches
- **`fix/add-favicon-support`** - Fix branch for favicon implementation (can be merged/deleted after integration)

## Branch Naming Convention

### Feature Branches
- Format: `feature/<feature-name>`
- Examples:
  - `feature/exact-resume-template`
  - `feature/pdf-import`
  - `feature/resume-optimization`

### Bug Fix Branches
- Format: `fix/<bug-description>`
- Examples:
  - `fix/add-favicon-support`
  - `fix/pdf-parsing-error`
  - `fix/form-validation`

### Hotfix Branches
- Format: `hotfix/<issue-description>`
- Examples:
  - `hotfix/critical-security-patch`
  - `hotfix/production-bug`

## Current Workflow

1. **Feature Development**: Work on `feature/exact-resume-template`
2. **Testing**: Test thoroughly before merging
3. **Merge to Main**: After testing and review, merge to `main`

## Recommended Cleanup

### Completed Features (Ready to Merge)
- `feature/exact-resume-template` - Contains:
  - ATS-friendly resume template
  - PDF import functionality
  - Robust parsing system
  - Production-ready code

### Old/Completed Branches (Can be Deleted)
- `fix/add-favicon-support` - If already merged, can be deleted

## Code Organization

### Directory Structure
```
├── app/              # Next.js app directory
├── components/       # React components
├── utils/           # Utility functions (pdfGenerator, pdfParser, resumeTemplate)
├── lib/             # Library configurations
├── tests/           # Test utilities and sample files
├── scripts/         # Build and utility scripts
└── public/          # Static assets
```

### Key Files
- `utils/pdfParser.ts` - PDF parsing utility
- `utils/pdfGenerator.ts` - PDF generation utility
- `utils/resumeTemplate.ts` - Resume template configuration
- `components/ResumeBuilder.tsx` - Main resume builder component
- `app/api/parse/route.ts` - PDF parsing API endpoint

## Git Workflow Best Practices

1. **Always work on feature branches** - Never commit directly to `main`
2. **Keep commits atomic** - One logical change per commit
3. **Write descriptive commit messages** - Follow conventional commits format
4. **Clean up after merging** - Delete merged branches
5. **Regular sync with main** - Rebase/merge main into feature branches regularly

## Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Example
```
feat: Implement robust PDF import with structured data extraction

Features:
- Add comprehensive PDF parser utility
- Update parse API to return structured data
- Enhance PDF import in ResumeBuilder

Code Organization:
- Move test utilities to tests/ directory
- Update .gitignore
```

