# 🚀 Secure PR Review Action - Dogfooding Guide

This repository is now set up for **dogfooding** - using our own action to review itself. Follow these steps to see it in action.

## 📋 Step 1: Set Up Repository Secrets

Before you can run the action, you need to add the AI service API key as a secret.

1.  **Go to your repository settings** on GitHub.
2.  Navigate to **Settings > Secrets and variables > Actions**.
3.  Click **New repository secret**.
4.  Create a secret with the following name and value:
    -   **Name**: `OPENCODE_API_KEY`
    -   **Value**: *Your API key for the AI review service.*

## 🚀 Step 2: Create a Pull Request

Now, you need to commit all the files we've created and open a pull request. This will trigger the `dogfood.yml` workflow.

**From your local machine:**

1.  **Create a new branch:**
    ```bash
    git checkout -b feat/dogfood-setup
    ```

2.  **Add all the new files:**
    ```bash
    git add .
    ```

3.  **Commit the changes:**
    ```bash
    git commit -m "feat: setup secure PR review action and dogfooding workflow"
    ```

4.  **Push the branch to GitHub:**
    ```bash
    git push origin feat/dogfood-setup
    ```

5.  **Open a Pull Request:**
    -   Go to your repository on GitHub.
    -   You will see a prompt to create a pull request from the `feat/dogfood-setup` branch.
    -   Click **"Compare & pull request"** and create the PR.

## 📊 Step 3: Observe the Results

Once you create the pull request, the **"🐕 Dogfood - Secure PR Review Action"** workflow will automatically start.

-   **Check the "Actions" tab** of your repository to see the workflow running.
-   **Look at your pull request** to see the comments, checks, and labels created by the action itself.

This process proves that our action is not only functional but also robust enough to analyze its own source code, providing a powerful, self-validating quality gate.

---

For more detailed instructions, refer to the [DOGFOODING.md](DOGFOODING.md) guide.