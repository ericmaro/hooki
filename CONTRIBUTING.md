# Contributing to Hooki

Thank you for your interest in contributing to Hooki! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/ericmaro/hooki/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. Check existing issues for similar suggestions
2. Open a new issue with the `enhancement` label
3. Describe the feature and its use case

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Run linting: `pnpm lint`
6. Commit with a descriptive message
7. Push and open a PR against `main`

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/hooki.git
cd hooki

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your local database/Redis URLs

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

## Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Run `pnpm check` before committing (formats and lints)

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add webhook retry logic
fix: resolve flow editor node positioning
docs: update README with new env variables
```

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
