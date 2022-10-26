import type { LoaderFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import { getPosts } from "~/models/post.server";

type LoaderData = {
  posts: Awaited<ReturnType<typeof getPosts>>;
};

export const loader: LoaderFunction = async () => {
  return typedjson({ posts: await getPosts() });
};

export default function Posts() {
  const { posts } = useTypedLoaderData<LoaderData>();
  console.log(process.env.NODE_ENV);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1>Posts</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              to={`/posts/${post.slug}`}
              className="text-blue-600 underline"
            >
              {post.title}
            </Link>{" "}
            {post.createdAt.toDateString()}
          </li>
        ))}
      </ul>
    </main>
  );
}
