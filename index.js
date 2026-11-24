import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("Warning: GEMINI_API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey });
const sessions = new Map();

function sanitizeForYemot(text) {
  return (text || "")
    .replace(/&/g, " ו")
    .replace(/=/g, " ")
    .replace(/\r?\n+/g, " ")
    .replace(/--/g, "-")
    .replace(/\.\./g, ".")
    .trim();
}

app.get("/", (req, res) => {
  res.status(200).send("Yemot-Gemini server on Render is running!");
});

app.all("/yemot", async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };

    if (params.hangup === "yes") {
      if (params.ApiCallId) sessions.delete(params.ApiCallId);
      return res.send("noop=hangup_cleaned");
    }

    const callId = params.ApiCallId || params.ApiPhone || "default_session";
    const userInput = (
      params.question ||
      params.text ||
      params.transcription ||
      ""
    ).trim();

    if (!userInput) {
      return res.send(
        "read=t-שלום, במה אוכל לעזור לך? דבר לאחר הצפצוף ולסיום הקש סולמית=question,no,voice,,record,6,15"
      );
    }

    const history = sessions.get(callId) || [];
    history.push({ role: "user", parts: [{ text: userInput }] });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: history,
      config: {
        systemInstruction:
          "אתה עוזר קולי בטלפון בעברית. ענה בצורה קצרה, טבעית וברורה שמתאימה להקראה קולית. הימנע מרשימות ארוכות, קישורים, אימוג'ים או סימנים מיוחדים.",
      },
    });

    const rawReply = response.text || "לא הצלחתי להבין, נסה שוב בבקשה.";
    history.push({ role: "model", parts: [{ text: rawReply }] });
    sessions.set(callId, history.slice(-10));

    const safeReply = sanitizeForYemot(rawReply);

    return res.send(
      `read=t-${safeReply}. לשאלה נוספת דבר לאחר הצפצוף=question,no,voice,,record,6,15`
    );
  } catch (err) {
    console.error("Error in /yemot:", err);
    return res.send(
      "id_list_message=t-סליחה, אירעה תקלה זמנית. נסה שוב מאוחר יותר."
    );
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
