# How we work

## The rules

1. **Never commit straight to `main`.** Every change goes through a branch and a pull request (PR).
2. **One story per branch.** Name it `yourname/short-story`, for example `saumya/onboarding`.
3. **Only touch your story's files.** Each story owns one HTML page and one JS file. Shared files (`js/store.js`, `js/ui.js`, `css/styles.css`, `data/groups.js`) change only in their own small PR, and you tell the team first.
4. **Keep PRs small.** One thing a user can do that they could not do before.
5. **A teammate approves before anything merges.** The author merges after approval.
6. **Pull `main` before you start** so you build on the latest version.

## Tools

- **GitHub Desktop** (desktop.github.com): the easiest way to clone, branch, commit and push without the command line.
- **Codex** (provided by Darden) or any AI tool for writing code. You must understand every line you submit.
- **Chrome** with the console open (Cmd+Option+J) to see `[empower]` logs and errors.

## The PR flow (GitHub Desktop)

1. Current branch > New branch > `yourname/story`.
2. Build the story. Open the page in Chrome to check it.
3. Write your Given-When-Then scenarios and run each one by hand. Note what you did, what you expected, what happened.
4. Commit with a short message that says what changed ("Add interest picker to onboarding").
5. Publish branch > Create Pull Request. GitHub fills in our template. Complete every section.
6. Request a review from your assigned reviewer.
7. Reply to every review comment, push fixes to the same branch, then merge once approved.

## Code guidelines (from the course)

- **Separation of concerns:** structure in HTML, look in CSS classes, behavior in JS. No inline `style=""`.
- **DRY:** reuse the classes in `styles.css` and helpers in `ui.js` before writing new ones.
- **Predictable logic:** put rules in small named functions. Pass in things like the current date instead of reading the clock inside, so a scenario always gives the same result.
- **Readable:** a header comment at the top of each file saying what it does. Clear names over clever code.
- **Observable:** `Empower.log` at the key moments of your story.
- **Safe:** pass any text a user typed through `Empower.ui.escapeHtml` before putting it on the page.
