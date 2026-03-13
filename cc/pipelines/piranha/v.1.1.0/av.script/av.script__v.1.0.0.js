/**
 * AV SCRIPT
 * This script normalizes the Creative Director's output to generate a clean JSON object that can be used in subsequent n8n nodes.
 * It extracts the JSON from a markdown code block in the Creative Director's output and transforms it into n8n items.
 * 
 * Version: 1.0.0
 */

// Get the first input item
const item = $input.first().json;

// Safely navigate to output[0].content
const content = item?.output?.[0]?.content;

if (!Array.isArray(content)) {
  throw new Error('Invalid input: output[0].content is missing or not an array');
}

// Find the output_text entry
const textEntry = content.find(c => c.type === 'output_text');

if (!textEntry || typeof textEntry.text !== 'string') {
  throw new Error('No valid output_text found in content');
}

const rawText = textEntry.text.trim();

let jsonString = rawText;

// Handle either:
// 1. Raw JSON string
// 2. JSON wrapped in ```json ... ```
// 3. JSON wrapped in ``` ... ```
const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
if (fencedMatch) {
  jsonString = fencedMatch[1].trim();
}

let parsed;

try {
  parsed = JSON.parse(jsonString);
} catch (error) {
  throw new Error(`Failed to parse JSON: ${error.message}\n\nRaw text:\n${rawText}`);
}

// Convert parsed result into n8n items
if (Array.isArray(parsed)) {
  return parsed.map(obj => ({ json: obj }));
}

if (parsed && typeof parsed === 'object') {
  return [{ json: parsed }];
}

throw new Error('Parsed JSON is not an object or array');