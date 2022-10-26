import type { ActionFunction, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import invariant from "tiny-invariant";
import type { PostActionData } from "~/models/post.server";
import { deletePost, updatePost } from "~/models/post.server";

import { typedjson, useTypedLoaderData } from "remix-typedjson";
import PostEditor from "~/components/PostEditor";
import type { Post } from "~/models/post.server";
import { getPost } from "~/models/post.server";

type LoaderData = { post: Post };

export const handle = { hydrate: true };

export const loader = async ({ params }: LoaderArgs) => {
  invariant(params.slug, `params.slug is required`);

  const post = await getPost(params.slug);
  invariant(post, `Post not found: ${params.slug}`);

  return typedjson({ post });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  const { _action, title, slug, markdown } = Object.fromEntries(formData);

  if (_action === "delete") {
    const errors: PostActionData = {
      title: null,
      slug: slug ? null : "Slug is required",
      markdown: null,
    };
    const hasErrors = Object.values(errors).some(
      (errorMessage) => errorMessage
    );
    if (hasErrors) {
      return json<PostActionData>(errors);
    }
    invariant(typeof slug === "string", "slug must be a string");

    await deletePost({ slug });

    return redirect("/posts/admin");
  }

  const errors: PostActionData = {
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

  await updatePost({ title, slug, markdown });

  return redirect(`/posts/admin/${slug}`);
};

export default function EditPost() {
  const errors = useActionData();
  // const transition = useTransition();
  // const isCreating = Boolean(transition.submission);
  // const isLoading = Boolean(transition.type);
  const { post } = useTypedLoaderData<LoaderData>();
  // const state = { isCreating, isLoading };

  return <>{post && <PostEditor post={post} errors={errors} />}</>;
}
