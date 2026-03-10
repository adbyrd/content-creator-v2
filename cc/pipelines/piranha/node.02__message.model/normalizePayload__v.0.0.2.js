function normalizePayload(input) {
  try {
    const text = input?.[0]?.output?.[0]?.content?.[0]?.text;

    if (!text) {
      throw new Error("Missing expected text payload");
    }

    // Trim whitespace and parse the embedded JSON string
    const parsed = JSON.parse(text.trim());

    return parsed;
  } catch (error) {
    console.error("Normalization failed:", error.message);
    return [];
  }
}

const normalized = normalizePayload(input);

console.log(normalized);