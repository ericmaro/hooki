# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Hooki, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email your findings to the maintainers directly
3. Include a detailed description of the vulnerability
4. Provide steps to reproduce the issue if possible

We will acknowledge receipt within 48 hours and aim to release a fix within 7 days for critical issues.

## Security Features

### Self-Hosted Mode

- **Single-user restriction**: In self-hosted mode (`HOOKI_MODE=self-hosted`), only one user account can be created. Additional signup attempts are automatically redirected to the login page.
- **Local control**: All data stays on your infrastructure with no external dependencies.

### Authentication

- Session-based authentication via [Better Auth](https://better-auth.com)
- Secure password hashing
- CSRF protection on all forms

### Webhook Security

- Optional HMAC signature verification for inbound webhooks
- Request/response logging for audit trails
- Organization-scoped resource isolation

## Best Practices

When deploying Hooki:

1. Use strong, unique values for `BETTER_AUTH_SECRET`
2. Run behind a reverse proxy with TLS (HTTPS)
3. Restrict database access to the application only
4. Regularly update to the latest version
