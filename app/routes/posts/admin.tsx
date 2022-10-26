import type { LoaderFunction } from "@remix-run/node";
import { Link, Outlet } from "@remix-run/react";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import { getPosts } from "~/models/post.server";

type LoaderData = {
  posts: Awaited<ReturnType<typeof getPosts>>;
};

export const handle = { hydrate: true };

export const loader: LoaderFunction = async () => {
  return typedjson({ posts: await getPosts() });
};

export default function PostAdmin() {
  const { posts } = useTypedLoaderData<LoaderData>();
  return (
    <div className="mx-auto p-6">
      <h1>Blog Admin</h1>
      <div className="grid grid-cols-4 gap-6">
        <nav className="col-span-4 md:col-span-1">
          <ul>
            {posts.map((post) => (
              <li key={post.slug}>
                <Link to={post.slug} className="text-blue-600 underline">
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="col-span-4 md:col-span-3">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
