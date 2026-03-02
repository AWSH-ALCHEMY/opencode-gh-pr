#!/usr/bin/env bash
set -euo pipefail

POLICY_PATH=".github/repo-hygiene-policy.json"
BASE_SHA="${BASE_SHA:-}"
HEAD_SHA="${HEAD_SHA:-}"

if [[ -z "$BASE_SHA" || -z "$HEAD_SHA" ]]; then
  echo "BASE_SHA and HEAD_SHA are required."
  exit 2
fi

if [[ ! -f "$POLICY_PATH" ]]; then
  echo "Missing policy file: $POLICY_PATH"
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for repo hygiene checks."
  exit 2
fi

changed_files=()
while IFS= read -r line; do
  [[ -n "$line" ]] && changed_files+=("$line")
done < <(git diff --name-only --diff-filter=ACMR "$BASE_SHA" "$HEAD_SHA")

if [[ ${#changed_files[@]} -eq 0 ]]; then
  echo "No changed files detected between $BASE_SHA and $HEAD_SHA."
  exit 0
fi

forbidden_files=()
while IFS= read -r line; do
  [[ -n "$line" ]] && forbidden_files+=("$line")
done < <(jq -r '.forbiddenFiles[]?' "$POLICY_PATH")

forbidden_globs=()
while IFS= read -r line; do
  [[ -n "$line" ]] && forbidden_globs+=("$line")
done < <(jq -r '.forbiddenGlobs[]?' "$POLICY_PATH")

docs_globs=()
while IFS= read -r line; do
  [[ -n "$line" ]] && docs_globs+=("$line")
done < <(jq -r '.docsGlobs[]?' "$POLICY_PATH")

banned_terms=()
while IFS= read -r line; do
  [[ -n "$line" ]] && banned_terms+=("$line")
done < <(jq -r '.bannedTerms[]?' "$POLICY_PATH")

violations=()

matches_glob_list() {
  local file="$1"
  shift
  local patterns=("$@")
  local pattern
  for pattern in "${patterns[@]}"; do
    [[ -z "$pattern" ]] && continue
    if [[ "$file" == $pattern ]]; then
      return 0
    fi
  done
  return 1
}

for file in "${changed_files[@]}"; do
  for forbidden in "${forbidden_files[@]}"; do
    [[ "$file" == "$forbidden" ]] && violations+=("Forbidden file changed: $file")
  done

  if matches_glob_list "$file" "${forbidden_globs[@]}"; then
    violations+=("Forbidden file pattern matched: $file")
  fi

done

for file in "${changed_files[@]}"; do
  if ! matches_glob_list "$file" "${docs_globs[@]}"; then
    continue
  fi

  diff_output="$(git diff --unified=0 "$BASE_SHA" "$HEAD_SHA" -- "$file" || true)"
  [[ -z "$diff_output" ]] && continue

  # Only inspect added lines, ignore diff metadata and file header markers.
  added_lines=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && added_lines+=("$line")
  done < <(printf '%s\n' "$diff_output" | grep -E '^\+' | grep -Ev '^\+\+\+' || true)
  [[ ${#added_lines[@]} -eq 0 ]] && continue

  for raw_line in "${added_lines[@]}"; do
    line="${raw_line#+}"
    lower_line="$(printf '%s' "$line" | tr '[:upper:]' '[:lower:]')"
    for term in "${banned_terms[@]}"; do
      [[ -z "$term" ]] && continue
      if printf '%s' "$lower_line" | grep -Eiq "(^|[^a-z0-9_])${term}([^a-z0-9_]|$)"; then
        violations+=("Unprofessional term '$term' added in $file: $line")
      fi
    done
  done

done

if [[ ${#violations[@]} -gt 0 ]]; then
  {
    echo "Repo hygiene check failed with ${#violations[@]} violation(s):"
    for item in "${violations[@]}"; do
      echo "- $item"
    done
  } | tee /tmp/repo-hygiene-violations.txt

  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "### Repo Hygiene Guard"
      echo
      echo "Found ${#violations[@]} violation(s)."
      echo
      while IFS= read -r item; do
        echo "- $item"
      done < /tmp/repo-hygiene-violations.txt
    } >> "$GITHUB_STEP_SUMMARY"
  fi
  exit 1
fi

echo "Repo hygiene checks passed."
