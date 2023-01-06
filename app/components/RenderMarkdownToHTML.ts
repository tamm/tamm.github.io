import hljs from "highlight.js";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

export default function RenderMarkdownToHTML(value: string) {
  marked.setOptions({
    langPrefix: "hljs language-",
    highlight: function (code) {
      return hljs.highlightAuto(code, ["html", "javascript"]).value;
    },
  });

  return DOMPurify.sanitize(marked(value));
}
