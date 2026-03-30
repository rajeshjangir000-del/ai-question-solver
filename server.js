import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize Google Generative AI
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in the environment variables!");
}
const genAI = new GoogleGenerativeAI(API_KEY);

// Define route
app.post('/api/solve', async (req, res) => {
  try {
    const { imageBase64, imageMimeType, prompt } = req.body;
    
    if (!imageBase64 || !prompt) {
      return res.status(400).json({ error: "Missing required fields: imageBase64, prompt" });
    }

    const imageParts = [
      {
        inlineData: {
          data: imageBase64,
          mimeType: imageMimeType || 'image/jpeg'
        }
      }
    ];

    try {
      // Primary attempt: gemini-3.1-pro-preview
      const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });
      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      return res.json({ solution: response.text() });
    } catch (primaryError) {
      console.error("Primary model error:", primaryError);
      
      // Fallback check for quota limit or 429
      if (primaryError.message && primaryError.message.includes("429")) {
        console.log("Falling back to gemini-2.5-flash...");
        try {
          const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const fallbackResult = await fallbackModel.generateContent([prompt, ...imageParts]);
          const fallbackResponse = await fallbackResult.response;
          
          return res.json({ 
            solution: fallbackResponse.text(),
            warning: "Notice: The 3.1 Pro Preview model hit a quota limit. Falling back to the 2.5 Flash model."
          });
        } catch (fallbackError) {
          console.error("Fallback model error:", fallbackError);
          return res.status(502).json({ 
            error: "Both primary and fallback AI models failed.",
            details: fallbackError.message
          });
        }
      }
      
      // If error is not a 429 quota exception
      return res.status(500).json({ 
        error: "Failed to process the request using the primary model.", 
        details: primaryError.message 
      });
    }

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Catch-all route to serve the React App
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
