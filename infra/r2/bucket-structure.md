# PartHub R2 Bucket Structure

Bucket name: `parthub-media`
Public domain: `https://media.parthub.site`

## Folder Layout

```
parthub-media/
├── parts/
│   └── {seller_id}/
│       └── {part_id}/
│           ├── image-1.webp
│           ├── image-2.webp
│           └── image-3.webp
├── stores/
│   └── {seller_id}/
│       ├── logo.webp
│       └── banner.webp
└── reviews/
    └── {review_id}/
        └── image-1.webp
```

## Rules

- Max file size: 5MB
- Allowed types: image/jpeg, image/png, image/webp
- Convert to webp at upload time if possible
- Naming: `{timestamp}.{ext}` inside context folder
- Featured image: first image OR explicitly flagged in DB

## Cloudflare R2 Setup

1. Create bucket: `parthub-media`
2. Enable public access
3. Set custom domain: `media.parthub.site`
4. Add CORS policy for your app domains
