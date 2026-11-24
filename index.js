import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `כללי עיצוב והתאמה להקראה קולית במערכת הטלפונית:
1. אסור בהחלט להשתמש בנקודות (.) או בירידות שורה (\\n).
2. מותר ומומלץ להשתמש בפסיקים (,) כדי ליצור עצירות נשימה והפסקות טבעיות בדיבור.
3. סמלים במילים בלבד: לעולם אל תכתוב סמלים או תווים מיוחדים (כגון %, ₪, &, =, /, *, #). כתוב כל סמל במילים מלאות (לדוגמה: "אחוזים", "שקלים", "ועוד", "שווה").
4. תפקידך לכתוב 5 סיפורים דמיוניים וארוכים ומפורטים ככל שניתן בכל פעם על הנושא המתבקש, תיאורים חיים, רגשות, שהמשתמש ירגיש שהוא נמצא בסיפור, תיאור מראות, מעשים, מזג רוח, רגשות, תחושות, והרגשות, פעולות, מעשים, בדגש על הדברים המבוקשים.`;

function cleanForYemotTTS(raw) {
  return (raw || "")
    .replace(/[\r\n.]/g, " ")
    // משאיר רק אותיות עבריות, מספרים, רווחים ופסיקים - מונע תווים שגורמים לשגיאת TTS
    .replace(/[^א-ת0-9,\s]/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

app.get("/", (req, res) => {
  res.status(200).type("text/plain; charset=utf-8").send("OK");
});

app.all("/yemot", async (req, res) => {
  console.log("HIT /yemot!", req.method, req.query, req.body);
  try {
    const p = { ...req.query, ...req.body };
    if (p.hangup === "yes") {
      return res.type("text/plain; charset=utf-8").send("noop=hangup");
    }

    const input = (p.prompt || p.question || p.text || "").trim();
    if (!input) {
      return res
        .type("text/plain; charset=utf-8")
        .send("id_list_message=t-לא התקבל טקסט, נסו שוב");
    }

    const r = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: input,
      config: { systemInstruction: SYSTEM_INSTRUCTION },
    });

    const cleaned = cleanForYemotTTS(r.text);
    const finalText = cleaned || "לא הופקה תשובה";

    console.log("DONE /yemot, length:", finalText.length);
    return res
      .status(200)
      .type("text/plain; charset=utf-8")
      .send(`id_list_message=t-${finalText}`);
  } catch (e) {
    console.error("ERROR /yemot:", e);
    return res
      .status(200)
      .type("text/plain; charset=utf-8")
      .send("id_list_message=t-אירעה שגיאה, נסו שוב מאוחר יותר");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log("Listening on", PORT));
