import { GoogleGenAI } from '@google/genai';
import { Biomarker, OrganHealth, Specialist } from '../types';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('[Gemini] GEMINI_API_KEY is not defined in environment variables.');
}

const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

console.log(`[Gemini] Initialized with model: ${MODEL_NAME}`);

export async function analyzeReport(
  fileBuffer: Buffer,
  mimeType: string,
  fileText: string,
  profile: {
    name: string;
    age: number;
    gender: string;
    height: number;
    weight: number;
    activity_level: string;
    pregnancy_status?: string;
    medical_history?: string;
    allergies?: string;
    lifestyle_preferences?: string;
  }
) {
  console.log(`[Gemini] Starting report analysis for profile: ${profile.name}, age: ${profile.age}, gender: ${profile.gender}`);

  // Base64 encode the file for inlineData if sending raw file
  const base64File = fileBuffer.toString('base64');

  // Build the context for the prompt
  const profileContext = `
User Profile Context:
- Name: ${profile.name}
- Age: ${profile.age} years old
- Gender: ${profile.gender}
- Height: ${profile.height} cm
- Weight: ${profile.weight} kg
- Activity Level: ${profile.activity_level}
- Pregnancy/Lactation Status: ${profile.pregnancy_status || 'none'}
- Medical History: ${profile.medical_history || 'None'}
- Allergies: ${profile.allergies || 'None'}
- Lifestyle Preferences: ${profile.lifestyle_preferences || 'None'}
  `;

  const systemInstruction = `
You are an expert Clinical Medical AI, medical report parser, and lifestyle medicine specialist.
Your task is to analyze the provided medical report (which could be a blood report, lab test, ultrasound, MRI, CT scan, prescription, etc.) in the context of the user's demographic and health profile.

Parse and extract the following into a structured JSON response:
1. Biomarkers: Extract any specific biomarker measurements (e.g. Cholesterol, Hemoglobin, TSH, Glucose, etc.).
   - For EACH biomarker, you MUST provide:
     - name (string)
     - value (string)
     - unit (string)
     - reference_range (string)
     - status (string, strictly must be one of: 'Normal', 'High', 'Low', 'Critical')
     - If the biomarker is ABNORMAL (High, Low, or Critical) or if custom tailored advice is relevant, provide:
       - meaning: Clinical interpretation of what this level means.
       - short_term: Short-term physiological effects.
       - long_term: Long-term health implications if unaddressed.
       - foods_to_increase: Foods/dietary choices to increase to improve this biomarker.
       - foods_to_reduce: Foods/dietary choices to avoid or reduce.
       - lifestyle: Behavioral lifestyle advice.
       - exercise: Tailored movement/exercise advice.
       - hydration: Specific hydration guidance.
       - sleep: Sleep advice relevant to this.
       - stress: Stress-management advice relevant to this.
2. Vitals: Extract vitals if present (Blood Pressure, Heart Rate, Temperature, Respiratory Rate, Oxygen Saturation). Return as key-value pairs (string: string).
3. Diagnoses: Any explicit diagnoses mentioned in the report (array of strings).
4. Clinical Notes: A high-level summary of the report findings and notes (string).
5. Health Score: Provide an overall Health Score (integer between 1 and 100) based on the results and user's profile.
6. Organ Health: For each of the following 11 organs, assess their status based on the report findings (Healthy, Needs Monitoring, Potentially Affected) and provide a concise, personal medical explanation:
   - Brain, Heart, Kidney, Liver, Lungs, Blood, Bones, Eyes, Skin, Nerves, Digestive System.
7. Specialist Recommendations: Recommend 1 or more medical specialists (e.g., General Physician, Cardiologist, Endocrinologist, etc.) that the user should consult, and explain WHY.

Strict JSON Output format:
{
  "biomarkers": [
    {
      "name": "Cholesterol, Total",
      "value": "240",
      "unit": "mg/dL",
      "reference_range": "< 200",
      "status": "High",
      "meaning": "Your total cholesterol is elevated...",
      "short_term": "No immediate symptoms, but vascular plaque...",
      "long_term": "Increased risk of atherosclerosis, cardiovascular disease...",
      "foods_to_increase": "Oats, olive oil, almonds, avocados, wild salmon...",
      "foods_to_reduce": "Saturated fats, trans fats, fried foods, processed meats...",
      "lifestyle": "Incorporate daily physical activity...",
      "exercise": "At least 30 mins of aerobic exercise...",
      "hydration": "Maintain 2.5-3L water daily...",
      "sleep": "Ensure 7-8 hours sleep to support lipid metabolism...",
      "stress": "Stress increases cortisol which elevates cholesterol. Practice mindfulness..."
    }
  ],
  "vitals": {
    "Blood Pressure": "120/80 mmHg",
    "Heart Rate": "72 bpm"
  },
  "diagnoses": ["Hyperlipidemia"],
  "clinical_notes": "A general summary of report clinical notes...",
  "health_score": 78,
  "organ_health": {
    "brain": { "status": "Healthy", "explanation": "No cognitive or neural markers are affected..." },
    "heart": { "status": "Needs Monitoring", "explanation": "Elevated lipids place additional work on the cardiovascular system..." },
    "kidney": { "status": "Healthy", "explanation": "Kidney function markers appear within normal ranges..." },
    "liver": { "status": "Healthy", "explanation": "Liver enzymes are within limits..." },
    "lungs": { "status": "Healthy", "explanation": "Oxygen levels and pulmonary markers are stable..." },
    "blood": { "status": "Needs Monitoring", "explanation": "Slight lipid elevation detected in blood..." },
    "bones": { "status": "Healthy", "explanation": "Calcium and bone indicators are fine..." },
    "eyes": { "status": "Healthy", "explanation": "No ophthalmic risk markers detected..." },
    "skin": { "status": "Healthy", "explanation": "No dermatological indications..." },
    "nerves": { "status": "Healthy", "explanation": "No neuropathic markers present..." },
    "digestive_system": { "status": "Healthy", "explanation": "Digestive indicators are regular..." }
  },
  "specialist": [
    { "name": "General Physician", "why": "To perform general follow-up on cholesterol levels..." }
  ]
}
  `;

  const contents: any[] = [];

  // Add the text file context if it exists
  let promptText = `Analyze this medical report for ${profile.name}.\n${profileContext}\n\n`;

  if (fileText && fileText.trim().length > 0) {
    promptText += `Medical Report Text Content:\n${fileText}`;
    contents.push(promptText);
  } else {
    // No text extracted from pdf-parse. Send file as base64 inline data directly.
    console.log(`[Gemini] Sending raw file directly as inline data (mimeType: ${mimeType})`);
    promptText += `Analyze the attached file directly. Perform OCR if it is a scanned document or image, parse the report, and structure the clinical details.`;
    contents.push({
      inlineData: {
        mimeType: mimeType,
        data: base64File,
      },
    });
    contents.push(promptText);
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('[Gemini] Empty response text');
    }

    // Try parsing JSON
    const cleanJson = JSON.parse(textOutput.trim());
    return cleanJson;
  } catch (error) {
    console.error('[Gemini] Analysis request failed: ', error);
    throw error;
  }
}

