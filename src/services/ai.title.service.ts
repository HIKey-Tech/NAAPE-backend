import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateTitles(type, content) {
    const prompt = `
You are an expert media editor. Generate **5 powerful, compelling, SEO-optimized titles** for a ${type}.

Requirements:
- Titles must be short, clear, and attention-grabbing.
- Use strong hooks suitable for publications, news articles, or events.
- Avoid clickbait.
- Make them professional.
- Format as a simple list.

Content:
"${content}"
`;

    const response = await client.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
    });

    const output = response.output_text.trim();

    // Split into clean list
    const titles = output
        .split("\n")
        .map(t => t.replace(/^\d+\.\s*/, "").trim())
        .filter(Boolean);

    return titles;
}
