import { Form, useTransition } from "@remix-run/react";

import type { ReactEventHandler } from "react";
import { useEffect, useState } from "react";
import { ClientOnly } from "remix-utils";
import type { Post, PostActionData } from "~/models/post.server";
import PostRender from "./PostRender";

const inputClassName = `w-full rounded border border-gray-500 px-2 py-1 text-lg dark:bg-gray-900 dark:border-gray-700`;

export default function PostEditor({
  post,
  errors,
}: {
  post: Post;
  errors: PostActionData;
}) {
  const transition = useTransition();
  const isCreating = Boolean(transition.submission);
  const isLoading = Boolean(transition.type);
  const [title, setTitle] = useState<string>(post.title);
  const [slug, setSlug] = useState<string>(post.slug);
  const [markdown, setMarkdown] = useState<string>(post.markdown);

  useEffect(() => {
    setMarkdown(post.markdown);
    setTitle(post.title);
    setSlug(post.slug);
  }, [post]);

  const handleOnChangeMarkdown: ReactEventHandler = (event) => {
    const target = event.target as HTMLTextAreaElement;
    setMarkdown(target?.value);
  };

  const handleOnChangeTitle: ReactEventHandler = (event) => {
    const target = event.target as HTMLTextAreaElement;
    setTitle(target?.value);
  };

  const handleOnChangeSlug: ReactEventHandler = (event) => {
    const target = event.target as HTMLTextAreaElement;
    setSlug(target?.value);
  };

  return (
    <Form method="post">
      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-4 lg:col-span-2">
          <p>
            <label>
              Post Title:{" "}
              {errors?.title ? (
                <em className="text-red-600">{errors.title}</em>
              ) : null}{" "}
              <input
                type="text"
                name="title"
                className={inputClassName}
                value={title}
                onChange={handleOnChangeTitle}
                key={isLoading ? "notLoadedYet" : "loaded"}
              />
            </label>
          </p>
          <p>
            <label>
              Post Slug:{" "}
              {errors?.slug ? (
                <em className="text-red-600">{errors.slug}</em>
              ) : null}{" "}
              <input
                type="text"
                name="slug"
                className={inputClassName}
                value={slug}
                onChange={handleOnChangeSlug}
                key={isLoading ? "notLoadedYet" : "loaded"}
              />
            </label>
          </p>
          <p>
            <label htmlFor="markdown">
              Markdown:{" "}
              {errors?.markdown ? (
                <em className="text-red-600">{errors.markdown}</em>
              ) : null}
            </label>
            <br />
            <ClientOnly
              fallback={
                <textarea
                  id="markdown"
                  rows={20}
                  name="markdown"
                  className={`${inputClassName} font-mono dark:bg-gray-900`}
                  defaultValue={markdown}
                  key={isLoading ? "notLoadedYet" : "loaded"}
                />
              }
            >
              {() => (
                <textarea
                  id="markdown"
                  rows={20}
                  name="markdown"
                  className={`${inputClassName} font-mono dark:bg-gray-900`}
                  value={markdown}
                  onChange={handleOnChangeMarkdown}
                  key={isLoading ? "notLoadedYet" : "loaded"}
                />
              )}
            </ClientOnly>
          </p>
          <p className="text-right">
            <button
              name="_action"
              value="delete"
              className="rounded bg-blue-500 py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400 disabled:bg-blue-300"
              disabled={isCreating}
            >
              {isCreating ? "Deleting..." : "Delete Post"}{" "}
            </button>{" "}
            <button
              type="submit"
              className="rounded bg-blue-500 py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400 disabled:bg-blue-300"
              disabled={isCreating}
            >
              {!post.createdAt
                ? isCreating
                  ? "Creating..."
                  : "Create Post"
                : isCreating
                ? "Updating..."
                : "Update Post"}
            </button>
          </p>
        </div>
        <div className="col-span-4 lg:col-span-2">
          <PostRender
            post={{
              title,
              slug,
              markdown,
            }}
          />
        </div>
      </div>
    </Form>
  );
}
