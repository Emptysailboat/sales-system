# Sales System

This is a sales system project built with React and deployed using GitHub Pages.

## Scripts

-   `npm start`: Run the application in development mode
-   `npm run build`: Build the application for production
-   `npm run deploy`: Deploy the application to GitHub Pages

## Deployment Setup

This project is configured to deploy to GitHub Pages using the `gh-pages` package. The deployment automatically pushes the built application to the `gh-pages` branch.

### How to Deploy

1. Make sure all your changes are committed
2. Run the deploy command:
   ```bash
   npm run deploy
   ```
3. The `predeploy` script will automatically build the application before deploying

### GitHub Repository Settings

To enable GitHub Pages for this repository, follow these steps:

1. **Go to Repository Settings**
   - Navigate to your repository on GitHub
   - Click on "Settings" tab

2. **Configure GitHub Pages**
   - In the left sidebar, click on "Pages" (under "Code and automation")
   - Under "Build and deployment":
     - **Source**: Select "Deploy from a branch"
     - **Branch**: Select `gh-pages` branch and `/ (root)` folder
     - Click "Save"

3. **Wait for Deployment**
   - GitHub will automatically deploy your site
   - The site will be available at: `https://emptysailboat.github.io/sales-system/`
   - You can check the deployment status in the "Actions" tab

4. **Optional: Custom Domain**
   - If you want to use a custom domain, you can configure it in the same "Pages" settings
   - Add your custom domain and follow GitHub's instructions for DNS configuration

### Notes

- The `homepage` field in `package.json` is set to match the GitHub Pages URL
- The build folder is automatically created and deployed by the `gh-pages` package
- The `gh-pages` branch is managed automatically - you don't need to manually create or manage it
- After the first deployment, subsequent deployments will only update the changed files
