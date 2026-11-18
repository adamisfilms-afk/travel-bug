# Curated photos

High-quality photos for guide places that you own or are licensed to use:
your own photography, venue press kits, licensed stock, or creators' photos used
**with their permission** (keep the message/email as your record).

1. Add the file here, e.g. `public/curated/new-york/ny-carbone-1.jpg`
   (landscape, at least 1600px wide, ideally under ~500 KB as JPEG/WebP).
2. List it on the place in the guide data (`src/lib/food/guides.ts` or
   `src/lib/explore/guides.ts`), in that city's `*_DETAILS` block:

```ts
"ny-carbone": {
  images: [
    { src: "/curated/new-york/ny-carbone-1.jpg", alt: "Spicy rigatoni at Carbone", credit: "@creatorhandle", creditUrl: "https://www.instagram.com/creatorhandle/" },
  ],
},
```

Your photos are shown first — on the card (instead of Google's photo, which also
skips that Google request) and at the start of the place view's carousel — followed
by Google's photos. The credit appears under the photo in the place view.
