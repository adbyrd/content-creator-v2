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

// Example usage
const input = [
  {
    output: [
      {
        id: "msg_040267e00469975f0069af0ad59a70819899a6e19c78dc8ea1",
        type: "message",
        status: "completed",
        content: [
          {
            type: "output_text",
            annotations: [],
            logprobs: [],
            text: "[\n{\n\"satirical-angle\": \"People care more about their pet clones than the actual pets\",\n\"corporate-trope\": \"Luxury lifestyle brand cinematography\",\n\"call-to-action\": \"Indulge in ultimate pet love with Cuddle Clones today!\"\n}\n]\n"
          }
        ],
        role: "assistant"
      }
    ]
  }
];

const normalized = normalizePayload(input);

console.log(normalized);