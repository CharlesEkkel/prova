// How a person's name is shortened where there is little room for it.

/** The first letter of each word of `name`, in capitals, up to `limit` letters. */
export const initialsOf = (name: string, limit = 2): string =>
  name
    .split(/\s+/)
    .filter((word) => word !== '')
    .map((word) => word.slice(0, 1).toUpperCase())
    .slice(0, limit)
    .join('');
