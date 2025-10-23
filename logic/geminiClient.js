const fetch = require('node-fetch');

/**
 * Build the prompt for Gemini using the provided payload.
 * payload must contain: startDate, endDate, staff, existingSchedule, unavailability, shiftRequests
 */
function buildPrompt(payload) {
    return `Generate a schedule for the date range: ${payload.startDate} to ${payload.endDate}.

Staff list:
${JSON.stringify(payload.staff, null, 2)}

Existing schedule entries:
${JSON.stringify(payload.existingSchedule, null, 2)}

Unavailability entries:
${JSON.stringify(payload.unavailability, null, 2)}

Shift requests:
${JSON.stringify(payload.shiftRequests, null, 2)}

Return a JSON object with keys: readable (string), schedule (array of {staffId,date,shift}), conflicts (array).
`;
}

async function sendToGemini(payload) {
    const prompt = buildPrompt(payload);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in environment');

    // NOTE: This is a placeholder implementation. Replace the URL and request body with the
    // actual Gemini API endpoint and payload format you have access to.
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const body = {
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are an expert nurse shift scheduler.' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1200
    };

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gemini API error: ${res.status} ${text}`);
    }

    const json = await res.json();

    // Attempt to extract model reply. This depends on provider's response format.
    const reply = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
    if (!reply) throw new Error('No reply from Gemini-style API');

    // Expecting the model to return a JSON object. Try to parse.
    try {
        return JSON.parse(reply);
    } catch (err) {
        // If the model returned non-JSON, return raw reply for debugging.
        return { readable: reply, schedule: [], conflicts: [{ type: 'parse_error', details: 'Unable to parse model JSON', raw: reply }] };
    }
}

module.exports = { buildPrompt, sendToGemini };
