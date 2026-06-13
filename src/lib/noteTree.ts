import type { CollectionEntry } from "astro:content";

type Paper = CollectionEntry<"papers">;

export type TreeNode = {
  segment: string;
  id: string;
  paper?: Paper;
  children: TreeNode[];
};

export type TreeRow = {
  node: TreeNode;
  prefix: string;
  isRoot: boolean;
};

export function buildTree(papers: Paper[]): TreeNode {
  const root: TreeNode = { segment: "", id: "", children: [] };
  for (const p of papers) {
    let node = root;
    let acc = "";
    for (const part of p.id.split("/")) {
      acc = acc ? `${acc}/${part}` : part;
      let child = node.children.find((c) => c.segment === part);
      if (!child) {
        child = { segment: part, id: acc, children: [] };
        node.children.push(child);
      }
      node = child;
    }
    node.paper = p;
  }
  return root;
}

export function groupRootFor(tree: TreeNode, id: string): TreeNode | undefined {
  const first = id.split("/")[0];
  return tree.children.find((c) => c.segment === first);
}

export function countNotes(node: TreeNode): number {
  let n = node.paper ? 1 : 0;
  for (const c of node.children) n += countNotes(c);
  return n;
}

const sortNodes = (a: TreeNode, b: TreeNode) => {
  const da = a.paper?.data.date?.valueOf() ?? 0;
  const db = b.paper?.data.date?.valueOf() ?? 0;
  if (da !== db) return da - db;
  return a.id.localeCompare(b.id);
};

export function flattenTree(root: TreeNode): TreeRow[] {
  const rows: TreeRow[] = [{ node: root, prefix: "", isRoot: true }];
  const walk = (node: TreeNode, ancestorsLast: boolean[]) => {
    const kids = [...node.children].sort(sortNodes);
    kids.forEach((child, i) => {
      const last = i === kids.length - 1;
      const prefix =
        ancestorsLast.map((al) => (al ? "   " : "│  ")).join("") +
        (last ? "└─ " : "├─ ");
      rows.push({ node: child, prefix, isRoot: false });
      walk(child, [...ancestorsLast, last]);
    });
  };
  walk(root, []);
  return rows;
}
