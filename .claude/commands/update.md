---
description: Update CHANGELOG.md with changes since the last version and commit the changes
allowed-tools: ["Bash", "Edit", "Read", "Glob"]
---

# Update CHANGELOG with Version Changes

Please help me update the CHANGELOG.md file with changes since the last version:

1. **Identify the current version** from package.json
2. **Find the previous version tag** using git log
3. **Get the git diff and commit summary** between the previous version and HEAD
4. **Add a new version entry** to CHANGELOG.md with:
   - Version number and date
   - Categorized changes (Added, Changed, Fixed, Removed, Technical)
   - Pull request references if available
   - Clear, concise descriptions of what changed and why
5. **Commit the changes** with an appropriate commit message

The CHANGELOG follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and uses semantic versioning.

Please analyze the changes carefully and write clear, user-friendly descriptions that explain the impact and benefits of each change.