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

const SYSTEM_INSTRUCTION = `כללי עיצוב והתאמה להקראה קולית במערכת הטלפונית:
כללי פיסוק והשהיה להקראה קולית:
1. אסור בהחלט להשתמש בנקודות (.) או בירידות שורה (\\n).
2. מותר ומומלץ להשתמש בפסיקים (,) כדי ליצור עצירות נשימה והפסקות טבעיות בדיבור.
3. סמלים במילים בלבד: לעולם אל תכתוב סמלים או תווים מיוחדים (כגון %, ₪, &, =, /, *, #). כתוב כל סמל במילים מלאות (לדוגמה: "אחוזים", "שקלים", "ועוד", "שווה").
4. תפקידך לכתוב 5 סיפורים דמיוניים וארוכים ומפורטים ככל שניתן בכל פעם על הנושא המתבקש, תיאורים חיים, רגשות, שהמשתמש ירגיש שהוא נמצא בסיפור, תיאור מראות, מעשים, מזג רוח, רגשות, תחושות, והרגשות, פעולות, מעשים, בדגש על הדברים המבוקשים.`;

function sanitizeForYemot(text) {
  // מנקים רק תווים ששוברים את תחביר הפרמטרים של ימות המשיח (= ו-&)
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
      return res.send(
        "id_list_message=t-לא הוזן טקסט להמשך, אנא נסו שוב"
      );
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: userInput,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const rawReply = response.text || "לא הופקה תשובה";
    const safeReply = sanitizeForYemot(rawReply);

    // מחזיר טקסט תשובה בלבד ללא פתיחת דיאלוג נוסף
    return res.send(`id_list_message=t-${safeReply}`);
  } catch (err) {
    console.error("Error in /yemot:", err);
    return res.send(
      "id_list_message=t-סליחה, אירעה שגיאה בעת קבלת התשובה, נסו שוב מאוחר יותר"
    );
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
```[cite: 4, 6, 8, 9, 11, 21, 35, 36, 39, 43]

---

### נקודה אחת קטנה לפני הבדיקה בטלפון
* כיוון שביקשת **5 סיפורים ארוכים ומפורטים מאוד** בפנייה אחת, ייתכן שימות המשיח תנתק או תחתוך אם ההקראה ארוכה מאוד או אם לוקח ל-Gemini הרבה זמן להחזיר את כל הטקסט בבת אחת. אם תראה שזה קורה בבדיקה הראשונה, נוכל להתאים את אורך הסיפורים או לפצל את זה בקלות.

איך יצאה הבדיקה הראשונה מול השלוחה?
