import debounce from "lodash.debounce";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import type { Post } from "~/models/post.server";
import RenderMarkdownToHTML from "./RenderMarkdownToHTML";

export default function PostRender({ post }: { post: Partial<Post> }) {
  const [html, setHtml] = useState<string>(
    RenderMarkdownToHTML(post.markdown || "")
  );

  const handleMarkdownChanged = useRef(
    debounce((value: string) => {
      setHtml(RenderMarkdownToHTML(value));
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
