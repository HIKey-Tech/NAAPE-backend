import { generateTitles } from "../services/ai.title.service";

export async function suggestTitle(req, res) {
    try {
        const { type, content } = req.body;

        if (!type || !content) {
            return res.status(400).json({
                error: "type and content fields are required",
            });
        }

        const titles = await generateTitles(type, content);

        return res.json({ success: true, titles });
    } catch (err) {
        console.error("AI title error:", err);
        res.status(500).json({ error: "Failed to generate titles" });
    }
}
