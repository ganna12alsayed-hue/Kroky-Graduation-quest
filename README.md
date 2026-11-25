# Kroky’s Graduation Quest

Open index.html to use the site locally. It is a buildless static site and
includes all runtime assets. The arcade is under أحلام العصر | A7lam El 3asr.

## Deploy to GitHub Pages

1. Extract the ZIP. Copy the contents into the existing Pages publishing
   directory, keeping index.html, .nojekyll and assets/ at the same level.
   Keep the subfolders and exact lowercase filenames under assets/.
   If uploading through the GitHub website, drag the whole assets folder from
   File Explorer into the upload area. Before committing, check that GitHub
   lists paths such as assets/map-icons/library.svg. Uploading the images
   individually to the repository root leaves the artwork unavailable.
   For a new site, use the root of the main branch or its docs/ directory.
2. Commit and push the files. In the repository’s Settings → Pages, select
   Deploy from a branch, choose the branch and folder, and select Save.
3. Open the site URL shown in Pages once deployment completes.
4. Open assets/map-icons/library.svg and assets/arcade/kroky-run-1.png
   beneath that same site URL. If either returns 404, compare the published
   branch and folder with the ZIP and check that the whole assets tree is present.

GitHub’s deployment guide:
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Progress and controls

The academic checklist uses the original kroky-grad-v1 key. Update the existing
site on the same origin so the browser can read saved progress. Moving to a new
hostname creates a separate browser storage area. Reset this week clears only
the selected week. Arcade scores use kroky-arcade-best-v1.

To play, select Start run. Press Space or Up, tap the track, or use Jump.
Book-stack hits close the gap behind Kroky. The third hit ends the run.
Resubmission restarts it. Switching away pauses play until you resume.

## Artwork

The weekly maps use the supplied SVG icons and original Kroky poses. The arcade
uses the supplied Kroky crops, books and approved paper Submission Monster.
The production crops have transparent surroundings and common ground alignment.
The first two monster run crops contain clipped artwork and were omitted.
The in-game sprites are displayed at small sizes to suit the provisional art.
The finale poses still use CSS props where dedicated action frames are absent.
