# Contributing to bajetAI

Thank you for your interest in contributing to bajetAI! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository** (if external contributor)
2. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/bajetAI.git
   cd bajetAI
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Set up environment variables**
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase and Hugging Face credentials

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features (e.g., `feature/auth`, `feature/comments`)
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes

### Creating a Feature

1. **Create a branch from develop**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow the existing code style
   - Add comments for complex logic
   - Write tests for new functionality

3. **Commit your changes**
   - Use conventional commit messages
   - Reference issue numbers
   ```bash
   git add .
   git commit -m "feat(component): add new feature

   Detailed description of what this commit does.

   Fixes #123"
   ```

4. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Go to GitHub and create a PR to `develop`
   - Fill out the PR template completely
   - Link related issues
   - Wait for review

## Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config, etc.)
- `perf`: Performance improvements

### Examples
```bash
feat(auth): add password reset functionality
fix(upload): resolve file size validation error
docs: update README with deployment instructions
test(comments): add unit tests for comment API
chore: update dependencies to latest versions
```

## Code Style

### TypeScript
- Use TypeScript for all new code
- Define proper types (avoid `any`)
- Use interfaces for object shapes
- Export types from `types/index.ts`

### React Components
- Use functional components with hooks
- Prefer named exports over default exports
- Co-locate types with components when component-specific
- Use proper prop types

### File Naming
- Components: `PascalCase.tsx` (e.g., `DocumentList.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Types: `camelCase.ts` (e.g., `document.types.ts`)
- API routes: `route.ts` in Next.js 14+

### Code Organization
```
components/
├── ui/              # Reusable UI components
├── documents/       # Document-related components
├── comments/        # Comment-related components
└── layout/          # Layout components
```

## Testing

### Running Tests
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Writing Tests
- Write tests for new features
- Update tests when changing functionality
- Aim for >80% code coverage
- Test edge cases and error scenarios

### Test Structure
```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Test implementation
  })

  it('should handle user interaction', () => {
    // Test implementation
  })
})
```

## Pull Request Guidelines

### Before Submitting
- [ ] Code follows project style guide
- [ ] Tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Documentation is updated
- [ ] Commit messages follow convention

### PR Description
- Clearly describe what the PR does
- Link related issues
- Include screenshots for UI changes
- List breaking changes (if any)
- Describe testing performed

### Code Review Process
1. At least one approval required
2. All comments must be addressed
3. CI/CD checks must pass
4. No merge conflicts

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- Supabase account
- Hugging Face account

### Environment Variables
See `.env.local.example` for required variables.

### Database Setup
1. Create Supabase project
2. Run migrations from `database/migrations/`
3. Set up RLS policies
4. Generate TypeScript types

## Issue Guidelines

### Creating Issues
- Use appropriate issue template
- Provide clear description
- Include reproduction steps (for bugs)
- Add relevant labels
- Link related issues

### Issue Labels
- `bug`: Something isn't working
- `feature`: New feature request
- `docs`: Documentation
- `enhancement`: Improvement to existing feature
- `P0-P3`: Priority levels
- `phase-X`: Development phase

## Security

### Reporting Vulnerabilities
- DO NOT open public issues for security vulnerabilities
- Email: [security@bajetai.com] (update with actual email)
- Provide detailed description
- Include steps to reproduce

### Security Best Practices
- Never commit sensitive data (API keys, passwords)
- Validate all user inputs
- Use RLS policies in Supabase
- Sanitize data before rendering
- Keep dependencies updated

## Questions?

- Check existing documentation
- Search existing issues
- Ask in GitHub Discussions
- Contact maintainers

## Code of Conduct

Be respectful and professional:
- Be welcoming and inclusive
- Respect differing viewpoints
- Accept constructive criticism
- Focus on what's best for the project
- Show empathy towards others

## License

By contributing to bajetAI, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to bajetAI!
