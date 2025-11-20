# Contributing to celo-block-parity

Thanks for taking the time to contribute! We welcome improvements to contracts, tests, docs, and the MiniPay-ready frontend.

## Getting Started

1. Fork and clone the repo.
2. Install dependencies:
   - `npm install`
   - `cd frontend && npm install`
3. Copy `.env.example` to `.env` in the root and fill in the placeholders.
4. Run the test suite with `npm test`.

## Development Workflow

- Use feature branches and open pull requests early.
- Follow the existing folder structure (`contracts/`, `scripts/`, `frontend/`, etc.).
- Keep commits focused and descriptive. Example prefixes: `feat:`, `fix:`, `chore:`, `docs:`.
- Prefer adding or updating tests when you touch contract logic.

## Coding Standards

- Solidity: pragma `^0.8.19`, descriptive comments, and checked arithmetic.
- JavaScript: Prettier defaults, Tailwind for styling, avoid unnecessary dependencies.
- Frontend: optimize for mobile-first MiniPay usage and handle `window.ethereum.isMiniPay`.

## Reporting Issues

Please use GitHub issues and include:

- What happened vs. what you expected
- Steps to reproduce
- Environment details (OS, Node version, network)

Thanks for helping make celo-block-parity better!

