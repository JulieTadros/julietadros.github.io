# Private portfolio hosting

GitHub stores the source; Cloudflare hosts and protects the deployed site. Keep Cloudflare Access enabled during setup. This configuration applies to the main portfolio, including its embedded demos; deploy the separate interiors repository separately before disabling its GitHub Pages hosting.

## Private settings

In the Worker Settings → Variables and Secrets, add **Secret** entries:

- `PORTFOLIO_PASSWORD`: your owner password (8–256 characters). Do not share it with employers.
- `SESSION_SECRET`: a separate randomly generated value of at least 32 characters.

These values must never be committed to GitHub. A missing configuration returns an unavailable response; portfolio files are not served.

## Generate an application link

Open `https://julietadros.julie-tadros.workers.dev/_portfolio/manage`.

Enter your owner password, choose 30 days (default), 14 days, 7 days, or 1 day, and create a link. Copy the full generated URL into your application. The recipient clicks and enters without typing a password. The link opens the homepage unless you specify a local page such as `/office-my-home.html`.

Links are signed and bound to this hostname. They can be reused until expiry, so email preview scanners do not consume them. Each successful opening grants a secure browser session lasting at most 24 hours, capped by the original link's expiry. Reopen the original link if a browser session expires before the link does.

## Revoke a link

Save the Link ID shown alongside each generated URL. To revoke it, add or edit a **Text** variable named `REVOKED_LINK_IDS` in the Worker Settings → Variables and Secrets. Set the value to the Link ID. Multiple IDs can be separated by commas or newlines. Deploy the settings change and test the old link in a private browser window.

Revocation also blocks browser sessions issued by that link after the configuration update reaches the deployment. Existing downloaded files or copies cannot be recalled. Expired IDs may be removed from the list after their links and sessions have expired. `keep_vars` preserves this dashboard setting on future code deployments.

Changing either owner secret invalidates all existing links and sessions, including owner sessions.

## Finish setup

1. Confirm the latest GitHub commit has deployed successfully.
2. Add both private settings above, then confirm the management form can generate a link while the outer Cloudflare Access sign-in remains enabled.
3. Only once the new Worker is deployed and configured, remove the temporary account-only Cloudflare Access requirement for this Worker. Check for any account-level or hostname-level Access policies still covering it.
4. Test a fresh private browser: root and direct image URLs must show the locked entrance; a generated link should open the portfolio without Cloudflare sign-in. Test expiry/revocation and direct assets.
5. Disable old GitHub Pages hosting and make both source repositories private once each replacement is ready. The Cloudflare protection cannot protect public copies hosted elsewhere.

## Verification

Run `node --test cloudflare/portfolio-worker.test.mjs` for access, expiry, revocation, cookie, login and redirect tests. Run `npx wrangler deploy --dry-run` to validate packaging. The asset binding runs only after authentication because `run_worker_first` is true. Source files, owner tools source and metadata are excluded from static asset uploads by `.assetsignore`.

No visitor statistics or automatic email delivery are implemented in this version. No actual passwords or access links are stored in this repository. The owner form requires the owner password for each generation and rate-limits attempts.
