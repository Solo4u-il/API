import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("CRITICAL: GEMINI_API_KEY is missing in environment variables!");
}

const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `כללי עיצוב והתאמה להקראה קולית במערכת הטלפונית:
כללי פיסוק והשהיה להקראה קולית:
1. אסור בהחלט להשתמש בנקודות (.) או בירידות שורה (\\n).
2. מותר ומומלץ להשתמש בפסיקים (,) כדי ליצור עצירות נשימה והפסקות טבעיות בדיבור.
3. סמלים במילים בלבד: לעולם אל תכתוב סמלים או תווים מיוחדים (כגון %, ₪, &, =, /, *, #). כתוב כל סמל במילים מלאות (לדוגמה: "אחוזים", "שקלים", "ועוד", "שווה").
4. תפקידך לכתוב 5 סיפורים דמיוניים וארוכים ומפורטים ככל שניתן בכל פעם על הנושא המתבקש, תיאורים חיים, רגשות, שהמשתמש ירגיש שהוא נמצא בסיפור, תיאור מראות, מעשים, מזג רוח, רגשות, תחושות, והרגשות, פעולות, מעשים, בדגש על הדברים המבוקשים.`;

function sanitizeForYemot(text) {
  return (text || "")
    .replace(/&/g, " ו")
    .replace(/=/g, " ")
    .trim();
}

app.get("/", (req, res) => {
  res.status(200).send("Yemot-Gemini server is running!");
});

app.all("/yemot", async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    console.log("Incoming Yemot params:", JSON.stringify(params));

    if (params.hangup === "yes") {
      return res.send("noop=hangup");
    }

    const userInput = (
      params.prompt ||
      params.question ||
      params.text ||
      ""
    ).trim();

    if (!userInput) {
      console.log("No userInput received yet.");
      return res.send(
        "id_list_message=t-לא התקבל טקסט להקשה, אנא נסו שוב"
      );
    }

    console.log("Sending to Gemini:", userInput);

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: userInput,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const rawReply = response.text || "לא הופקה תשובה";
    const safeReply = sanitizeForYemot(rawReply);

    console.log("Sending back to Yemot (length):", safeReply.length);

    return res.send(`id_list_message=t-${safeReply}`);
  } catch (err) {
    console.error("Error in /yemot:", err);
    return res.send(
      "id_list_message=t-סליחה, אירעה תקלה בשרת, נסו שוב מאוחר יותר"
    );
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
