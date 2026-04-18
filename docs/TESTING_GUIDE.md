# CareNest Testing Strategy & Guide

This document outlines the testing strategy employed in the CareNest therapy backend, designed to meet course requirements regarding reliability, edge case handling, and on-demand test reporting.

## 🛠️ Testing Stack
We have adopted a modern, fast, and robust testing stack suitable for our Node.js (ES Modules) environment:
- **Vitest**: Our main test runner. It replaces Jest, offering native ES Module support, lightning-fast execution, and built-in coverage reporting.
- **Supertest**: Used to simulate HTTP requests (GET, POST, etc.) to securely test our Express API endpoints without needing to expose a live network port during tests.
- **MongoMemoryServer**: Spins up an in-memory MongoDB instance tailored specifically for tests. This ensures our tests don't overwrite production or development databases and run securely in isolation.

---

## 🚦 How to Run Tests

You can run our automated tests anytime using the scripts configured in `package.json`.

### 1. Run all tests once
```bash
npm run test
```
*Use this to quickly check if the application passes all existing test suites.*

### 2. Run tests in Watch Mode (Developer flow)
```bash
npm run test:watch
```
*Use this while writing code. The tests will auto-re-run specifically for the files you save, helping you catch errors in real-time.*

---

## 📊 Generating Test Reports On Demand

As per requirements, test reports and coverage metrics can be generated on demand to ensure core functionalities are sufficiently tested.

### Generate the Coverage Report
```bash
npm run test:coverage
```

**What this does:**
1. It runs all the tests across the application.
2. It audits which lines of code were executed during the tests.
3. It generates an interactive HTML dashboard in a newly created `coverage/` folder.

**How to view the report:**
After running the command, open the following file in any web browser:
`carenest-therapy-backend/coverage/index.html`

The report provides exact percentages for **Statements**, **Branches(Edge Cases)**, **Functions**, and **Lines** covered by tests.

---

## 🏗️ Testing Strategy & Philosophy

Our tests are grouped under the `tests/` directory at the root of the backend folder, broken into two main categories:

### 1. Unit Testing (Core Functions)
Located in `tests/unit/`.
These test standalone utilities, helper functions, and logic without relying on external dependencies like networks or databases. 
*Example: Testing the JWT Token Generator (`generateTokens.js`) to ensure it reliably embeds the correct user IDs and prevents malformed data processing.*

### 2. Integration / API Endpoint Testing
Located in `tests/api/`.
These test the routes using `supertest`. We use the `MongoMemoryServer` to interact with real models to simulate full user journeys.
*Example: The `/health` endpoint to ensure server reliability, or Authentication endpoints to ensure invalid payloads correctly return `400 Bad Request` or `401 Unauthorized` flags.*

### Catching Edge Cases
Our tests are specifically designed to poke holes in the system, testing scenarios such as:
- **Missing arguments:** Ensuring endpoints gracefully reject missing req.body variables.
- **Invalid data types:** Making sure incorrect ID formats or manipulated request parameters are safely rejected without crashing the node process.
- **Database boundaries:** Handling duplicate unique fields (like email registers) appropriately.