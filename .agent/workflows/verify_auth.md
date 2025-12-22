---
description: Verify the authentication system is working correctly
---

This workflow verifies the authentication system by running the end-to-end test script.
Prerequisite: The web application must be running locally on port 3000.

1. Ensure the dev server is running
   If not running, open a terminal and run:

   ```bash
   cd apps/web
   npm run dev
   ```

2. Run the authentication verification script
   // turbo
   ```bash
   chmod +x ./test-auth-flow.sh
   ./test-auth-flow.sh
   ```
