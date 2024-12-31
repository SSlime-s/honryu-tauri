import {
  HarmBlockThreshold,
  HarmCategory,
  type ModelParams,
} from "@google/generative-ai";
import { genResponseSchema } from "./schema.ts";

export const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
] satisfies ModelParams["safetySettings"];

export const GENERATION_CONFIG = {
  temperature: 0,
  responseMimeType: "application/json",
  responseSchema: genResponseSchema,
} satisfies ModelParams["generationConfig"];
