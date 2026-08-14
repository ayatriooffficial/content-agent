/**
 * Safely parse JSON from an LLM response.
 *
 * Supports:
 * - Raw JSON
 * - ```json ... ```
 * - Extra text before/after JSON
 * - Nested objects
 * - Braces inside strings
 */

function safeParseJSON(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }

  // --------------------------------------------------
  // Remove Markdown code fences
  // --------------------------------------------------
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  // --------------------------------------------------
  // Try direct parse first
  // --------------------------------------------------
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  // --------------------------------------------------
  // Find first complete JSON object
  // --------------------------------------------------
  const jsonString = extractJSONObject(cleaned);

  if (!jsonString) {
    return null;
  }

  try {
    return JSON.parse(jsonString);
  } catch (_) {
    return null;
  }
}

/**
 * Extract first balanced JSON object.
 */
function extractJSONObject(text) {
  let start = -1;
  let depth = 0;

  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Handle escaped characters
    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    // Handle quoted strings
    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    // First opening brace
    if (char === "{") {
      if (start === -1) {
        start = i;
      }

      depth++;
    }

    // Closing brace
    if (char === "}") {
      depth--;

      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}


module.exports=safeParseJSON;