export async function chatWithAI(
  history: { role: 'user' | 'assistant'; message: string }[],
  currentMessage: string,
  profile: any,
  reportContext: string
) {
  console.log(`[Gemini Chat] Sending message for profile: ${profile?.name || 'Unknown'}`);

  const profileContext = profile
    ? `
Current User Profile:
- Name: ${profile.name}
- Age: ${profile.age} years old
- Gender: ${profile.gender}
- Height: ${profile.height} cm
- Weight: ${profile.weight} kg
- Medical History: ${profile.medical_history || 'None'}
- Allergies: ${profile.allergies || 'None'}
- Lifestyle Preferences: ${profile.lifestyle_preferences || 'None'}
    `
    : 'No user profile configured yet.';

  const systemInstruction = `
You are Nirva AI, a warm, highly-knowledgeable lifestyle medicine clinical assistant.
Your goal is to guide the user towards better health by translating complex medical markers into simple, actionable steps.
You have access to the user's active health profile and their parsed medical reports.

Rules:
1. Always be supportive, clinical, objective, yet warm and encouraging.
2. Emphasize lifestyle medicine (nutrition, physical activity, sleep, hydration, stress management) alongside their medical treatment.
3. Reference their profile context and medical reports to make answers hyper-personalized.
4. Keep explanations clear, professional, and free of over-dramatic jargon.
5. If they ask medical questions that are highly critical or emergency-grade, remind them to consult their General Physician or local emergency room immediately.

Profile context:
${profileContext}

Report Context (last parsed biomarkers, vitals, organ assessments, specialist recommendations):
${reportContext || 'No parsed reports uploaded yet.'}
  `;

  // Format history into GoogleGenAI chat structure
  // In @google/genai, ai.chats.create takes the model, config, and we send messages
  try {
    const chat = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    // Seed the conversation history if present
    // Let's execute standard messages. In @google/genai, we can send messages sequentially
    // To feed the history, let's feed them or build contents
    let lastResponse;
    if (history && history.length > 0) {
      // Send the history items sequentially to build the state
      for (const msg of history) {
        // Just send to build state in local chat session
        await chat.sendMessage({ message: msg.message });
      }
    }

    const response = await chat.sendMessage({ message: currentMessage });
    return response.text || 'I apologize, I am unable to generate a response at this moment.';
  } catch (error) {
    console.error('[Gemini Chat] Error: ', error);
    throw error;
  }
}
