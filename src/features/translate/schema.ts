import { type ResponseSchema, SchemaType } from "@google/generative-ai";
import * as v from "valibot";

export const genResponseSchema = {
	type: SchemaType.OBJECT,
	properties: {
		detected_language: { type: SchemaType.STRING, enum: ["ja", "en"] },
		ja: { type: SchemaType.STRING },
		en: { type: SchemaType.STRING },
	},
	required: ["detected_language", "ja", "en"],
} satisfies ResponseSchema;

export const responseSchema = v.object({
	detected_language: v.picklist(["ja", "en"]),
	ja: v.string(),
	en: v.string(),
});
export type Response = v.InferOutput<typeof responseSchema>;

export const partialResponseSchema = v.partial(responseSchema);
