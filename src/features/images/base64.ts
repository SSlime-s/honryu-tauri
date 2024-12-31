export function toBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export function removeMimeType(base64: string): string {
  return base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
}
