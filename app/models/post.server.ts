import type { Post } from "@prisma/client";
import { prisma } from "~/db.server";

export type { Post };

export type PostActionData =
  | {
      title: null | string;
      slug: null | string;
      markdown: null | string;
    }
  | undefined;

export async function getPosts(take: number) {
  return prisma.post.findMany({ take, orderBy: { createdAt: "desc" } });
}

export async function getPost(slug: string) {
  return prisma.post.findUnique({ where: { slug } });
}

export async function createPost(
  post: Pick<Post, "slug" | "title" | "markdown">
) {
  return prisma.post.create({ data: post });
}

export async function updatePost(
  post: Pick<Post, "slug" | "title" | "markdown">
) {
  return prisma.post.update({ where: { slug: post.slug }, data: post });
}

export async function deletePost(post: Pick<Post, "slug">) {
  return prisma.post.delete({ where: { slug: post.slug } });
}
