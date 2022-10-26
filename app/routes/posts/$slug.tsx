import type { LoaderArgs } from "@remix-run/node";
import invariant from "tiny-invariant";

import { typedjson, useTypedLoaderData } from "remix-typedjson";
import PostRender from "~/components/PostRender";
import type { Post } from "~/models/post.server";
import { getPost } from "~/models/post.server";

type LoaderData = { post: Post; html: string };

export const loader = async ({ params }: LoaderArgs) => {
  invariant(params.slug, `params.slug is required`);

  const post = await getPost(params.slug);
  invariant(post, `Post not found: ${params.slug}`);

  return typedjson({ post });
};

export default function PostSlug() {
  const { post } = useTypedLoaderData<LoaderData>();
  return (
    <main className="mx-auto max-w-4xl p-6">
      <PostRender post={post} />
      {post.createdAt.toDateString()}
    </main>
  );
}
