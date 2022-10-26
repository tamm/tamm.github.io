import type { LoaderFunction } from "@remix-run/node";
import { Link } from "react-router-dom";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import PostRender from "~/components/PostRender";
import { getPosts } from "~/models/post.server";

type LoaderData = {
  posts: Awaited<ReturnType<typeof getPosts>>;
};

export const loader: LoaderFunction = async () => {
  return typedjson({ posts: await getPosts(1) });
};

export default function Posts() {
  const { posts } = useTypedLoaderData<LoaderData>();

  return (
    <main className="mx-auto max-w-4xl p-6 ">
      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <PostRender post={post} />
          </li>
        ))}
      </ul>

      <Link to="posts">See more posts</Link>
    </main>
  );
}
