export interface Tag {
  tag: string;
  r2Url: string;
  author: string;
}

export function tagSort(a: Tag, b: Tag): number {
  const tagA = a.tag.toUpperCase();
  const tagB = b.tag.toUpperCase();
  if (tagA < tagB) return -1;
  if (tagA > tagB) return 1;
  return 0;
}
