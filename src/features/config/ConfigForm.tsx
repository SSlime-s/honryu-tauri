import { useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
	DEFAULT_MODEL,
	formSchema,
	modelKeys,
	models,
	type FormValues,
} from "./schema";
import { TokenVerifierButton } from "./TokenVerifierButton";
import { useCallback } from "react";

interface Props {
	onSubmit: (data: FormValues) => void;
	forUpdate?: boolean;
	defaultValues?: Partial<FormValues>;
}
export function ConfigForm({ onSubmit, forUpdate, defaultValues }: Props) {
	const form = useForm<FormValues>({
		resolver: valibotResolver(formSchema),
		defaultValues: {
			genai_api_key: "",
			genai_model: DEFAULT_MODEL,
			...defaultValues,
		},
	});

	const wrapperOnSubmit = useCallback(
		(data: FormValues) => {
			onSubmit(data);
			if (!forUpdate) {
				return;
			}
			form.reset({
				genai_api_key: data.genai_api_key,
				genai_model: data.genai_model,
			});
		},
		[onSubmit, form.reset, forUpdate],
	);

	const submitDisabled =
		form.formState.isSubmitting || (forUpdate && !form.formState.isDirty);

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(wrapperOnSubmit)}
				className="grid grid-flow-row gap-4"
			>
				<div className="grid grid-flow-row gap-2">
					<FormField
						control={form.control}
						name="genai_api_key"
						render={({ field }) => (
							<FormItem>
								<FormLabel>API key</FormLabel>
								<FormControl>
									<Input
										placeholder="Enter here ..."
										{...field}
										className="font-mono"
									/>
								</FormControl>
								<FormMessage />
								<FormDescription>
									See the
									<Button variant="link" asChild size="sm" className="p-1">
										<a
											href="https://ai.google.dev/gemini-api/docs/api-key"
											target="_blank"
											rel="noopener noreferrer"
										>
											Gemini API Docs
										</a>
									</Button>
									for how to get an API key.
								</FormDescription>
							</FormItem>
						)}
					/>
					<p className="text-[0.8rem] text-muted-foreground flex gap-4">
						<div>
							To validate your API key, click the button on the right. <br />(
							<b>Not required</b> for saving)
						</div>
						<TokenVerifierButton form={form} />
					</p>
				</div>
				<FormField
					control={form.control}
					name="genai_model"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Model</FormLabel>
							<FormControl>
								<Select
									onValueChange={field.onChange}
									defaultValue={field.value}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select a model" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{modelKeys.map((key) => (
											<SelectItem key={key} value={key}>
												{models[key]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</FormControl>
							<FormMessage />
							<FormDescription>
								Choose a model to use for translation.
							</FormDescription>
						</FormItem>
					)}
				/>

				<div>
					<Button
						type="submit"
						className="mt-8"
						size="lg"
						disabled={submitDisabled}
					>
						{forUpdate ? "Update" : "Save"}
					</Button>
				</div>
			</form>
		</Form>
	);
}
