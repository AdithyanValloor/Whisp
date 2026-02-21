export function parseMessageText(text: string): string {
  if (!text) return "";

  // Regex to detect URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Convert to clickable links with safe attributes
  return text.replace(
    urlRegex,
    (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-cyan-500 hover:underline hover:text-primary-focus">${url}</a>`
  );
}
