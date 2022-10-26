import type { ActionFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import invariant from "tiny-invariant";
import PostEditor from "~/components/PostEditor";
import type { Post, PostActionData } from "~/models/post.server";
import { createPost } from "~/models/post.server";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  const title = formData.get("title");
  const slug = formData.get("slug");
  const markdown = formData.get("markdown");
  const errors: ActionData = {
    title: title ? null : "Title is required",
    slug: slug ? null : "Slug is required",
    markdown: markdown ? null : "Markdown is required",
  };
  const hasErrors = Object.values(errors).some((errorMessage) => errorMessage);
  if (hasErrors) {
    return json<PostActionData>(errors);
  }
  invariant(typeof title === "string", "title must be a string");
  invariant(typeof slug === "string", "slug must be a string");
  invariant(typeof markdown === "string", "markdown must be a string");

  await createPost({ title, slug, markdown });

  return redirect(`/posts/admin/${slug}`);
};

export default function NewPost() {
  const errors = useActionData();
  const post: Post = {
    title: "New title",
    slug: `new-title-${Math.random()}`,
    markdown: "Post body",
  };
  return <PostEditor post={post} errors={errors} />;
}
