// Copyright (c) 2025 trasta
// Modified by SSlime
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// from: https://github.com/trasta298/honryu/blob/main/translate_image.py

import {
	type EnhancedGenerateContentResponse,
	type GenerateContentRequest,
	type GenerativeModel,
	GoogleGenerativeAI,
} from "@google/generative-ai";
import { Allow, parse } from "partial-json";
import * as v from "valibot";
import { partialResponseSchema, responseSchema } from "./schema.ts";
import { GENERATION_CONFIG, SAFETY_SETTINGS } from "./settings.ts";
import { DEFAULT_MODEL } from "../config/schema.ts";

const PROMPT = `
    Role: Professional Image Text Recognizer and Translator

    Languages:
      - Image Text: Automatically detect (Japanese or English)
      - Translation: Translate to the other language (English or Japanese)

    Instructions:
    1. Accurately transcribe the text in the image, detecting whether it's in Japanese or English.
    2. Preserve the original text format and structure:
        - Maintain bullet points, numbered lists, and other formatting elements.
        - Keep line breaks and paragraph structures intact.
        - Preserve any special characters or symbols used for formatting.
    3. Refine the transcription:
        - Retain all meaningful punctuation.
        - Accurately capture any emphasis (bold, italic, underline) if discernible.
    4. Translate the transcribed text to the other language (Japanese to English or English to Japanese).
    5. In the translation:
        - Maintain the original formatting, including lists and line breaks.
        - Preserve the tone, style, and intent of the original text.
        - Adapt idiomatic expressions and cultural nuances appropriately.
    6. Ensure both the transcription and translation accurately reflect the original image text in content and format.
    7. Always provide both the original text and its translation, regardless of the detected language.
    8. Output the result in the following JSON format:
        \`\`\`json
        {
            "detected_language": "The detected language (either 'ja' or 'en')",
            "ja": "The Japanese text (either transcription or translation)",
            "en": "The English text (either transcription or translation)"
        }
        \`\`\`
`;

export async function verifyAPIKey(apiKey: string): Promise<boolean> {
	const res = await fetch(
		"https://generativelanguage.googleapis.com/v1/models",
		{
			headers: {
				"x-goog-api-key": apiKey,
			},
		},
	);

	if (!res.ok) {
		return false;
	}

	return true;
}

export function createGenAIModel(
	apiKey: string,
	model = DEFAULT_MODEL,
): GenerativeModel {
	const genAI = new GoogleGenerativeAI(apiKey);
	const genModel = genAI.getGenerativeModel({
		model,
		generationConfig: GENERATION_CONFIG,
		safetySettings: SAFETY_SETTINGS,
	});

	return genModel;
}

function prepareContents(
	prompt: string,
	/** base64 encoded */
	image: string,
): GenerateContentRequest["contents"] {
	return [
		{
			role: "user",
			parts: [
				{
					text: prompt,
				},
			],
		},
		{
			role: "user",
			parts: [
				{
					inlineData: {
						mimeType: "image/png",
						data: image,
					},
				},
			],
		},
	];
}

export async function* transcribeAndTranslateImageStream(
	genAI: GenerativeModel,
	image: string,
) {
	const { stream, response } = await genAI.generateContentStream({
		contents: prepareContents(PROMPT, image),
	});

	for await (const result of processRawResponse(stream, response)) {
		yield result;
	}
}

async function* processRawResponse(
	stream: AsyncGenerator<EnhancedGenerateContentResponse, unknown, unknown>,
	response: Promise<EnhancedGenerateContentResponse>,
) {
	let allText = "";
	for await (const chunk of stream) {
		allText += chunk.text();
		const result = parsePartialResponse(allText);
		if (result.success) {
			yield result.output;
		} else {
			console.error(result.issues);
		}
	}

	allText += (await response).text();
	const result = parseFullResponse(allText);
	if (result.success) {
		yield result.output;
	} else {
		throw new Error(`Failed to parse response: ${result.issues}`);
	}
}

function parsePartialResponse(response: string) {
	const json = parse(response, Allow.OBJ | Allow.STR);

	return v.safeParse(partialResponseSchema, json);
}

function parseFullResponse(response: string) {
	const json = JSON.parse(response);

	return v.safeParse(responseSchema, json);
}
