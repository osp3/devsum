# GitHub Workflow

This document outlines the GitHub workflow and contribution guidelines for this project.

## Quick Reference

```bash
# Start new feature
git checkout main && git pull origin main
git checkout -b feature/my-feature

# Commit changes
git add . # or: git add <specific files>
git commit -m "feat(scope): description"

# Stay up to date with main
git checkout main && git pull origin main
git checkout feature/my-feature
git merge main

# Push and create PR
git push origin feature/my-feature
# Create PR on GitHub from feature/my-feature to main

# After PR approval and merge
git checkout main && git pull origin main
git branch -d feature/my-feature # OPTIONAL: delete branch

# Reset branch safely (discards local changes)
git checkout feature/my-feature
git reset --hard origin/main # Reset to match main branch
# OR: git reset --hard HEAD~1 # Reset to previous commit

# Rolling back a commit
git revert <commit-hash> # Creates new commit that undoes changes
# OR: git reset --soft HEAD~1 # Undo last commit, keep changes staged

# Checkout files from another branch
git checkout main -- path/to/file.js # Get specific file from main
git checkout feature/other-branch -- src/components/ # Get directory from other branch
```

## Getting Started

### Initial Setup

1. Clone the repository: `git clone https://github.com/osp3/devsum.git`
2. Navigate to project: `cd devsum`
3. Install dependencies: `npm install` (in both frontend and backend directories)

## Branch Strategy

### Main Branch

- **`main`**: Production-ready code and default branch

### Feature Branches

- Create feature branches from `main`
- Use descriptive naming convention: `feature/description-of-feature`
- Examples:
  - `feature/user-authentication`
  - `feature/payment-integration`
  - `bugfix/tailwind-config-error`
  - `hotfix/security-vulnerability`

### Branch Naming Conventions

```bash
feature/short-description
bugfix/short-description
hotfix/short-description
docs/short-description
refactor/short-description
test/short-description
```

## Workflow Process

### 1. Starting New Work

```bash
# Sync with latest changes
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Push branch to shared repository
git push origin feature/your-feature-name
```

### 2. Development Guidelines

#### Commit Message Convention

Use conventional commits format:

```bash
type(scope): description

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**

```bash
feat(frontend): add user dashboard component
fix(backend): resolve authentication middleware error
docs: update API documentation
test(frontend): add unit tests for Button component
```

#### Development Commands

```bash
# Run app frontend and backend concurrently
npm run dev

# Linting
npm run lint
npm run lint:fix
```

### 3. Pull Request Process

#### Before Creating PR

1. Ensure all tests pass locally
2. Run linting and fix any issues
3. Update documentation if needed
4. Merge latest `main` into your branch

```bash
git checkout main
git pull origin main
git checkout feature/your-feature-name
git merge main
```

#### Creating Pull Request

1. Push your branch to the shared repository
2. Create PR from your feature branch to `main`
3. Use the PR template (if available)
4. Fill out PR description with:
   - **What**: Brief description of changes
   - **Why**: Reason for the changes
   - **How**: Technical approach taken
   - **Testing**: How changes were tested
   - **Screenshots**: For UI changes

#### PR Title Format

```bash
type(scope): brief description (#issue-number)
```

Examples:

```bash
feat(frontend): implement user authentication modal (#123)
fix(backend): resolve CORS configuration issue (#456)
```

#### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)

### 4. Code Review Process

#### Review Guidelines

- Use constructive feedback
- Suggest improvements, don't just point out problems
- Approve when code meets standards
- Request changes for issues that must be addressed

#### For Authors

- Address all review comments
- Ask questions if feedback is unclear
- Make requested changes in new commits
- Notify reviewers when ready for re-review

### 5. Merging Process

#### Requirements for Merge

- [ ] At least 1 approval from code owner/team lead
- [ ] All CI checks passing
- [ ] No merge conflicts
- [ ] Up-to-date with `main` branch

#### Merge Strategy

- **Squash and merge** for feature branches
- **Create merge commit** for release branches
- Delete feature branch after successful merge (OPTIONAL)

## Security

### Security Guidelines

- Never commit secrets or API keys
- Use environment variables for configuration

### Branch Protection Rules

- `main` branch is protected
- Require PR reviews before merging
- Require status checks to pass
- Enforce up-to-date branches before merging
- Restrict direct pushes to `main` branch

---
