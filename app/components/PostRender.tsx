import * as DOMPurify from "dompurify";
import hljs from "highlight.js";
import debounce from "lodash.debounce";
import { marked } from "marked";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import type { Post } from "~/models/post.server";

export default function PostRender({ post }: { post: Partial<Post> }) {
  const [html, setHtml] = useState<string>(marked(post.markdown || ""));

  marked.setOptions({
    langPrefix: "hljs language-",
    highlight: function (code) {
      return hljs.highlightAuto(code, ["html", "javascript"]).value;
    },
  });

  const handleMarkdownChanged = useRef(
    debounce((value: string) => {
      setHtml(DOMPurify.sanitize(marked(value)));
    }, 100)
  );

  useEffect(() => {
    if (post.markdown) {
      handleMarkdownChanged.current(post.markdown);
    }
  });

  useEffect(() => {
    const currentHandleMarkdownChanged = handleMarkdownChanged.current;
    return () => {
      currentHandleMarkdownChanged.cancel();
    };
  }, []);

  return (
    <div className="markdown-body dark:bg-zinc-900">
      <Link to={`/posts/${post.slug}`} className="text-blue-600 underline">
        <h1>{post.title}</h1>
      </Link>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
