import * as v from "valibot";

export const models = {
	"gemini-1.5-flash": "Gemini 1.5 Flash",
	"gemini-1.5-8b": "Gemini 1.5 8B",
	"gemini-1.5-pro": "Gemini 1.5 Pro",
	"gemini-2.0-flash": "Gemini 2.0 Flash",
	"gemini-2.0-flash-lite-preview-02-05": "Gemini 2.0 Flash-Lite Preview 02-05",
	"gemini-2.0-pro-exp-02-05": "Gemini 2.0 Pro Experimental 02-05",
	"gemini-2.0-flash-thinking-exp-01-21":
		"Gemini 2.0 Flash Thinking Experimental 01-21",
} as const;
export const modelKeys = Object.keys(models) as (keyof typeof models)[];

export const DEFAULT_MODEL = "gemini-2.0-flash";

export const formSchema = v.object({
	genai_api_key: v.pipe(
		v.string("API key is required"),
		v.nonEmpty("API key is required"),
	),
	genai_model: v.picklist(Object.keys(models) as (keyof typeof models)[]),
});
export type FormValues = v.InferOutput<typeof formSchema>;
