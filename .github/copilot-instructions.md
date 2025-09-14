# Hero-Pet Copilot Instructions

## Overview

This document provides guidance for AI coding agents to be immediately productive in the Hero-Pet codebase. The project has a hybrid structure that integrates frontend components, API endpoints, and comprehensive testing suites. Key directories include:

- **components/**: Contains UI elements, e.g. `ThemeToggle.js`, `Button.js`, and organized subdirectories (`admin`, `common`, `layout`), demonstrating component reuse and separation of concerns.
- **pages/**: Next.js style pages, including `_app.js` for app-level configuration and API routes under `api/v1` for structured backend endpoints.
- **tests/**: Organized unit and integration tests mirroring the codebase structure, ensuring reliability of both UI components and API logic.
- **infra/**: Includes critical infrastructure scripts and configurations, e.g. `database.js`, and orchestration files like `compose.yaml` and `scripts/wait-for-postgres.js` for dependency management.

## Architecture & Conventions

- **Modular Design**: Components, hooks, and API routes are organized by specific functionality. Check `hooks/useAuth.js` and `hooks/useStatus.js` for business logic encapsulation.
- **API Structure**: API routes are versioned (e.g. `api/v1/status` and `api/v1/migrations`), promoting a clear separation between different service boundaries.
- **Styling**: Tailwind CSS is used for styling (`tailwind.config.js`, `globals.css`), reflecting a consistent design system across the project.

## Developer Workflows

- **Building & Running**: The project uses `npm run dev` for development. Refer to `package.json` for custom scripts and further build instructions.
- **Testing**: Tests are located under `tests/` and mirror the structure of the source code (e.g. API tests in `tests/api/v1`).
- **Debugging**: Entry points such as `pages/_app.js` for frontend and directories under `pages/api` for backend logic should be primary focus areas.
- **Database & Migrations**: Database setup is managed under `infra/database.js` with migration scripts in both `migrations/` and `api/v1/migrations`. The `scripts/wait-for-postgres.js` script ensures smooth integration with Postgres.

## Patterns & Examples

- **Dynamic UI**: `components/ThemeToggle.js` demonstrates usage of a theme context (see `contexts/ThemeContext.js`) to manage UI state.
- **API Endpoints**: `pages/api/v1/status/index.js` provides a clear example of concise request-response patterns.
- **Test Organization**: Tests in `tests/` follow naming conventions that reflect the source file they test, ensuring maintainability.

## Additional Notes

- Maintain the file structure and naming conventions when updating or adding new features.
- Refer to inline comments in key files for deeper insights into project-specific decisions.
- For any changes or clarifications, consult this document to ensure consistent coding practices across the codebase.
