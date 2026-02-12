import twemoji from "twemoji";

export function renderTwemoji(html: string): string {
  return twemoji.parse(html, {
    folder: "svg",
    ext: ".svg",
    base: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/"
  });
}